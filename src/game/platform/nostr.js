// ---------- nostr: a few public relays as a meeting point for two racing phones ----------
// No server of our own. Both phones subscribe to a topic made from the room code on a few public Nostr relays and
// pass short-lived (ephemeral, never stored) events: join, offer, answer. Their content is AES-GCM encrypted with a
// key made from the room code, so a relay or anyone else without the code sees only noise. Relays only accept signed
// events, so this file carries the little bit of maths they need: secp256k1 Schnorr signatures (BIP-340) on BigInt,
// with SHA-256 and AES from Web Crypto. Each race uses a fresh throwaway key. Self-contained (crypto, TextEncoder and,
// when a room opens, WebSocket), so test/nostr.test.js can check the signatures against the BIP-340 test vectors.
const NOSTR_RELAYS=['wss://relay.damus.io','wss://nos.lol','wss://relay.primal.net','wss://nostr.mom'];
const NOSTR_KIND=25050; // ephemeral (20000-29999): relays pass it on to live subscribers and keep nothing

// ---- secp256k1 Schnorr (BIP-340) ----
const SECP={p:2n**256n-2n**32n-977n,n:0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
  gx:0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,gy:0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n};
const nMod=(a,m=SECP.p)=>{ a%=m; return a<0n?a+m:a; };
function nInv(a,m=SECP.p){ let r0=nMod(a,m), r1=m, s0=1n, s1=0n; while(r1){ const q=r0/r1; [r0,r1]=[r1,r0-q*r1]; [s0,s1]=[s1,s0-q*s1]; } return nMod(s0,m); }
// points in Jacobian coordinates [X, Y, Z] (Z 0 is the point at infinity)
function jDbl(P){ const [X,Y,Z]=P; if(!Y||!Z) return [0n,1n,0n]; const S=nMod(4n*X*Y*Y), M=nMod(3n*X*X), X3=nMod(M*M-2n*S);
  return [X3,nMod(M*(S-X3)-8n*Y*Y*Y*Y),nMod(2n*Y*Z)]; }
function jAdd(P,Q){ if(!P[2]) return Q; if(!Q[2]) return P; const [X1,Y1,Z1]=P, [X2,Y2,Z2]=Q, Z1Z1=nMod(Z1*Z1), Z2Z2=nMod(Z2*Z2);
  const U1=nMod(X1*Z2Z2), U2=nMod(X2*Z1Z1), S1=nMod(Y1*Z2*Z2Z2), S2=nMod(Y2*Z1*Z1Z1);
  if(U1===U2) return S1===S2?jDbl(P):[0n,1n,0n];
  const H=nMod(U2-U1), R=nMod(S2-S1), H2=nMod(H*H), H3=nMod(H*H2), V=nMod(U1*H2), X3=nMod(R*R-H3-2n*V);
  return [X3,nMod(R*(V-X3)-S1*H3),nMod(H*Z1*Z2)]; }
// k times the generator, back in plain [x, y]
function mulG(k){ let R=[0n,1n,0n], A=[SECP.gx,SECP.gy,1n]; while(k>0n){ if(k&1n) R=jAdd(R,A); A=jDbl(A); k>>=1n; }
  const zi=nInv(R[2]), zi2=nMod(zi*zi); return [nMod(R[0]*zi2),nMod(R[1]*zi2*zi)]; }
const nHex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const nUnhex=h=>Uint8Array.from(h.match(/../g),x=>parseInt(x,16));
const n32=v=>nUnhex(v.toString(16).padStart(64,'0'));
const nInt=b=>BigInt('0x'+nHex(b));
const nCat=(...a)=>{ const o=new Uint8Array(a.reduce((s,x)=>s+x.length,0)); let i=0; for(const x of a){ o.set(x,i); i+=x.length; } return o; };
const nUtf8=s=>new TextEncoder().encode(s);
const nSha=async b=>new Uint8Array(await crypto.subtle.digest('SHA-256',b));
async function nTagged(tag,msg){ const t=await nSha(nUtf8(tag)); return nSha(nCat(t,t,msg)); }
// a fresh key: the secret (already flipped so its public point has an even y) and the x-only public key in hex
function nostrKey(sk){ let d=sk!=null?sk:nMod(nInt(crypto.getRandomValues(new Uint8Array(32))),SECP.n-1n)+1n; const P=mulG(d);
  if(P[1]&1n) d=SECP.n-d; return {d,pk:nHex(n32(P[0]))}; }
async function schnorrSign(m,key,aux=crypto.getRandomValues(new Uint8Array(32))){ const {d}=key, pk=nUnhex(key.pk);
  const t=n32(d), h=await nTagged('BIP0340/aux',aux); for(let i=0;i<32;i++) t[i]^=h[i];
  const k0=nMod(nInt(await nTagged('BIP0340/nonce',nCat(t,pk,m))),SECP.n); if(!k0) throw new Error('nonce');
  const R=mulG(k0), k=R[1]&1n?SECP.n-k0:k0, rx=n32(R[0]);
  const e=nMod(nInt(await nTagged('BIP0340/challenge',nCat(rx,pk,m))),SECP.n);
  return nHex(nCat(rx,n32(nMod(k+e*d,SECP.n)))); }
async function nostrEvent(key,tags,content){ const created_at=Math.floor(Date.now()/1000);
  const id=nHex(await nSha(nUtf8(JSON.stringify([0,key.pk,created_at,NOSTR_KIND,tags,content]))));
  return {id,pubkey:key.pk,created_at,kind:NOSTR_KIND,tags,content,sig:await schnorrSign(nUnhex(id),key)}; }

// ---- a room: the topic and the encryption key both come from the room code ----
async function nostrRoom(code,onMsg){ const topic=nHex(await nSha(nUtf8('squirm-race:'+code))), key=nostrKey(), seen=new Set(), socks=[];
  const aes=await crypto.subtle.importKey('raw',await nSha(nUtf8('squirm-race-key:'+code)),'AES-GCM',false,['encrypt','decrypt']);
  const sub='sq'+nHex(crypto.getRandomValues(new Uint8Array(6))); let closed=false;
  const b64=b=>btoa(String.fromCharCode(...b)), unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  for(const url of NOSTR_RELAYS){ let ws; try{ ws=new WebSocket(url); }catch(e){ continue; } const s={ws,q:[]}; socks.push(s);
    ws.onopen=()=>{ ws.send(JSON.stringify(['REQ',sub,{kinds:[NOSTR_KIND],'#t':[topic],since:Math.floor(Date.now()/1000)-30}])); s.q.forEach(x=>ws.send(x)); s.q=[]; };
    ws.onmessage=async e=>{ let d; try{ d=JSON.parse(e.data); }catch(err){ return; } if(d[0]!=='EVENT'||d[1]!==sub) return; const ev=d[2];
      if(!ev||seen.has(ev.id)||ev.pubkey===key.pk) return; seen.add(ev.id);
      try{ const raw=unb64(ev.content), plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:raw.slice(0,12)},aes,raw.slice(12));
        onMsg(JSON.parse(new TextDecoder().decode(plain)),ev.pubkey); }catch(err){} };
    ws.onerror=()=>{}; }
  return { me:key.pk,
    async send(msg){ if(closed) return; const iv=crypto.getRandomValues(new Uint8Array(12));
      const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,nUtf8(JSON.stringify(msg))));
      const frame=JSON.stringify(['EVENT',await nostrEvent(key,[['t',topic]],b64(nCat(iv,ct)))]);
      for(const s of socks){ if(s.ws.readyState===1) s.ws.send(frame); else if(s.ws.readyState===0) s.q.push(frame); } },
    open:()=>socks.filter(s=>s.ws.readyState===1).length,
    close(){ closed=true; for(const s of socks){ try{ if(s.ws.readyState===1) s.ws.send(JSON.stringify(['CLOSE',sub])); s.ws.close(); }catch(e){} } } }; }
