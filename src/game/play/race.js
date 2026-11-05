// ---------- race a friend: two phones, one patch, straight to each other ----------
// No server of our own. The host gets a six-letter room code (and an invite link, GAME_URL#race=<code>, the hash
// never reaching a server); the friend opens the link or types the code. Both phones meet on a few public Nostr
// relays (platform/nostr.js: encrypted with a key from the code, nothing stored) and swap a WebRTC offer and answer
// there: join (the friend, every 3 s until an offer comes), offer (to that friend), answer (repeated until connected).
// Then they talk straight to each other over a data channel; public STUN servers help phones on different networks
// find each other, and some strict mobile networks still can't (the dialog says so).
// Over the data channel (JSON): hi, look (the outfit for the ghost), start {def, round} (the host grows the patch and
// sends it whole), mv {n, s: our segments}, won {mv, secs}, again (wants a rematch), bye. The race itself is mode
// 'race': no hints, no resume, no meadow or garden progress; a Friend chip in the HUD, and onWin hands over to
// raceWin for the result card.
const RACE_ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'}]};
const RACE_OPTS={flags:true,fruit:true,keys:true,dry:true,portals:true};
let race=null;
const raceOK=()=>!!(window.RTCPeerConnection&&window.WebSocket&&window.crypto&&crypto.subtle&&typeof BigInt==='function');
$('raceBtn').hidden=!raceOK();

// room codes: six letters and digits that can't be mixed up (no I, L, O, 0 or 1)
const RACE_ABC='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const raceNewCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>RACE_ABC[b%RACE_ABC.length]).join('');
const raceClean=s=>{ s=String(s||'').trim(); const m=s.match(/(?:^|[#?&])race=([A-Za-z0-9]+)/); if(m) s=m[1];
  return s.toUpperCase().split('').filter(c=>RACE_ABC.includes(c)).join(''); };
// waits for every network address (or 5 s), so the whole offer goes in one message
const raceGathered=pc=>new Promise(res=>{ if(pc.iceGatheringState==='complete') return res();
  const done=()=>{ if(pc.iceGatheringState==='complete'){ pc.removeEventListener('icegatheringstatechange',done); res(); } };
  pc.addEventListener('icegatheringstatechange',done); setTimeout(res,5000); });

// ---- the dialog: one card, its step set by raceStep ----
const RACE_DIFF_LINE={easy:'a small, quick patch',medium:'a medium patch',hard:'a long, twisty patch'};
function raceStep(step,o={}){ const d=$('raceOv').querySelector('.dialog'); d.dataset.step=step;
  const host=race&&race.host, set=(id,t)=>{ const e=$(id); e.hidden=!t; if(t) e.textContent=t; };
  $('raceDiff').hidden=step!=='start'; $('raceCode').hidden=step!=='join'; $('raceCount').hidden=!(step==='count'||step==='room');
  $('raceCount').classList.toggle('code',step==='room');
  const T={start:['Race a friend','Grow a patch and race each other to the burrow. Start a race and share the code, or join a friend\'s.'],
    room:['Your race code','Send your friend the invite, or have them type this code in Race a friend. The race starts when they join.'],
    join:['Join a race','Type the code your friend sees on their screen.'],
    link:[host?'Your friend is here!':'Finding the race…',host?'Connecting your gardens.':'Looking for your friend\'s race.'],
    grow:['Growing a patch…',host?'Planting '+RACE_DIFF_LINE[race.diff]+' for you both.':'Your friend is growing a patch for you both.'],
    count:['Get ready!','Same patch, same start. First worm home wins.'],
    fail:['No luck this time',o.why||"Couldn't reach your friend's garden. Being on the same Wi-Fi, or joining your friend's hotspot, helps."]}[step];
  $('raceTitle').textContent=T[0]; $('raceText').textContent=T[1];
  set('raceGo',{start:'Start a race',room:'Share invite',join:'Join',fail:host?'Try again':''}[step]||'');
  set('raceAlt',{start:'Join with a code',room:'Copy code'}[step]||'');
  $('raceCancel').hidden=step==='count'; $('raceCancel').textContent=step==='fail'?'Close':'Not now';
  if(step==='start') qa($('raceDiff'),'button').forEach(b=>{ const on=b.dataset.d===race.diff; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); });
  if(step==='room') $('raceCount').textContent=race.code;
  if(step==='join'){ $('raceCode').value=''; setTimeout(()=>$('raceCode').focus(),300); } }
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
function raceFail(why){ if(!race) return; clearTimeout(race.failT); clearInterval(race.joinT); clearInterval(race.ansT); clearTimeout(race.lostT);
  if(race.room) race.room.close(); try{ race.pc&&race.pc.close(); }catch(e){} raceDialog(); raceStep('fail',{why}); sfx('stuck'); }
async function raceShare(text,url){ try{ if(navigator.share){ await navigator.share(url?{title:'Squirm race',text,url}:{title:'Squirm race',text}); return true; } }
  catch(e){ if(e.name==='AbortError') return false; }
  try{ await navigator.clipboard.writeText(url||text); toast('Copied. Paste it into a message to your friend.',2600); return true; }
  catch(e){ toast('Copy the code from the box and send it to your friend.',2600); return false; } }
// the host: open a room, share its code, offer a connection to whoever joins first
function raceOpen(){ if(!raceOK()) return; raceEnd(); race={host:true,diff:'medium',round:0,friend:{},want:{}}; raceDialog(); raceStep('start'); }
async function raceHost(){ race.code=raceNewCode(); race.link=(GAME_URL||location.href.split(/[?#]/)[0])+'#race='+race.code; raceStep('room');
  const r=race; r.room=await nostrRoom(r.code,raceSignal); if(race!==r){ r.room.close(); return; } raceRelaysCheck(); }
async function raceOffer(){ const r=race; if(r.offer){ r.room.send({t:'offer',to:r.guest,sdp:r.offer}); return; } if(r.making) return; r.making=true; raceStep('link');
  try{ const pc=racePeer(); raceWire(pc.createDataChannel('race')); await pc.setLocalDescription(await pc.createOffer()); await raceGathered(pc); }
  catch(e){ raceFail('Your phone could not get ready to race. Try again in a moment.'); return; }
  if(race!==r) return; r.offer=r.pc.localDescription.sdp; r.room.send({t:'offer',to:r.guest,sdp:r.offer}); }
// the friend: open the room the code names and knock until the host offers
async function raceJoin(code){ if(!raceOK()){ toast("This browser can't race. Try Chrome on your phone.",3200); return; }
  code=raceClean(code); raceEnd(); race={host:false,round:0,friend:{},want:{}}; raceDialog();
  if(code.length!==6){ raceStep('fail',{why:"That isn't a race code. Ask your friend for theirs: six letters and numbers."}); return; }
  race.code=code; raceStep('link'); const r=race; r.room=await nostrRoom(code,raceSignal); if(race!==r){ r.room.close(); return; }
  const knock=()=>{ if(race===r&&!r.offerIn) r.room.send({t:'join'}); }; knock(); r.joinT=setInterval(knock,3000);
  r.lostT=setTimeout(()=>{ if(race===r&&!r.offerIn) raceFail("Couldn't find that race. Check the code, or ask your friend to start a new one."); },30000);
  raceRelaysCheck(); }
async function raceAnswer(sdp){ const r=race; if(r.answer||r.making) return; r.making=true; clearInterval(r.joinT); clearTimeout(r.lostT);
  try{ const pc=racePeer(); await pc.setRemoteDescription({type:'offer',sdp}); await pc.setLocalDescription(await pc.createAnswer()); await raceGathered(pc); }
  catch(e){ raceFail("Couldn't connect to your friend's garden. Try again."); return; }
  if(race!==r) return; r.answer=r.pc.localDescription.sdp; const say=()=>{ if(race===r&&!r.open) r.room.send({t:'answer',to:r.hostKey,sdp:r.answer}); };
  say(); r.ansT=setInterval(say,3000); }
// what comes through the relays before the phones are connected
function raceSignal(m,from){ const r=race; if(!r||r.open||!m) return;
  if(r.host){ if(m.t==='join'){ if(r.guest&&r.guest!==from) return; r.guest=from; raceOffer(); }
    else if(m.t==='answer'&&from===r.guest&&r.pc&&r.pc.signalingState==='have-local-offer'&&typeof m.sdp==='string')
      r.pc.setRemoteDescription({type:'answer',sdp:m.sdp}).catch(()=>raceFail()); }
  else if(m.t==='offer'&&m.to===r.room.me&&typeof m.sdp==='string'&&!r.offerIn){ r.offerIn=true; r.hostKey=from; raceAnswer(m.sdp); } }
// no relay answering at all means no internet (or every relay is down)
function raceRelaysCheck(){ const r=race; setTimeout(()=>{ if(race===r&&r.room&&!r.open&&!r.room.open()) raceFail("Couldn't reach the race meeting point. Check your internet connection and try again."); },8000); }

// ---- talking ----
const raceSend=m=>{ try{ if(race&&race.dc&&race.dc.readyState==='open') race.dc.send(JSON.stringify(m)); }catch(e){} };
function raceWire(dc){ race.dc=dc;
  dc.onopen=()=>{ if(!race) return; race.open=true; clearTimeout(race.failT); clearInterval(race.ansT); clearTimeout(race.lostT); if(race.room) race.room.close(); raceSend({t:'hi',v:NEWS[0][0]}); sfx('on');
    raceSend({t:'look',look:myLook()}); if(race.host){ stat('race/start'); raceGrow(); } else raceStep('grow'); };
  dc.onclose=()=>{ if(race&&race.dc===dc&&race.open) raceGone(); };
  dc.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(err){ return; } if(!race) return;
    if(m.t==='start'&&!race.host&&m.def&&Array.isArray(m.def.map)) raceStart(m.def,m.round);
    else if(m.t==='look'&&m.look&&Array.isArray(m.look.c)){ race.look=m.look; if(mode==='race'&&!ghost) raceGhostBuild(); }
    else if(m.t==='mv'){ race.friend.n=m.n|0; if(Array.isArray(m.s)) race.friend.segs=m.s; if(mode==='race'){ raceGhostTo(m.s); updateHUD(true); } }
    else if(m.t==='won'){ race.friend.done=true; race.friend.mv=m.mv|0; race.friend.secs=+m.secs||0; race.friend.st=Math.max(0,Math.min(3,m.st|0));
      if(mode==='race'&&!race.me.done){ toast(`Your friend reached the burrow in ${race.friend.mv} moves!`,2600); sfx('flag'); updateHUD(true); }
      setTimeout(()=>{ if(race&&race.friend.done) raceGhostDrop(); },700);
      if(isOpen('winOv')&&mode==='race') raceResult(); }
    else if(m.t==='again'){ race.want.friend=true; if(isOpen('winOv')){ if(!race.want.me) toast('Your friend wants a rematch!',2400); raceResult(); } if(race.host&&race.want.me) raceGrow(); }
    else if(m.t==='bye') raceGone(); }; }
function raceGone(){ if(!race||race.friend.gone) return; race.friend.gone=true; race.open=false; raceGhostDrop();
  if(isOpen('raceOv')&&!race.def){ raceFail("Your friend's garden went quiet. Try a fresh invite."); return; }
  if(isOpen('raceOv')) raceClose();
  toast("Your friend's worm wandered off. Keep crawling!",2800); if(mode==='race') updateHUD(true); if(isOpen('winOv')&&mode==='race') raceResult(); }
// leaving: tell the friend, close the line
function raceEnd(){ raceGhostDrop(); if(!race) return; raceSend({t:'bye'}); clearTimeout(race.failT); clearTimeout(race.goneT); clearTimeout(race.countT);
  clearInterval(race.joinT); clearInterval(race.ansT); clearTimeout(race.lostT); if(race.room) race.room.close();
  try{ race.pc&&race.pc.close(); }catch(e){} race=null; }
function raceCancel(fromBack){ raceEnd(); if(fromBack) hide('raceOv'); else raceClose(); }

// ---- the race ----
async function raceGrow(){ if(!race||!race.host||race.growing) return; race.growing=true; race.want={};
  if(isOpen('winOv')){ hide('winOv'); popLayer('win'); } raceDialog(); raceStep('grow');
  let def; try{ def=await generateEndless(race.diff,{...RACE_OPTS},(Math.random()*2**31)|0); }catch(e){ race.growing=false; raceFail('The patch would not grow. Try again.'); return; }
  if(!race){ return; } race.growing=false; race.round++; raceSend({t:'start',def,round:race.round}); raceStart(def,race.round); }
function raceStart(def,round){ if(!race) return; def.name='Race patch'; def.hint=''; race.def=def; race.round=round||race.round;
  race.friend={n:0,gone:race.friend.gone}; race.me={done:false}; race.want={}; race.sent=-1;
  if(race.round>1){ bumpStat('rematches'); checkBadges({race:true}); save(); }
  if(isOpen('winOv')){ hide('winOv'); popLayer('win'); } raceDialog(); raceStep('count');
  let n=3; const tick=()=>{ if(!race) return; if(n>0){ $('raceCount').textContent=n; sfx('tap'); n--; race.countT=setTimeout(tick,800); return; }
    $('raceCount').textContent='Go!'; sfx('ready');
    race.countT=setTimeout(()=>{ if(!race) return; hide('raceOv'); hideAll(); if(layers[layers.length-1]==='race') swapLayers('race','game');
      mode='race'; startLevel(def,false); enterGame(); race.t0=performance.now(); if(!race.friend.gone) raceGhostBuild(); },500); };
  tick(); }
// from updateHUD: send our move count when it changes
function raceTick(){ if(!race||!state) return; const key=state.moves+':'+state.segs.join(';'); if(key!==race.sent){ race.sent=key; raceSend({t:'mv',n:state.moves,s:state.segs}); } }
// the race row under the HUD: how your friend is doing, and the race clock
function raceBar(){ const f=race?race.friend:{gone:true}, el=$('raceBar'), n=f.done?f.mv:(f.n||0);
  const t=f.gone&&!f.done?'Your friend left the race':f.done?`Friend got home in ${f.mv}!`:`Friend <small>· ${n} ${n===1?'move':'moves'}</small>`;
  const on=ghostShown(), gb=f.gone||f.done?'':`<button class="rb-ghost${on?' on':''}" id="raceGhostBtn" aria-pressed="${on}" aria-label="Show your friend's ghost" data-sfx="none">${UI_ICON[on?'eye':'eyeOff']}</button>`;
  const html=`<span class="ic" aria-hidden="true">${art('worm',19)}</span><span class="rb-t">${t}</span>${gb}<span class="rb-clock" id="raceClock">${raceMMSS(raceSecs())}</span>`;
  el.classList.toggle('done',!!f.done); if(el.innerHTML!==html) el.innerHTML=html; }
// the friend's ghost can be hidden from the race row; the choice is remembered (squirm-race-ghost, shown by default)
const ghostShown=()=>store.get('squirm-race-ghost')!=='0';
$('raceBar').addEventListener('click',e=>{ if(!e.target.closest('#raceGhostBtn')) return; const on=!ghostShown();
  store.set('squirm-race-ghost',on?'1':'0'); sfx(on?'on':'off'); if(ghost) ghost.g.visible=on; raceBar(); });
// once a second, from frame
const raceMMSS=s=>{ s=Math.floor(s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
let raceClockS=-1;
function raceClockTick(){ if(!race||!race.t0||(race.me&&race.me.done)) return; const s=Math.floor(raceSecs()); if(s===raceClockS) return; raceClockS=s;
  const c=$('raceClock'); if(c) c.textContent=raceMMSS(s); }
// a race still on: connected, the friend still here, and not yet home ourselves
const raceLive=()=>mode==='race'&&!!race&&race.open&&!race.friend.gone&&!(race.me&&race.me.done)&&!!state&&state.status==='play';
function raceAskLeave(){ if(isOpen('leaveOv')) return; show('leaveOv'); pushLayer('leave'); }
$('leaveNo').onclick=()=>window.history.back();
$('leaveYes').onclick=()=>{ hide('leaveOv'); raceEnd(); hideAll(); popLayer('game'); showHome(); };
const raceSecs=()=>race&&race.t0?(performance.now()-race.t0)/1000:playT;
const raceClock=s=>{ s=Math.round(s); return s<60?`${s}s`:`${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`; };
// onWin hands over here in a race: tell the friend, then the result card
function raceWin(mv,par,st){ const secs=raceSecs(), exBefore=EXTRAS.filter(e=>e[3]()).map(e=>e[0]);
  if(race){ race.me={done:true,mv,secs,st}; raceSend({t:'won',mv,secs,st}); }
  clearResume(); const first=!race||!race.friend.done||secs<=race.friend.secs; bumpStat('races'); if(first){ bumpStat('raceWins'); stat('race/won'); }
  // what this race earned: badges, a hat or an extra
  const gifts=[], gift=(ico,t,sub)=>gifts.push(`<div class="gift hot"><span class="gi" aria-hidden="true">${ico}</span><span><b>${t}</b><small>${sub}</small></span></div>`);
  if(first) gift(art('trophy',26),'Race won',`${progress.stats.raceWins} ${progress.stats.raceWins===1?'race':'races'} won so far`);
  checkBadges({race:true,won:first}).forEach(b=>gift(art(b[1],26),b[2],'New badge'));
  const newHat=HATS.find(h=>h[0]!=='none'&&hatUnlocked(h)&&!winHats.includes(h[0])); if(newHat) gift(hatArt(newHat[0],28),newHat[1],'New hat for your wardrobe');
  const newEx=EXTRAS.find(e=>e[0]!=='none'&&e[3]()&&!exBefore.includes(e[0])); if(newEx) gift(art('extra-'+newEx[0],28),newEx[1],'New extra for your wardrobe');
  save();
  $('winStars').innerHTML=[0,1,2].map(i=>STAR(i<st,i)).join('');
  $('winGifts').innerHTML=gifts.join('')+'<div class="race-tally" id="raceTally"></div>'; raceResult();
  $('winReplay').hidden=true; $('winShare').hidden=true; photoInfo={title:'A race patch',st};
  petals(); show('winOv'); pushLayer('win'); stagger([$('winStats'),...qa($('winGifts'),'.gift,.race-tally'),$('winNext'),document.querySelector('.win-acts')],'rise',380,70,8); }
// the session's totals, both sides: a round counts once both worms are home (or the friend left), and only once
function raceSettle(){ if(!race||!race.me||!race.me.done||race.settled===race.round) return; const me=race.me, f=race.friend;
  if(!f.done&&!f.gone) return; race.settled=race.round;
  const T=race.tally||(race.tally={rounds:0,me:{wins:0,stars:0,secs:0},fr:{wins:0,stars:0,secs:0}}); T.rounds++;
  T.me.stars+=me.st||0; T.me.secs+=me.secs||0;
  if(f.done){ T.fr.stars+=f.st||0; T.fr.secs+=f.secs||0; if(me.secs<=f.secs) T.me.wins++; else T.fr.wins++; } else T.me.wins++; }
function raceTallyHTML(){ const T=race&&race.tally; if(!T) return '';
  const row=(k,a,b,fmt=x=>x)=>`<span class="${a>b?'lead':''}">${fmt(a)}</span><b>${k}</b><span class="${b>a?'lead':''}">${fmt(b)}</span>`;
  return `<p class="rt-head"><span>You</span><b>${T.rounds} ${T.rounds===1?'round':'rounds'} so far</b><span>Friend</span></p>`
    +`<div class="rt-grid">${row('Wins',T.me.wins,T.fr.wins)}${row('Stars',T.me.stars,T.fr.stars)}${row('Total time',-T.me.secs,-T.fr.secs,x=>raceClock(-x))}</div>`; }
function raceResult(){ const me=race&&race.me||{}, f=race?race.friend:{gone:true}, want=race?race.want:{};
  raceSettle(); const tl=$('raceTally'); if(tl){ tl.innerHTML=raceTallyHTML(); tl.hidden=!tl.innerHTML; }
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
  if(st==='start') raceHost();
  else if(st==='room') raceShare(`Race me in Squirm! Open this, or type ${race.code} in Race a friend.`,race.link);
  else if(st==='join'){ const c=raceClean($('raceCode').value); if(c.length!==6){ nope($('raceCode'),'Race codes have six letters and numbers.'); return; } raceJoin(c); }
  else if(st==='fail'&&race.host){ const d=race.diff; raceEnd(); race={host:true,diff:d,round:0,friend:{},want:{}}; raceStep('start'); } };
$('raceAlt').onclick=()=>{ if(!race) return; const st=$('raceOv').querySelector('.dialog').dataset.step;
  if(st==='start'){ race.host=false; raceStep('join'); }
  else if(st==='room') navigator.clipboard.writeText(race.code).then(()=>toast('Code copied.',1800),()=>toast(`Your code is ${race.code}.`,2400)); };
$('raceCancel').onclick=()=>raceCancel(false);
$('raceCode').addEventListener('input',()=>{ const e=$('raceCode'), c=raceClean(e.value); if(e.value!==c) e.value=c; });
$('raceCode').addEventListener('keydown',e=>{ if(e.key==='Enter') $('raceGo').onclick(); });
qa($('raceDiff'),'button').forEach(b=>b.onclick=()=>{ if(!race) return; race.diff=b.dataset.d; raceStep('start'); settle(b); });

// ---- the friend's ghost: a see-through worm in their colours, pattern, hat and extra, crawling where they crawl ----
// Their look comes with hi; their worm with every mv (s: its segments). The ghost eases toward each new position and
// snaps when a part jumps (a tunnel, a turnaround). Its materials are see-through copies cached in MC, so they are
// kept across patches; the ghost's own geometry is freed by raceGhostDrop.
let ghost=null;
function myLook(){ const c=WORM_COLS[wormCol], h=HATS.find(x=>x[0]===hatId&&hatUnlocked(x)), e=extraOn();
  return {c:[c[1],c[2],c[4]],p:patOn(),h:h?h[0]:'none',ht:h?tintOf(h[0]):0,e,et:tintOf(e)}; }
function ghostMat(mt,hex){ const key='ghost'+(hex!=null?'#'+hex:mt.uuid);
  return MC[key]||(MC[key]=(()=>{ const g=mt.clone(); if(hex!=null) g.color.setHex(hex); g.transparent=true; g.opacity=mt===lineMat?.5:.72; return g; })()); }
function ghostLook(root,look){ const skin=look.c[1], cheek=look.c[2];
  root.traverse(o=>{ if(!o.material||Array.isArray(o.material)) return; const mt=o.material;
    o.material=mt===m('head')||mt===MC.gameHead?ghostMat(mt,skin):mt===cheekMat?ghostMat(mt,cheek):ghostMat(mt); o.renderOrder=2; o.castShadow=false; }); }
function raceGhostBuild(){ raceGhostDrop(); if(!race||!race.look||!race.def) return; const look=race.look, gg=new THREE.Group(); scene.add(gg);
  const head=makeSeg(0,gg), u=head.userData; u.hatSlot.clear(); u.accSlot.clear();
  if(look.h!=='none'&&HATS.some(x=>x[0]===look.h)){ const k=look.h+'|'+look.ht; if(!hatProto[k]) hatProto[k]=tinted(look.h,buildHat(look.h),look.ht); u.hatSlot.add(wearAdd(hatProto[k].clone())); }
  if(look.e!=='none'&&EXTRAS.some(x=>x[0]===look.e)){ const k=look.e+'|'+look.et; if(!extraProto[k]) extraProto[k]=tinted(look.e,buildExtra(look.e),look.et); u.accSlot.add(wearAdd(extraProto[k].clone())); }
  applyExpr(head,'smile'); ghostLook(head,look);
  const bodyMat=MC.ghostBody||(MC.ghostBody=new THREE.MeshToonMaterial({color:0xffffff,vertexColors:true,gradientMap:gradTex,transparent:true,opacity:.72}));
  const lineG=ghostMat(lineMat);
  gg.visible=ghostShown();
  ghost={g:gg,head,tubes:[],bodyMat,lineG,base:new THREE.Color(look.c[0]),pat:look.p,cur:[],tgt:[]};
  raceGhostTo(race.def.worm,true); }
function raceGhostDrop(){ if(!ghost) return; dropSeg(ghost.head); ghost.tubes.forEach(t=>{ t.body.geometry.dispose(); t.line.geometry.dispose(); });
  scene.remove(ghost.g); ghost=null; }
// where the friend's worm is now
function raceGhostTo(segs,snap){ if(!ghost||!state||!Array.isArray(segs)||!segs.length) return; const n=segs.length;
  const T=segs.map((p,i)=>wp(p[0],p[1],segY(i,n)));
  const jump=snap||T.length!==ghost.cur.length||T.some((t,i)=>t.distanceTo(ghost.cur[i])>1.6);
  ghost.tgt=T; if(jump) ghost.cur=T.map(t=>t.clone()); ghost.dirty=true; }
// from frame: ease toward the target and redraw while moving
function raceGhostTick(dt){ if(!ghost) return; const k=1-Math.exp(-dt/1000*12); let moving=ghost.dirty;
  ghost.cur.forEach((c,i)=>{ const t=ghost.tgt[i]; if(t&&c.distanceToSquared(t)>1e-6){ c.lerp(t,k); moving=true; } });
  if(moving){ ghost.dirty=false; raceGhostDraw(); } }
function raceGhostDraw(){ const P=ghost.cur, n=P.length; if(!n) return; ghost.head.position.copy(P[0]);
  if(n>1){ const dx=P[0].x-P[1].x, dz=P[0].z-P[1].z; if(dx*dx+dz*dz>.01) ghost.head.rotation.y=Math.atan2(dx,dz); }
  // the body: one tube per unbroken run (a tunnel splits it), coloured like the friend's worm
  const chains=[]; let cur=[0]; for(let i=1;i<n;i++){ if(P[i].distanceTo(P[i-1])>1.3){ chains.push(cur); cur=[i]; } else cur.push(i); } chains.push(cur);
  let ti=0;
  for(const ch of chains){ if(ch.length<2) continue; const pts=ch.map(i=>i===0?P[i].clone().setY(P[i].y-.08):P[i]);
    // the tail end tapers to a soft point a little past the last segment, like the real worm's
    const tail=ch[ch.length-1]===n-1, a=P[n-1], b=P[n-2], dl=Math.hypot(a.x-b.x,a.z-b.z)||1;
    if(tail) pts.push(new THREE.Vector3(a.x+(a.x-b.x)/dl*TIP_LEN,a.y-segR(n-1,n)*(1-TIP_K),a.z+(a.z-b.z)/dl*TIP_LEN));
    const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'), S=(pts.length-1)*6+1, sp=[], rr=[], cc=[], gs=[], last=ch.length-1;
    for(let j=0;j<S;j++){ const u=j/(S-1), fi=u*(pts.length-1); sp.push(curve.getPoint(u));
      if(fi<=last){ const g=ch[0]+fi, i0=Math.min(Math.floor(g),n-1), f=g-i0; rr.push(segR(i0,n)*(1-f)+segR(Math.min(i0+1,n-1),n)*f); cc.push(colorAt(g,n,ghost.pat,ghost.base)); gs.push(g); }
      else { const t=fi-last; rr.push(Math.max(.012,segR(n-1,n)*(1-(1-TIP_K)*t*t)*(1-.9*Math.pow(t,6)))); cc.push(colorAt(n-1,n,ghost.pat,ghost.base)); gs.push(n-1+t*.3); } }
    if(!ghost.tubes[ti]){ const body=new THREE.Mesh(new THREE.BufferGeometry(),ghost.bodyMat), line=new THREE.Mesh(new THREE.BufferGeometry(),ghost.lineG);
      body.renderOrder=line.renderOrder=2; ghost.g.add(body,line); ghost.tubes[ti]={body,line}; }
    const tb=ghost.tubes[ti++]; tb.body.visible=tb.line.visible=true; tubeGeo(tb.body.geometry,sp,rr,cc,0,gs); tubeGeo(tb.line.geometry,sp,rr.map(r=>r+.03),null,0); }
  for(let i=ti;i<ghost.tubes.length;i++) ghost.tubes[i].body.visible=ghost.tubes[i].line.visible=false; }
