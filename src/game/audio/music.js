// ---------- music: little garden songs, composed as you play ----------
// Every patch has its own song (seeded by the patch, so a replay brings its tune back); the home screen plays the
// Squirm theme. A song is 16 bars, A A B A', over cozy seventh-chord progressions, with a melody built from a motif
// that repeats and varies. Layers join as the patch goes on (musicWants): pad and melody, then bass and a soft
// arpeggio, then drums, and a sparkle once the burrow is ready; a dozing worm thins it to a lullaby. The time of
// day picks tempo and instruments (MOODS) and rain slows and darkens it. Every sound is synthesized here.
// music starts off for first-time visitors; players from before that change keep it on unless they turned it off
let musicOn=false, musicVol=.7; { const m=store.get('squirm-music'), v=parseFloat(store.get('squirm-music-vol'));
  musicOn=m===null?store.get('squirm-progress')!==null:m==='1'; if(v>=0&&v<=1) musicVol=v; }
let mBus=null, mGlue=null, mLp=null, mLayer=null, mNoise=null, mNext=0, mPos=0, mBar=0, song=null, songNext=null;
// tests and the offline renderer can pin the mood, rain, layers and song: {mood, rain, wants, key}
let mForce=null;
// the mix: how loud each layer sits, the melody on top, the drums soft underneath
const MIX={pad:4.1,lead:2.2,bass:1.2,arp:2,drums:.9,spark:2.9};
const midiHz=n=>440*Math.pow(2,(n-69)/12);
// chords as semitones above the key's root, all with sevenths (iv is the wistful borrowed minor four)
const CH={I:[0,4,7,11],ii:[2,5,9,12],iii:[4,7,11,14],IV:[5,9,12,16],V:[7,11,14,17],Vs:[7,12,14,17],vi:[9,12,16,19],iv:[5,8,12,15]};
const PROGS=[['I','vi','IV','V'],['IV','iii','ii','I'],['I','IV','vi','Vs'],['vi','IV','I','V'],['ii','V','I','vi'],['I','iii','IV','iv'],['IV','I','ii','Vs']];
// melody rhythms: which eighth notes of a bar start a note
const RHY=[[1,0,1,0,1,1,0,0],[1,0,0,1,0,0,1,0],[1,1,0,1,0,0,1,0],[1,0,1,1,0,1,0,0],[0,0,1,0,1,0,1,1],[1,0,0,0,1,0,1,0],[1,0,1,0,0,1,1,0]];
const MAJOR=[0,2,4,5,7,9,11];
// the Squirm theme for the home screen: one row per bar, a semitone above the root per eighth note, null holds
const THEME={prog:['I','vi','IV','V','I','vi','IV','V'],bars:[[4,null,7,null,9,7,4,null],[2,null,4,null,0,null,null,null],[0,null,4,null,5,4,0,null],
  [2,null,null,null,-1,null,2,null],[4,null,7,null,12,null,11,null],[9,null,7,null,4,null,null,null],[5,null,4,null,2,null,0,null],[2,null,null,null,0,null,null,null]]};
const MOODS={morning:{root:62,bpm:84,lead:'kalimba',drums:'shaker',bright:3400},day:{root:60,bpm:88,lead:'ep',drums:'kit',bright:3800},
  evening:{root:57,bpm:74,lead:'ep',drums:'brush',bright:2600},night:{root:55,bpm:64,lead:'box',drums:null,bright:2000}};
const hashStr=s=>{ let h=2166136261; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619); return h>>>0; };
const mRand=s=>()=>{ s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
function makeSong(key){ if(key==='home') return {key,theme:true,shift:0};
  const r=mRand(hashStr(key)), pick=a=>a[Math.floor(r()*a.length)], a=pick(PROGS), motif=()=>({rhy:pick(RHY),steps:[0,1,2,3,4,5,6,7].map(()=>pick([-2,-1,-1,1,1,2,0,3]))});
  return {key,a,b:pick(PROGS.filter(p=>p!==a)),ma:motif(),mb:motif(),shift:pick([0,2,-3,5,-2])}; }
// which song should play now: the theme at home, else one for the patch
function songKey(){ if(mForce&&mForce.key) return mForce.key; if(!state||!L||document.body.classList.contains('at-home')) return 'home';
  return mode==='garden'?'g:'+LEVELS[li].name:'e:'+(L.daily||L.seed||L.name||''); }
// how loud each layer should be: grows with the patch, thins when the worm dozes
function musicWants(){ if(mForce&&mForce.wants) return mForce.wants;
  if(songKey()==='home') return {pad:1,lead:1,bass:.8,arp:.5,drums:0,spark:0};
  if(state.status!=='play') return {pad:1,lead:.6,bass:.6,arp:.6,drums:0,spark:1};
  if(typeof lookPhase!=='undefined'&&lookPhase==='sleep') return {pad:1,lead:.55,bass:0,arp:0,drums:0,spark:0};
  const p=Math.min(1,state.moves/Math.max(1,curPar()));
  return {pad:1,lead:1,bass:p>.12?1:0,arp:p>.3?1:0,drums:p>.45?1:0,spark:wasReady?1:0}; }
// a small generated room: decaying, softened noise
function makeIR(sec){ const n=Math.floor(ac.sampleRate*sec), b=ac.createBuffer(2,n,ac.sampleRate);
  for(let c=0;c<2;c++){ const d=b.getChannelData(c); let lp=0; for(let i=0;i<n;i++){ lp+=(Math.random()*2-1-lp)*.3; d[i]=lp*Math.pow(1-i/n,3); } }
  return b; }
function musicSetup(){ if(!ac||mBus) return; mBus=ac.createGain(); mBus.gain.value=0; mLp=ac.createBiquadFilter(); mLp.type='lowpass'; mLp.frequency.value=3000;
  // a gentle glue compressor of its own rounds off plucks and kicks, so the master compressor doesn't pump on them
  const glue=mGlue=ac.createDynamicsCompressor(); glue.threshold.value=-34; glue.knee.value=12; glue.ratio.value=3.5; glue.attack.value=.008; glue.release.value=.25;
  // its automatic make-up gain is trimmed back so the music sits where it always has under the sound effects
  const trim=ac.createGain(); trim.gain.value=.42; mBus.connect(mLp); mLp.connect(glue); glue.connect(trim); trim.connect(master);
  const rev=ac.createConvolver(), send=ac.createGain(); rev.buffer=makeIR(2.6); send.gain.value=.42; mLp.connect(send); send.connect(rev); rev.connect(glue);
  mNoise=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); { const d=mNoise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  mLayer={}; const pan=(node,p)=>{ if(!ac.createStereoPanner) return node; const s=ac.createStereoPanner(); s.pan.value=p; node.connect(s); return s; };
  for(const [k,p] of [['pad',0],['lead',.12],['bass',0],['arp',-.3],['drums',.05],['spark',.35]]){ const g=ac.createGain(); g.gain.value=0; pan(g,p).connect(mBus); mLayer[k]=g; }
  // the pad breathes through its own slowly swaying filter
  const pf=ac.createBiquadFilter(); pf.type='lowpass'; pf.frequency.value=900; pf.Q.value=.6; pf.connect(mLayer.pad); mLayer.padIn=pf;
  const lfo=ac.createOscillator(), lg=ac.createGain(); lfo.frequency.value=.07; lg.gain.value=380; lfo.connect(lg); lg.connect(pf.frequency); lfo.start(); }
// ---------- instruments ----------
function mOsc(type,hz,t,end,dest,detune=0){ const o=ac.createOscillator(); o.type=type; o.frequency.value=hz; o.detune.value=detune; o.connect(dest); o.start(t); o.stop(end); return o; }
function mEnv(t,a,peak,dest){ const g=ac.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a); g.connect(dest); return g; }
// kalimba: a round tine with a short bright overtone
function kalimba(hz,t,vol,dest){ const g=mEnv(t,.004,vol,dest); g.gain.setTargetAtTime(0,t+.004,.42); mOsc('sine',hz,t,t+2,g);
  const g2=mEnv(t,.002,vol*.32,dest); g2.gain.setTargetAtTime(0,t+.002,.03); mOsc('sine',hz*5.95,t,t+.2,g2); }
// music box: a glassy bell with an octave and a high partial
function musicBox(hz,t,vol,dest){ const g=mEnv(t,.003,vol,dest); g.gain.setTargetAtTime(0,t+.003,.6); mOsc('sine',hz,t,t+2.6,g);
  const g2=mEnv(t,.003,vol*.3,dest); g2.gain.setTargetAtTime(0,t+.003,.35); mOsc('sine',hz*2,t,t+1.6,g2);
  const g3=mEnv(t,.002,vol*.12,dest); g3.gain.setTargetAtTime(0,t+.002,.08); mOsc('sine',hz*4.2,t,t+.4,g3); }
// electric piano: two-operator FM whose brightness fades as the note rings
function ePiano(hz,t,dur,vol,dest){ const g=mEnv(t,.006,vol,dest); g.gain.setTargetAtTime(vol*.4,t+.006,.35); g.gain.setTargetAtTime(0,t+dur,.28);
  const end=t+dur+1.4, c=mOsc('sine',hz,t,end,g), mg=ac.createGain(); mg.gain.setValueAtTime(hz*1.9,t); mg.gain.setTargetAtTime(hz*.22,t,.3);
  mOsc('sine',hz,t,end,mg); mg.connect(c.frequency); }
function lead(kind,hz,t,dur,vol,dest){ if(kind==='kalimba') kalimba(hz,t,vol*1.1,dest); else if(kind==='box') musicBox(hz*2,t,vol*.8,dest); else ePiano(hz,t,dur,vol,dest); }
// pad: two detuned saws per chord note, swelling in over the bar and lingering into the next
function pad(hz,t,dur,vol){ const g=mEnv(t,1.1,vol,mLayer.padIn); g.gain.setValueAtTime(vol,t+dur); g.gain.setTargetAtTime(0,t+dur,.6);
  mOsc('sawtooth',hz,t,t+dur+3,g,-7); mOsc('sawtooth',hz,t,t+dur+3,g,7); }
// plucked bass: a sine body with a little triangle edge
function bass(hz,t,dur,vol){ const g=mEnv(t,.01,vol,mLayer.bass); g.gain.setTargetAtTime(vol*.5,t+.01,.25); g.gain.setTargetAtTime(0,t+dur,.12);
  mOsc('sine',hz,t,t+dur+.8,g); const g2=mEnv(t,.005,vol*.25,mLayer.bass); g2.gain.setTargetAtTime(0,t+.005,.08); mOsc('triangle',hz*2,t,t+.4,g2); }
function mHit(t,vol,type,freq,q,decay,attack=.002){ const s=ac.createBufferSource(); s.buffer=mNoise; const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
  const g=mEnv(t,attack,vol,mLayer.drums); g.gain.setTargetAtTime(0,t+attack,decay); s.connect(f); f.connect(g); s.start(t,Math.random()*.5); s.stop(t+decay*8+attack); }
function kick(t,vol){ const g=mEnv(t,.003,vol,mLayer.drums); g.gain.setTargetAtTime(0,t+.003,.09); const o=mOsc('sine',130,t,t+.6,g); o.frequency.setTargetAtTime(46,t,.04); }
function drums(kind,pos,t,vol,rain){ if(!kind) return; if(rain) kind='brush';
  if(kind==='kit'){ if(pos===0||pos===5) kick(t,vol*.4); if(pos===2||pos===6){ mHit(t,vol*.22,'bandpass',1900,2.5,.035); const g=mEnv(t,.001,vol*.08,mLayer.drums);
      g.gain.setTargetAtTime(0,t,.02); mOsc('triangle',820,t,t+.15,g); } mHit(t,vol*(pos%2?.05:.08),'highpass',7500,.7,.012); }
  else if(kind==='shaker'){ if(pos===0) kick(t,vol*.4); mHit(t,vol*(pos%2?.1:.05),'bandpass',6200,.8,.03,.015); }
  else { if(pos===0) kick(t,vol*.3); if(pos===2||pos===6) mHit(t,vol*.13,'bandpass',3200,.6,.09,.05); else if(pos%2) mHit(t,vol*.035,'highpass',6000,.7,.02,.01); } }
// ---------- the song ----------
// the melody note (semitones above the root) for each eighth of bar b, or null for a rest or hold
function melodyBar(s,b,chord){ if(s.theme){ const row=THEME.bars[b%8]; return row.map(v=>v==null?null:v); }
  const sec=Math.floor(b/4)%4, inB=sec===2, m=inB?s.mb:s.ma, cad=b%8===7, out=Array(8).fill(null);
  // start each bar on the chord's third, a step higher in the last A
  let deg=MAJOR.indexOf(chord[1]%12); if(deg<0) deg=2; deg+=7+(sec===3?1:0);
  if(cad){ out[0]=chord[0]+12; if(b%16!==15) out[6]=chord[2]+(chord[2]<12?12:0); return out; }
  m.rhy.forEach((on,i)=>{ if(!on) return; deg=Math.max(5,Math.min(15,deg+m.steps[i])); let st=MAJOR[deg%7]+12*Math.floor(deg/7);
    // strong beats land on a chord tone
    if(i===0||i===4){ let best=st, bd=99; for(const c of chord) for(const o of [0,12,24]){ const d=Math.abs(c+o-st); if(d<bd){ bd=d; best=c+o; } } st=best; }
    out[i]=st; });
  return out; }
function musicSchedule(until){ const md=MOODS[(mForce&&mForce.mood)||todName]||MOODS.day, rain=mForce?!!mForce.rain:!!(state&&state.raining);
  const spb=60/(md.bpm*(rain?.88:1)), e8=spb/2, want=musicWants();
  for(const k in want) mLayer[k].gain.setTargetAtTime(want[k]*MIX[k]*(k==='drums'&&rain?.7:1),ac.currentTime,1.2);
  mLp.frequency.setTargetAtTime(rain?md.bright*.55:md.bright,ac.currentTime,1);
  const key=songKey(); if(!song||(song.key!==key&&(!songNext||songNext.key!==key))) songNext=makeSong(key);
  // a new song starts at the next bar line, so a patch change never cuts a note in half
  if(!song){ song=songNext; songNext=null; mBar=0; mPos=0; }
  while(mNext<until){ if(mPos===0&&songNext){ song=songNext; songNext=null; mBar=0; }
    const s=song, root=md.root+s.shift, prog=s.theme?THEME.prog:(Math.floor(mBar/4)%4===2?s.b:s.a), chord=CH[prog[mBar%(s.theme?8:4)]];
    const swing=mPos%2?e8*.12:0, t=mNext+swing;
    if(mPos===0){ const bar=spb*4; chord.forEach((st,i)=>pad(midiHz(root-12+st),mNext,bar,i?.011:.014));
      const mel=melodyBar(s,mBar,chord); s.cur=mel; }
    // bass: the root on one, then the fifth, and a step towards the next chord at the end of the bar
    if(mPos===0) bass(midiHz(root-24+chord[0]),t,spb*1.6,.2); else if(mPos===4) bass(midiHz(root-24+chord[2]-(chord[2]>=12?12:0)),t,spb*1.2,.15);
      else if(mPos===7&&mBar%2) bass(midiHz(root-24+chord[0]+2),t,e8*.8,.1);
    // a soft arpeggio over the chord, up and down
    { const idx=[0,1,2,3,2,1,2,1][mPos]; kalimba(midiHz(root+chord[idx]),t,rain?.03:.045,mLayer.arp); }
    const n=s.cur[mPos]; if(n!=null&&!(rain&&!s.theme&&Math.random()<.25)){ let len=1; while(mPos+len<8&&s.cur[mPos+len]==null&&len<4) len++;
      lead(md.lead,midiHz(root+n),t,e8*len*.9,.11,mLayer.lead); }
    drums(md.drums,mPos,t,1,rain);
    // the sparkle: high chord tones scattered over the beat once the burrow is ready
    if(mPos%2===0&&Math.random()<.5) musicBox(midiHz(root+24+chord[Math.floor(Math.random()*4)]),t+e8*(Math.random()<.5?0:.5),.035,mLayer.spark);
    mNext+=e8; mPos=(mPos+1)%8; if(mPos===0) mBar=(mBar+1)%16; } }
function musicTick(){ if(!ac||!mBus) return; const want=musicOn&&!muted&&!document.hidden&&ac.state==='running';
  mBus.gain.setTargetAtTime(want?.75*musicVol:0,ac.currentTime,.3); if(!want){ mNext=0; return; }
  if(mNext<ac.currentTime){ mNext=ac.currentTime+.15; mPos=0; }
  musicSchedule(ac.currentTime+.7); }
setInterval(musicTick,200);
// ---------- haptics ----------
// Vibration speaks a small rhythm language, one pattern per effect (ms on, off, on, ...): light ticks for crawling,
// rising pulses for growing and falling ones for shrinking, a sparkle for keys and pollen, a thunk for gates and
// pushes, a speeding swirl for a turnaround, a fanfare for a win. Ambient sounds (a yawn, a snail) stay quiet.
// 'squirm-haptics': '0' off, 'gentle' (shorter, softer pulses), anything else full.
let hapticLvl=(v=>v==='0'?0:v==='gentle'?1:2)(store.get('squirm-haptics'));
const HAPTIC={move:6,slide:[4,22,4],push:[18,26,8],grow:[8,26,12,26,18],shrink:[18,26,12,26,8],key:[6,18,6,18,6,18,14],
  gate:[26,40,10],flag:[10,50,22],portal:[6,16,10,16,14,16,22],crumble:[8,12,8,12,8,12,20],bump:[14,40,10],stuck:[40,80,40],
  undo:5,tap:5,on:[6,30,10],off:[10,30,6],badge:[12,40,12,40,40],win:[20,50,20,50,20,90,60],ready:[8,60,16],
  turn:[6,24,8,20,10,16,14,12,22],hedgeOpen:[10,30,16],hedgeClose:[16,30,10],rainOn:[4,40,4,40,4,40,4],rainOff:[4,60,4],
  creak:[20,40,20,40,20],pollen:[4,16,4,16,4,16,8],bloom:[8,30,16],bud:12,dig:[18,20,10,20,6],shutter:[10,30,6]};
const iosHaptic=(()=>{ try{ const l=document.createElement('label'); l.setAttribute('aria-hidden','true'); l.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const i=document.createElement('input'); i.type='checkbox'; i.setAttribute('switch',''); i.tabIndex=-1; l.appendChild(i); document.body.appendChild(l);
    return l; }catch(e){ return null; } })();
// what the current press has already done (see the press handler under input), so it never doubles up
const fbNow={s:false,b:false};
function buzz(p){ if(p!=null) fbNow.b=true; if(!hapticLvl||p==null) return;
  const pat=(Array.isArray(p)?p:[p]).map((v,i)=>i%2||hapticLvl>1?v:Math.max(3,Math.round(v*.55)));
  try{ if(navigator.vibrate){ navigator.vibrate(pat); return; }
    // iOS has no vibrate, only a fixed tick from a switch: one tick at the start of each pulse, on the pattern's own timing
    if(iosHaptic){ let t=0; pat.forEach((v,i)=>{ if(!(i%2)&&(hapticLvl>1||v>=6||i===0)) setTimeout(()=>iosHaptic.click(),t); t+=v; }); } }catch(e){} }
function setHaptics(lvl){ hapticLvl=lvl; store.set('squirm-haptics',['0','gentle','1'][lvl]); }
// ---------- birdsong ----------
let birdT=8;
let birdSong=0;
function ambient(dt){ birdT-=dt/1000; if(birdT>0) return; birdT=7+Math.random()*9; birdSong=.9; if(!ac||muted||!state||state.raining||document.hidden) return;
  const base=2200+Math.random()*900, n=2+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){ tone(base*(1+(i%2)*.12),.09,{vol:.025,slide:1.25,delay:i*.12}); }
  if(Math.random()<.4) for(let i=0;i<2;i++) tone(base*.8,.12,{vol:.02,slide:.85,delay:.6+i*.15}); }
const sfx=(k,...a)=>{ fbNow.s=true; try{ SFX[k](...a); }catch(e){} buzz(HAPTIC[k]); };

