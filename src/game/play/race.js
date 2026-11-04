// ---------- race a friend: two phones, one patch, straight to each other ----------
// No server. The host's phone makes a WebRTC offer and shares it as an invite link (GAME_URL#race=<code>; the hash
// never reaches a server). The friend's phone opens it, makes an answer and shares it back as a reply code, which the
// host pastes. Public STUN servers (only while connecting) let phones on different networks find each other; some
// strict mobile networks still can't, and the dialog says so. Codes are deflated JSON in base64url (a few hundred
// characters) and carry the phone's network addresses, so the dialog asks to share them only with friends.
// Over the data channel (JSON): hi, start {def, round} (the host grows the patch and sends it whole), mv {n},
// won {mv, secs}, again (wants a rematch), bye. The race itself is mode 'race': no hints, no resume, no meadow or
// garden progress; a Friend chip in the HUD, and onWin hands over to raceWin for the result card.
const RACE_ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'}]};
const RACE_OPTS={flags:true,fruit:true,keys:true,dry:true,portals:true};
let race=null;
const raceOK=()=>!!(window.RTCPeerConnection&&window.CompressionStream&&window.DecompressionStream);
$('raceBtn').hidden=!raceOK();

// an offer or answer as deflated JSON in base64url
const rB64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const rUnB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function racePack(desc){ const s=new Blob([JSON.stringify({t:desc.type[0],s:desc.sdp})]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return rB64(await new Response(s).arrayBuffer()); }
async function raceUnpack(code,want){ code=String(code||'').trim(); const m=code.match(/(?:^|[#?&])race=([A-Za-z0-9_-]+)/); if(m) code=m[1];
  code=code.replace(/[^A-Za-z0-9_-]/g,''); if(code.length<40) throw new Error('short');
  const s=new Blob([rUnB64(code)]).stream().pipeThrough(new DecompressionStream('deflate-raw')); const o=JSON.parse(await new Response(s).text());
  if(o.t!==want[0]||typeof o.s!=='string') throw new Error('kind'); return {type:want,sdp:o.s}; }
// waits for every network address (or 5 s), so the whole offer fits in one code
const raceGathered=pc=>new Promise(res=>{ if(pc.iceGatheringState==='complete') return res();
  const done=()=>{ if(pc.iceGatheringState==='complete'){ pc.removeEventListener('icegatheringstatechange',done); res(); } };
  pc.addEventListener('icegatheringstatechange',done); setTimeout(res,5000); });

// ---- the dialog: one card, its step set by raceStep ----
const RACE_DIFF_LINE={easy:'a small, quick patch',medium:'a medium patch',hard:'a long, twisty patch'};
function raceStep(step,o={}){ const d=$('raceOv').querySelector('.dialog'); d.dataset.step=step;
  const host=race&&race.host, set=(id,t)=>{ const e=$(id); e.hidden=!t; if(t) e.textContent=t; };
  $('raceDiff').hidden=step!=='start'; $('raceCode').hidden=!(step==='wait'||step==='reply'); $('raceCount').hidden=step!=='count';
  const T={start:['Race a friend','Grow a patch and race each other to the burrow. Send your friend an invite, then paste the reply they send back.'],
    wait:['Waiting for a reply',"When your friend opens the invite they'll send you a reply. Paste it here and you're off."],
    reply:['Race invite!','Your friend wants to race. Send them this reply, and the race starts as soon as they paste it.'],
    link:['Connecting…',host?'Saying hello to your friend\'s garden.':'Waiting for your friend to paste your reply.'],
    grow:['Growing a patch…',host?'Planting '+RACE_DIFF_LINE[race.diff]+' for you both.':'Your friend is growing a patch for you both.'],
    count:['Get ready!','Same patch, same start. First worm home wins.'],
    fail:['No luck this time',o.why||"Couldn't reach your friend's garden. Being on the same Wi-Fi, or joining your friend's hotspot, helps."]}[step];
  $('raceTitle').textContent=T[0]; $('raceText').textContent=T[1];
  set('raceGo',{start:'Share invite',wait:'Paste reply',reply:'Send reply',fail:host?'Try again':''}[step]||'');
  set('raceAlt',{wait:'Share invite again',reply:'Copy reply'}[step]||'');
  $('raceCancel').hidden=step==='count'; $('raceCancel').textContent=step==='fail'?'Close':'Not now';
  set('raceNote',step==='start'||step==='reply'?'Invites and replies carry your network address, so share them only with friends. Playing on the same Wi-Fi works best.':'');
  if(step==='start') qa($('raceDiff'),'button').forEach(b=>{ const on=b.dataset.d===race.diff; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); });
  if(step==='wait'){ $('raceCode').readOnly=false; $('raceCode').value=''; $('raceCode').placeholder='Paste the reply here'; }
  if(step==='reply'){ $('raceCode').readOnly=true; $('raceCode').value=race.code; } }
// its own back-button layer only from home; over a race (a rematch) the game layer is already there
function raceDialog(){ if(!isOpen('raceOv')){ show('raceOv'); if(!layers.includes('game')) pushLayer('race'); } }
function raceClose(){ if(isOpen('raceOv')){ hide('raceOv'); if(layers[layers.length-1]==='race') popLayer('race'); } }

// ---- connecting ----
function racePeer(){ const pc=new RTCPeerConnection(RACE_ICE); race.pc=pc;
  pc.oniceconnectionstatechange=()=>{ const s=pc.iceConnectionState; if(!race||race.pc!==pc) return;
    if(s==='checking'&&!race.open){ clearTimeout(race.failT); race.failT=setTimeout(()=>{ if(race&&!race.open) raceFail(); },25000); }
    if(s==='failed'&&!race.open) raceFail();
    if((s==='failed'||s==='disconnected')&&race.open){ clearTimeout(race.goneT); race.goneT=setTimeout(()=>{ if(race&&race.pc===pc&&pc.iceConnectionState!=='connected') raceGone(); },6000); } };
  pc.ondatachannel=e=>{ raceWire(e.channel); if(e.channel.readyState==='open') e.channel.onopen(); }; return pc; }
function raceFail(why){ if(!race) return; clearTimeout(race.failT); try{ race.pc.close(); }catch(e){} raceDialog(); raceStep('fail',{why}); sfx('stuck'); }
async function raceShare(text,url){ try{ if(navigator.share){ await navigator.share(url?{title:'Squirm race',text,url}:{title:'Squirm race',text}); return true; } }
  catch(e){ if(e.name==='AbortError') return false; }
  try{ await navigator.clipboard.writeText(url||text); toast('Copied. Paste it into a message to your friend.',2600); return true; }
  catch(e){ toast('Copy the code from the box and send it to your friend.',2600); return false; } }
// phone A: make the offer and share the invite link
function raceOpen(){ if(!raceOK()) return; raceEnd(); race={host:true,diff:'medium',round:0,friend:{},want:{}}; raceDialog(); raceStep('start'); }
async function raceInvite(){ const b=$('raceGo'); b.disabled=true;
  try{ const pc=racePeer(); raceWire(pc.createDataChannel('race')); await pc.setLocalDescription(await pc.createOffer()); await raceGathered(pc);
    race.code=await racePack(pc.localDescription); race.link=(GAME_URL||location.href.split('#')[0])+'#race='+race.code; }
  catch(e){ b.disabled=false; raceFail('Your phone could not make an invite. Try again in a moment.'); return; }
  b.disabled=false; raceStep('wait'); raceShare('Race me in Squirm! Open this and send me the reply.',race.link); }
async function raceUseReply(text){ if(!race||!race.host||race.pc.signalingState!=='have-local-offer') return;
  let ans; try{ ans=await raceUnpack(text,'answer'); }catch(e){ if(String(text).trim().length>40) nope($('raceCode'),"That doesn't look like a reply. Copy all of it."); return; }
  try{ await race.pc.setRemoteDescription(ans); raceStep('link'); }catch(e){ raceFail(); } }
// phone B: opened an invite link
async function raceJoin(code){ if(!raceOK()){ toast("This browser can't race. Try Chrome on your phone.",3200); return; }
  raceEnd(); race={host:false,round:0,friend:{},want:{}}; raceDialog(); raceStep('link');
  try{ const offer=await raceUnpack(code,'offer'), pc=racePeer(); await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer()); await raceGathered(pc); race.code=await racePack(pc.localDescription); raceStep('reply'); }
  catch(e){ raceFail("That invite didn't work. Ask your friend for a fresh one."); } }

// ---- talking ----
const raceSend=m=>{ try{ if(race&&race.dc&&race.dc.readyState==='open') race.dc.send(JSON.stringify(m)); }catch(e){} };
function raceWire(dc){ race.dc=dc;
  dc.onopen=()=>{ if(!race) return; race.open=true; clearTimeout(race.failT); raceSend({t:'hi',v:NEWS[0][0]}); sfx('on');
    if(race.host){ stat('race/start'); raceGrow(); } else raceStep('grow'); };
  dc.onclose=()=>{ if(race&&race.dc===dc&&race.open) raceGone(); };
  dc.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(err){ return; } if(!race) return;
    if(m.t==='start'&&!race.host&&m.def&&Array.isArray(m.def.map)) raceStart(m.def,m.round);
    else if(m.t==='mv'){ race.friend.n=m.n|0; if(mode==='race') updateHUD(true); }
    else if(m.t==='won'){ race.friend.done=true; race.friend.mv=m.mv|0; race.friend.secs=+m.secs||0;
      if(mode==='race'&&!race.me.done){ toast(`Your friend reached the burrow in ${race.friend.mv} moves!`,2600); sfx('flag'); updateHUD(true); }
      if(isOpen('winOv')&&mode==='race') raceResult(); }
    else if(m.t==='again'){ race.want.friend=true; if(isOpen('winOv')){ if(!race.want.me) toast('Your friend wants a rematch!',2400); raceResult(); } if(race.host&&race.want.me) raceGrow(); }
    else if(m.t==='bye') raceGone(); }; }
function raceGone(){ if(!race||race.friend.gone) return; race.friend.gone=true; race.open=false;
  if(isOpen('raceOv')&&!race.def){ raceFail("Your friend's garden went quiet. Try a fresh invite."); return; }
  if(isOpen('raceOv')) raceClose();
  toast("Your friend's worm wandered off. Keep crawling!",2800); if(mode==='race') updateHUD(true); if(isOpen('winOv')&&mode==='race') raceResult(); }
// leaving: tell the friend, close the line
function raceEnd(){ if(!race) return; raceSend({t:'bye'}); clearTimeout(race.failT); clearTimeout(race.goneT); clearTimeout(race.countT);
  try{ race.pc&&race.pc.close(); }catch(e){} race=null; }
function raceCancel(fromBack){ raceEnd(); if(fromBack) hide('raceOv'); else raceClose(); }

// ---- the race ----
async function raceGrow(){ if(!race||!race.host||race.growing) return; race.growing=true; race.want={};
  if(isOpen('winOv')){ hide('winOv'); popLayer('win'); } raceDialog(); raceStep('grow');
  let def; try{ def=await generateEndless(race.diff,{...RACE_OPTS},(Math.random()*2**31)|0); }catch(e){ race.growing=false; raceFail('The patch would not grow. Try again.'); return; }
  if(!race){ return; } race.growing=false; race.round++; raceSend({t:'start',def,round:race.round}); raceStart(def,race.round); }
function raceStart(def,round){ if(!race) return; def.name='Race patch'; def.hint=''; race.def=def; race.round=round||race.round;
  race.friend={n:0,gone:race.friend.gone}; race.me={done:false}; race.want={}; race.sent=-1;
  if(isOpen('winOv')){ hide('winOv'); popLayer('win'); } raceDialog(); raceStep('count');
  let n=3; const tick=()=>{ if(!race) return; if(n>0){ $('raceCount').textContent=n; sfx('tap'); n--; race.countT=setTimeout(tick,800); return; }
    $('raceCount').textContent='Go!'; sfx('ready');
    race.countT=setTimeout(()=>{ if(!race) return; hide('raceOv'); hideAll(); if(layers[layers.length-1]==='race') swapLayers('race','game');
      mode='race'; startLevel(def,false); enterGame(); race.t0=performance.now(); },500); };
  tick(); }
// from updateHUD: send our move count when it changes
function raceTick(){ if(!race||!state) return; if(state.moves!==race.sent){ race.sent=state.moves; raceSend({t:'mv',n:state.moves}); } }
function raceChip(){ const f=race?race.friend:{gone:true}, n=f.done?f.mv:(f.n||0);
  return hudTile('friend',f.done?'done':'',f.gone?'Your friend left the race':f.done?`Your friend finished in ${f.mv} moves`:`Your friend has made ${n} moves`,
    `${sticker(art('worm',22))}<b>${f.gone&&!f.done?'–':n}</b>`,f.gone&&!f.done?'Left':f.done?'Home!':'Friend'); }
const raceSecs=()=>race&&race.t0?(performance.now()-race.t0)/1000:playT;
const raceClock=s=>{ s=Math.round(s); return s<60?`${s}s`:`${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`; };
// onWin hands over here in a race: tell the friend, then the result card
function raceWin(mv,par,st){ const secs=raceSecs(); if(race){ race.me={done:true,mv,secs}; raceSend({t:'won',mv,secs}); }
  clearResume(); const first=!race||!race.friend.done||secs<=race.friend.secs; if(first){ bumpStat('raceWins'); stat('race/won'); } save();
  $('winStars').innerHTML=[0,1,2].map(i=>STAR(i<st,i)).join(''); raceResult();
  $('winGifts').innerHTML=first?`<div class="gift hot"><span class="gi" aria-hidden="true">${art('trophy',26)}</span><span><b>Race won</b><small>${progress.stats.raceWins} ${progress.stats.raceWins===1?'race':'races'} won so far</small></span></div>`:'';
  $('winReplay').hidden=true; $('winShare').hidden=true; photoInfo={title:'A race patch',st};
  petals(); show('winOv'); pushLayer('win'); stagger([$('winStats'),...qa($('winGifts'),'.gift'),$('winNext'),document.querySelector('.win-acts')],'rise',380,70,8); }
function raceResult(){ const me=race&&race.me||{}, f=race?race.friend:{gone:true}, want=race?race.want:{};
  const won=!f.done||me.secs<=f.secs;
  $('winTitle').textContent=won?'You won the race!':'Your friend got there first';
  $('winSub').textContent=f.done?`Your friend took ${f.mv} ${f.mv===1?'move':'moves'} in ${raceClock(f.secs)}.`:f.gone?'Your friend left the race.':'Your friend is still crawling…';
  $('winStats').innerHTML=`<span class="${won?'good':''}">${me.mv}<small>your moves</small></span><span>${raceClock(me.secs||0)}<small>your time</small></span><span>${f.done?f.mv:'…'}<small>friend's moves</small></span>`;
  const b=$('winNext'); b.disabled=false;
  b.textContent=f.gone?'Back home':want.me?(want.friend?'Growing…':'Waiting for your friend…'):want.friend?'Rematch! They are ready':'Rematch';
  if(want.me&&!f.gone) b.disabled=true; }
// Next on the result card: ask for a rematch (the host grows it once both want one), or go home if the friend left
function raceNext(){ if(!race||race.friend.gone){ raceEnd(); hideAll(); popLayer('game'); showHome(); return; }
  race.want.me=true; raceSend({t:'again'}); raceResult(); if(race.host&&race.want.friend) raceGrow(); }

$('raceBtn').onclick=()=>{ ensureAudio(); raceOpen(); };
$('raceGo').onclick=()=>{ if(!race) return; const st=$('raceOv').querySelector('.dialog').dataset.step;
  if(st==='start') raceInvite();
  else if(st==='wait'){ navigator.clipboard&&navigator.clipboard.readText?navigator.clipboard.readText().then(t=>{ $('raceCode').value=t; raceUseReply(t); },
    ()=>toast('Long-press the box and paste the reply there.',2600)):toast('Long-press the box and paste the reply there.',2600); }
  else if(st==='reply') raceShare(race.code);
  else if(st==='fail'&&race.host){ const d=race.diff; raceEnd(); race={host:true,diff:d,round:0,friend:{},want:{}}; raceStep('start'); } };
$('raceAlt').onclick=()=>{ if(!race) return; const st=$('raceOv').querySelector('.dialog').dataset.step;
  if(st==='wait') raceShare('Race me in Squirm! Open this and send me the reply.',race.link);
  else if(st==='reply') navigator.clipboard.writeText(race.code).then(()=>toast('Reply copied.',1800),()=>toast('Select the reply in the box and copy it.',2400)); };
$('raceCancel').onclick=()=>raceCancel(false);
$('raceCode').addEventListener('input',()=>{ if(race&&race.host) raceUseReply($('raceCode').value); });
qa($('raceDiff'),'button').forEach(b=>b.onclick=()=>{ if(!race) return; race.diff=b.dataset.d; raceStep('start'); settle(b); });
