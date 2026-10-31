// ---------- endless meadow ----------
const DIFF_NAME={easy:'Easy',medium:'Medium',hard:'Hard'};
const FEATURES=[['flags','Flags'],['buttons','Flower buttons'],['leaves','Wet leaves'],['fruit','Fruit'],['keys','Keys & gates'],['portals','Tunnels'],['dry','Dry patches'],['rain','Rain'],['rivers','Rivers'],['snails','Snails'],['beetles','Beetles'],['pollen','Pollen'],['soil','Soft soil']];
const ADJ=['Clover','Mossy','Sunny','Dewy','Puddle','Bramble','Tulip','Daisy','Mint','Fern','Pebble','Willow','Honey','Petal','Thistle','Bluebell','Acorn','Buttercup'];
const NOUN=['Corner','Patch','Hollow','Nook','Lane','Bend','Meadow','Path','Dell','Knoll','Row','Glade'];
function analyzeCapped(Ld,cap){
  const s0=initState(Ld), id=new Map([[stateKey(s0),0]]), states=[s0], edges=[[]], par=[-1], pd=[''], wins=[]; let best=-1;
  for(let i=0;i<states.length;i++){ if(states.length>cap) return null; const s=states[i];
    for(const d of ['N','S','W','E']){ const r=step(s,d); if(r.blocked) continue;
      if(r.state.status==='won'){ wins.push(i); if(best<0) best=i*4+'NSWE'.indexOf(d); continue; }
      const k=stateKey(r.state); let j=id.get(k); if(j===undefined){ j=states.length; id.set(k,j); states.push(r.state); edges.push([]); par.push(i); pd.push(d); } edges[i].push(j); } }
  if(best<0) return {par:0};
  let i=Math.floor(best/4), sol='NSWE'[best%4]; while(i>0){ sol=pd[i]+sol; i=par[i]; }
  const rev=states.map(()=>[]); edges.forEach((es,i)=>es.forEach(j=>rev[j].push(i)));
  const good=new Set(wins), st=[...wins]; while(st.length){ const x=st.pop(); for(const q of rev[x]) if(!good.has(q)){ good.add(q); st.push(q); } }
  return {par:sol.length, sol, states:states.length, good:good.size};
}
function genCandidate(r,diff,o){
  const ri=n=>Math.floor(r()*n), pick=a=>a[ri(a.length)], D4=[[1,0],[-1,0],[0,1],[0,-1]];
  const cfg={easy:{w:[5,6],h:[5,7],fill:.5,len:3,flags:1,dry:.14,cap:12000},medium:{w:[6,7],h:[6,8],fill:.56,len:3,flags:2,dry:.2,cap:25000},hard:{w:[7,8],h:[7,9],fill:.5,len:r()<.6?4:3,flags:2,dry:.3,cap:12000}}[diff];
  if(o.size){ cfg.w=o.size.w; cfg.h=o.size.h; }
  // crossing itself needs a worm of five or more, so soft soil brings a longer worm, laid out as a wiggle
  if(o.soil){ cfg.len=Math.max(cfg.len,5)+(diff!=='easy'&&r()<.5?1:0); if(diff==='easy'){ cfg.w=[6,6]; cfg.h=[6,7]; } } if(o.fill) cfg.fill=o.fill; if(o.dryRate!=null) cfg.dry=o.dryRate;
  const W=cfg.w[0]+ri(cfg.w[1]-cfg.w[0]+1), H=cfg.h[0]+ri(cfg.h[1]-cfg.h[0]+1);
  const g=Array.from({length:H},()=>Array(W).fill(' ')); const target=Math.floor(W*H*cfg.fill); let cnt=0;
  const walkers=[[W>>1,H>>1],[W>>1,H>>1],[ri(W),ri(H)]];
  for(let t=0;t<4000&&cnt<target;t++){ const w=walkers[t%walkers.length]; if(g[w[1]][w[0]]===' '){ g[w[1]][w[0]]='.'; cnt++; }
    const d=pick(D4); const nx=w[0]+d[0], ny=w[1]+d[1]; if(nx>=0&&ny>=0&&nx<W&&ny<H){ w[0]=nx; w[1]=ny; } }
  const at=(x,y)=>(x<0||y<0||x>=W||y>=H)?' ':g[y][x];
  if(o.rivers){ const vert=r()<.5; const N=vert?W:H, M=vert?H:W; const idx=1+ri(N-2);
    for(let k=0;k<M;k++){ if(vert) g[k][idx]='~'; else g[idx][k]='~'; }
    const spots=[]; for(let k=0;k<M;k++){ const a=vert?at(idx-1,k):at(k,idx-1), b=vert?at(idx+1,k):at(k,idx+1); if(a!==' '&&b!==' ') spots.push(k); }
    if(!spots.length) return null; const nb=Math.min(spots.length,1+ri(2));
    for(let i=0;i<nb;i++){ const k=spots.splice(ri(spots.length),1)[0]; const ch=r()<.5?'=':'|'; if(vert) g[k][idx]=ch; else g[idx][k]=ch; } }
  const floor=()=>{ const f=[]; for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(g[y][x]==='.') f.push([x,y]); return f; };
  // worm in a straight line
  let worm=null; for(let t=0;t<120&&!worm;t++){ const f=floor(); if(!f.length) return null; const s=pick(f), d=pick(D4);
    const segs=[]; if(o.soil){ segs.push(s); while(segs.length<cfg.len){ const c=segs[segs.length-1], n=D4.map(e=>[c[0]+e[0],c[1]+e[1]]).filter(q=>at(q[0],q[1])==='.'&&!segs.some(z=>z[0]===q[0]&&z[1]===q[1])); if(!n.length) break; segs.push(pick(n)); } }
    else for(let i=0;i<cfg.len;i++){ const x=s[0]+d[0]*i, y=s[1]+d[1]*i; if(at(x,y)!=='.') break; segs.push([x,y]); } if(segs.length===cfg.len) worm=segs; }
  if(!worm) return null; const used=new Set(worm.map(p=>p+''));
  // exit far from the head
  const dist={}; const q=[worm[0]]; dist[worm[0]+'']=0;
  while(q.length){ const c=q.shift(); for(const d of D4){ const n=[c[0]+d[0],c[1]+d[1]], ch=at(n[0],n[1]); if(ch===' '||ch==='~'||dist[n+'']!==undefined) continue; dist[n+'']=dist[c+'']+1; q.push(n); } }
  const reach=floor().filter(p=>dist[p+'']!==undefined&&!used.has(p+'')).sort((a,b)=>dist[b+'']-dist[a+'']);
  if(reach.length<6) return null; const ex=reach[ri(Math.max(1,Math.floor(reach.length*.2)))]; g[ex[1]][ex[0]]='E'; used.add(ex+'');
  const free=(filter)=>{ const f=floor().filter(p=>!used.has(p+'')&&(!filter||filter(p))); if(!f.length) return null; const p=pick(f); used.add(p+''); return p; };
  const put=(c,filter)=>{ const p=free(filter); if(p) g[p[1]][p[0]]=c; return p; };
  const corridor=p=>{ let n=0; for(const d of D4){ const ch=at(p[0]+d[0],p[1]+d[1]); if(ch!==' '&&ch!=='~') n++; } return n===2; };
  const notNearHead=p=>Math.abs(p[0]-worm[0][0])+Math.abs(p[1]-worm[0][1])>1;
  let exitLen=cfg.len;
  if(o.flags) for(let i=0;i<(diff==='easy'?1:cfg.flags);i++) put('C',notNearHead);
  if(o.fruit){ const pl=diff==='easy'?(r()<.5?['+']:['-']):diff==='medium'?pick([['+','-'],['-'],['+']]):pick([['+','-','-'],['-','+'],['+','+','-']]);
    for(const c of pl){ if(put(c,notNearHead)) exitLen+= c==='+'?1:-1; } if(exitLen<2) return null; }
  if(o.keys){ if(!put('G',p=>corridor(p)&&notNearHead(p))) return null; put('K',notNearHead); }
  if(o.portals){ const a=put('1',notNearHead); if(!a) return null; const b=put('1',p=>Math.abs(p[0]-a[0])+Math.abs(p[1]-a[1])>=3); if(!b) return null; }
  if(o.buttons){ for(let k=0;k<(diff==='hard'?2:1);k++){ const h=put('H',p=>corridor(p)&&notNearHead(p)); if(!h){ if(k) break; return null; }
      if(!k&&!put('B',p=>{ const d=Math.abs(p[0]-h[0])+Math.abs(p[1]-h[1]); return d>=2&&d<=cfg.len+1&&notNearHead(p); })) return null; } }
  if(o.leaves){ let made=0;
    for(let t=0;t<30&&made<(diff==='easy'?1:2);t++){ const f=floor().filter(p=>!used.has(p+'')); if(!f.length) break; const p=pick(f), d=pick(D4); const run=[];
      for(let k=0;k<5;k++){ const q=[p[0]+d[0]*k,p[1]+d[1]*k]; if(at(q[0],q[1])!=='.'||used.has(q+'')) break; run.push(q); }
      if(run.length<2) continue; run.slice(0,2+ri(Math.min(3,run.length-1))).forEach(q=>{ g[q[1]][q[0]]='i'; used.add(q+''); }); made++; }
    if(!made) return null; }
  if(o.rain){ put('R'); if(diff!=='easy') put('R'); for(let i=0;i<1+ri(2);i++) put('s',corridor); for(let i=0;i<1+ri(2);i++) put('w',notNearHead); }
  if(o.rivers){ put('L'); if(diff==='hard'&&r()<.6) put('L'); }
  if(o.dry){ for(const p of floor()){ if(!used.has(p+'') && r()<cfg.dry) g[p[1]][p[0]]='x'; } }
  if(o.snails){ const n=diff==='hard'?2:1; let placed=0;
    for(let t=0;t<60&&placed<n;t++){ const f=floor().filter(p=>!used.has(p+'')&&Math.abs(p[0]-worm[0][0])+Math.abs(p[1]-worm[0][1])>2); if(!f.length) break; const p=pick(f);
      const dirs=[['>',1,0],['<',-1,0],['v',0,1],['^',0,-1]].filter(([c,dx,dy])=>at(p[0]+dx,p[1]+dy)==='.'&&at(p[0]+2*dx,p[1]+2*dy)==='.'); if(!dirs.length) continue;
      const d=pick(dirs); g[p[1]][p[0]]=d[0]; used.add(p+''); placed++; }
    if(!placed) return null; }
  // beetles sit on grass where at least one push is possible: something to stand on behind them, grass ahead
  if(o.beetles){ const n=diff==='hard'?2:diff==='medium'?1+ri(2):1; let placed=0;
    for(let t=0;t<60&&placed<n;t++){ const f=floor().filter(p=>!used.has(p+'')&&Math.abs(p[0]-worm[0][0])+Math.abs(p[1]-worm[0][1])>1); if(!f.length) break; const p=pick(f);
      const pushable=D4.some(([dx,dy])=>{ const bk=at(p[0]-dx,p[1]-dy); return bk!==' '&&bk!=='~'&&at(p[0]+dx,p[1]+dy)==='.'; });
      if(!pushable) continue; g[p[1]][p[0]]='O'; used.add(p+''); placed++; }
    if(!placed) return null; }
  // pollen: a flower for each colour, and a petal gate or two of that colour on narrow paths
  if(o.pollen){ const cols=['P','Y','U'].sort(()=>r()-.5).slice(0,diff==='easy'?1:diff==='medium'?1+ri(2):2+(r()<.3?1:0));
    for(const c of cols){ if(!put(c,notNearHead)) return null;
      for(let k=0;k<(diff==='easy'?1:1+ri(2));k++) if(!put(c.toLowerCase(),p=>corridor(p)&&notNearHead(p))&&!k) return null; } }
  // soft soil where paths meet, so there's a way to loop round and burrow back through
  if(o.soil){ const n=diff==='easy'?1:diff==='medium'?1+ri(2):2+ri(2); let placed=0;
    for(let t=0;t<60&&placed<n;t++){ const f=floor().filter(p=>!used.has(p+'')); if(!f.length) break; const p=pick(f);
      if(D4.filter(d=>{ const ch=at(p[0]+d[0],p[1]+d[1]); return ch!==' '&&ch!=='~'; }).length<3) continue; g[p[1]][p[0]]='#'; used.add(p+''); placed++; }
    if(!placed) return null; }
  return {name:pick(ADJ)+' '+pick(NOUN), exitLen, worm, map:g.map(row=>row.join('')), rain:false};
}
// which optional mechanics a solution actually needs, so the generator can prefer patches that use what was asked for
function usage(Ld,sol){ let s=initState(Ld); const u=new Set();
  for(const d of sol){ const r=step(s,d), ev=r.ev||{}, h=r.state&&r.state.segs[0];
    if(ev.slide) u.add('leaves'); if(ev.pushed||(ev.slide&&ev.slide.some(x=>x.ev.pushed))) u.add('beetles');
    if(h&&tileAt(s,h[0],h[1])==='H') u.add('buttons'); if(ev.portal) u.add('portals'); if(ev.rain!==undefined) u.add('rain');
    if(ev.swung&&ev.swung.length) u.add('rivers'); if(ev.eaten==='+'||ev.eaten==='-') u.add('fruit'); if(ev.eaten==='G') u.add('keys');
    if(h&&r.state.snails&&r.state.snails.some(n=>Math.abs(n.x-h[0])+Math.abs(n.y-h[1])<=1)) u.add('snails');
    if(ev.crumbled&&ev.crumbled.length) u.add('dry'); if(h&&PETALS[tileAt(s,h[0],h[1])]) u.add('pollen'); if(ev.cross) u.add('soil'); s=r.state; }
  return u; }
async function generateEndless(diff,o,seed,fixedTries){
  const r=rng(seed); const budget={easy:1400,medium:2600,hard:4800}[diff]; const t0=performance.now(); let best=null, bestScore=-1e9, n=0;
  const enabled=['fruit','keys','portals','dry','rain','rivers','snails','buttons','leaves','beetles','pollen','soil'].filter(k=>o[k]); const needUse=Math.min(enabled.length,diff==='easy'?1:2);
  while(true){ n++; const Ld=genCandidate(r,diff,o);
    if(Ld){ const cap={easy:4000,medium:10000,hard:12000}[diff]; const a=analyzeCapped(Ld,cap);
      if(a&&a.par>=5){ const win=a.good/a.states; const u=usage(Ld,a.sol); const used=enabled.filter(k=>u.has(k)).length;
        const inRange = diff==='easy' ? (a.par>=6&&a.par<=16&&win>=.45) : diff==='medium' ? (a.par>=12&&a.par<=30&&win<=.8) : (a.par>=18&&win<=(enabled.length>=2?.4:enabled.length===1?.7:.95));
        let score = diff==='hard' ? a.par*(1-win)+used*4 : diff==='medium' ? 20-Math.abs(a.par-18)+(1-win)*10+used*3 : 20-Math.abs(a.par-10)+used*3;
        if(used<needUse) score-=40; if(!inRange) score-=25;
        if(score>bestScore){ bestScore=score; best={...Ld,par:a.par}; }
        if(!fixedTries && inRange && used>=needUse && performance.now()-t0>budget*.35) break; } }
    const el=performance.now()-t0;
    if(fixedTries){ if(n>=fixedTries && best) break; }
    else if(el>budget && best && (bestScore>0 || el>budget*1.4)) break;
    if(!fixedTries && el>budget*3 && !best){ o={flags:true}; } // last resort: plain puzzle
    if(n>3) $('genText').textContent=['Planting seeds','Digging tunnels','Watering the soil','Checking every path'][Math.floor(el/700)%4]+'...';
    await new Promise(res=>setTimeout(res,0)); // let the page breathe between candidates
  }
  const feats=FEATURES.filter(([k])=>k!=='flags'&&o[k]&&best.map.join('').match({buttons:/H/,leaves:/i/,fruit:/[+-]/,keys:/K/,portals:/1/,dry:/x/,rain:/R/,rivers:/L|=|\|/,snails:/[<>^v]/,beetles:/O/,pollen:/[PYU]/,soil:/#/}[k])).map(([,n])=>n.toLowerCase());
  best.tries=n; best.seed=seed; best.hint=feats.length?`A fresh ${DIFF_NAME[diff].toLowerCase()} patch with ${feats.join(', ')}.`:`A fresh ${DIFF_NAME[diff].toLowerCase()} patch.`;
  return best;
}
const dateKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
