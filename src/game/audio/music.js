// ---------- music: a slow generated tune that follows the time of day and the rain ----------
// music starts off for first-time visitors; players from before that change keep it on unless they turned it off
let musicOn=false, musicVol=.7; { const m=store.get('squirm-music'), v=parseFloat(store.get('squirm-music-vol')); musicOn=m===null?store.get('squirm-progress')!==null:m==='1'; if(v>=0&&v<=1) musicVol=v; }
let mBus=null, mLp=null, mNext=0, mStep=0, mDeg=2;
const SCALES={major:[0,2,4,7,9],minor:[0,3,5,7,10]};
const PROG={major:[[0,4,7],[-3,0,4],[5,9,12],[7,11,14]],minor:[[0,3,7],[-4,0,3],[3,7,10],[-2,2,5]]};
// arp: how many eighth notes of the bar carry a soft arpeggio note (8 = all, 4 = every other)
const MOODS={morning:{root:62,scale:'major',bpm:76,bright:2600,prob:.75,wave:'sine',arp:8},day:{root:60,scale:'major',bpm:80,bright:3000,prob:.7,wave:'triangle',arp:8},
  evening:{root:57,scale:'major',bpm:68,bright:1900,prob:.6,wave:'triangle',arp:8},night:{root:57,scale:'minor',bpm:60,bright:1400,prob:.5,wave:'sine',arp:4}};
const midiHz=n=>440*Math.pow(2,(n-69)/12);
function musicSetup(){ if(!ac||mBus) return; mBus=ac.createGain(); mBus.gain.value=0; mLp=ac.createBiquadFilter(); mLp.type='lowpass'; mLp.frequency.value=2600;
  const echo=ac.createDelay(1), fb=ac.createGain(), wet=ac.createGain(); echo.delayTime.value=.42; fb.gain.value=.3; wet.gain.value=.26;
  mBus.connect(mLp); mBus.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(mLp); mLp.connect(master); }
// a note with a smooth attack, a held body and a gentle release, so consecutive notes overlap instead of leaving gaps
function mNote(hz,t,attack,hold,release,vol,wave,detune){ const o=ac.createOscillator(), g=ac.createGain(); o.type=wave; o.frequency.value=hz; if(detune) o.detune.value=detune;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+attack); g.gain.setValueAtTime(vol,t+attack+hold); g.gain.linearRampToValueAtTime(0,t+attack+hold+release);
  o.connect(g); g.connect(mBus); o.start(t); o.stop(t+attack+hold+release+.05); }
function musicTick(){ if(!ac||!mBus) return; const want=musicOn&&!muted&&!document.hidden&&ac.state==='running';
  mBus.gain.setTargetAtTime(want?1.4*musicVol:0,ac.currentTime,.3); if(!want){ mNext=0; return; }
  const md=MOODS[todName]||MOODS.day, rain=!!(state&&state.raining), spb=60/(md.bpm*(rain?.85:1)), e8=spb/2, sc=SCALES[md.scale];
  mLp.frequency.setTargetAtTime(rain?md.bright*.6:md.bright,ac.currentTime,1);
  if(mNext<ac.currentTime) mNext=ac.currentTime+.15;
  while(mNext<ac.currentTime+.6){ const t=mNext, pos=mStep%8, chord=PROG[md.scale][Math.floor(mStep/8)%4];
    // pad: each bar's chord swells in and lingers into the next bar, two slightly detuned voices
    if(pos===0) chord.forEach(st=>{ mNote(midiHz(md.root-12+st),t,.9,spb*3.2,1.6,.014,'sine',-4); mNote(midiHz(md.root-12+st),t,.9,spb*3.2,1.6,.008,'triangle',5); });
    // bass on beats 1 and 3
    if(pos===0||pos===4) mNote(midiHz(md.root-24+chord[pos?2:0]-(pos?12:0)),t,.03,spb*1.4,.5,.04,'triangle');
    // a soft running arpeggio over the chord keeps the music flowing between melody notes
    if(pos%(8/md.arp)===0){ const up=[0,1,2,1,0,1,2,1][pos]; mNote(midiHz(md.root+chord[up]+(pos>=4&&up===0?12:0)),t,.02,e8*.6,e8*1.4,rain?.008:.012,'sine'); }
    // melody: on the beat, held for one or two beats, wandering through the scale
    if(pos%2===0&&Math.random()<md.prob*(rain?.65:1)){ mDeg=Math.max(0,Math.min(sc.length*2-1,mDeg+[-2,-1,-1,1,1,2][Math.floor(Math.random()*6)]));
      const semi=sc[mDeg%sc.length]+12*Math.floor(mDeg/sc.length), beats=Math.random()<.4?2:1; mNote(midiHz(md.root+semi),t,.04,spb*beats*.7,spb*.9,.05,md.wave); }
    mStep++; mNext+=e8; } }
setInterval(musicTick,200);
let hapticsOn=store.get('squirm-haptics')!=='0';
const HAPTIC={push:16,move:8,grow:[10,30,14],shrink:[14,30,10],key:[8,25,8,25,12],gate:22,flag:[12,40,16],portal:[10,30,24],crumble:28,bump:[14,30,14],stuck:[40,70,40],undo:6,
  tap:6,on:8,off:8,badge:[15,40,15,40,30],win:[30,60,30,60,90],ready:[10,40,10],slide:6,hedgeOpen:[12,30,12],hedgeClose:14,rainOn:[30,50,15],creak:[20,40,20,40,20],rainOff:[15,50,30]};
const iosHaptic=(()=>{ try{ const l=document.createElement('label'); l.setAttribute('aria-hidden','true'); l.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const i=document.createElement('input'); i.type='checkbox'; i.setAttribute('switch',''); i.tabIndex=-1; l.appendChild(i); document.body.appendChild(l); return l; }catch(e){ return null; } })();
// what the current press has already done (see the press handler under input), so it never doubles up
const fbNow={s:false,b:false};
function buzz(p){ if(p!=null) fbNow.b=true; if(!hapticsOn||p==null) return;
  try{ if(navigator.vibrate){ navigator.vibrate(p); return; }
    if(iosHaptic){ const n=Array.isArray(p)?Math.ceil(p.length/2):1; for(let i=0;i<n;i++) setTimeout(()=>iosHaptic.click(),i*110); } }catch(e){} }
let birdT=8;
let birdSong=0;
function ambient(dt){ birdT-=dt/1000; if(birdT>0) return; birdT=7+Math.random()*9; birdSong=.9; if(!ac||muted||!state||state.raining||document.hidden) return;
  const base=2200+Math.random()*900, n=2+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){ tone(base*(1+(i%2)*.12),.09,{vol:.025,slide:1.25,delay:i*.12}); }
  if(Math.random()<.4) for(let i=0;i<2;i++) tone(base*.8,.12,{vol:.02,slide:.85,delay:.6+i*.15}); }
const sfx=(k,...a)=>{ fbNow.s=true; try{ SFX[k](...a); }catch(e){} buzz(HAPTIC[k]); };

