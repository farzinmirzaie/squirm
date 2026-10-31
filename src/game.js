(function(){
// Squirm's game code: rendering, input, UI, audio, the endless generator and the hint solver, in one IIFE
// that tools/build.js joins into index.html after logic.js and levels.js. Sections, in order (each starts
// with a "// ---------- name" line):
//   saved data (store) · DOM helpers · three setup (renderer, toon materials, outlines) · audio · music
//   state · geometry helpers · garden scenery · scenery batching · little garden visitors
//   tiles and items · snails · beetles · weather · worm (body, head, wardrobe, idle acts) · tweens · moves
//   hints (solveFrom) · UI feedback · resume · sticker icons · HUD · toasts and dialogs
//   endless meadow (genCandidate, analyzeCapped, generateEndless; daily patch) · native back button
//   home · home tabs · the whole garden (finale) · settings · badges · secret reset · home worm
//   first time you meet a mechanic · first-time tutorial · levels (startLevel, garden map) · camera
//   input · buttons · loop · unexpected errors · anonymous stats · offline play and install · daily reminder · boot
// Text other files rely on: tools/load-generator.js runs everything from the endless meadow divider up
// to the todayKey definition (plus the one-line rng) in Node, so that stretch must not touch the page
// beyond $(), and neither marker may appear earlier in this file; tools/build.js --debug inserts
// window.__squirm just before the final closing of this IIFE.
// Inside this IIFE `history` is the undo stack; the browser's is always window.history.

const motionQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let reduceMotion = !!(motionQuery && motionQuery.matches);
if(motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change',e=>{ reduceMotion=e.matches; });
// ---------- saved data ----------
// every key starts with squirm- and must never be renamed; storage can be missing or full, so none of these ever throw
const store={
  get:k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} },
  del:k=>{ try{ localStorage.removeItem(k); }catch(e){} },
  json:k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } },
  keys:()=>{ try{ return Object.keys(localStorage).filter(k=>k.startsWith('squirm-')); }catch(e){ return []; } }
};
const C = {
  turf1:0xB9E49E, turf2:0xAADB8E, dry:0xEBD59C, soil:0x9A6A4C, soilDark:0x7E543B, wood:0xD29A62, lawn:0x8CC673,
  head:0xFFB3C8, riverWater:0x8CCFEA, plank:0xD9A56E, plankDark:0xB98352, leafBig:0x7CC95F, water:0x9ED6EF, mud:0x8A5E43, cloud:0xFFFFFF, rainCloud:0xAEBBD2, eye:0xFFFFFF, pupil:0x3B2A22, cheek:0xFF6F96,
  peach:0xFFA27C, leaf:0x6CC97A, cap:0xB79CF2, stem:0xFFF1DE, key:0xF7C64F, gateWood:0xC88A55,
  flag:0xF27DA2, flagDone:0x79C95F, pole:0xB98A62,
  mushRed:0xF07A6A, topHat:0x4E3F5C, rainHat:0xFFD04A, brolly:0x9FD2F2, bowDark:0xE36A8C, bowKnot:0xC24E72,
  straw:0xF3D18A, strawDark:0xD9B166, acornCap:0x8A5A36, acornNut:0xC98E52, partyA:0x9FD2F2, partyB:0xFFF1A8, crown:0xF5C14E, beret:0xB79CF2, beanie:0x8FD0B0, beanieRib:0x6FB894, beetle:0x7C8CF0, beetleDark:0x5566C8, beetleHead:0x3E3F84, beetleSpot:0xB5C0FA, beetleLeg:0x3A2F5E, sunPetal:0xFFD34D, sunCore:0x7A4E2E, shellHat:0xC9A0E6, shellSpiral:0xA67CCB, pumpkin:0xF7A05A, pumpkinRib:0xE0843F,
  pollenP:0xFF7A6B, pollenPLight:0xFFC6BC, pollenPDark:0xC94A43, pollenY:0xFFC63A, pollenYLight:0xFFE9A6, pollenYDark:0xD08A1C, pollenU:0x63A9F2, pollenULight:0xC4E2FF, pollenUDark:0x3E73C2,
  bandana:0xE4574C, bandanaDot:0xFFF1DE, teacup:0x9FD2F2, teacupDot:0xFFFBF2, tea:0xB8794A, twig:0x9A6B45, egg:0xBFE6F7, eggDot:0x7FA8C2,
  patch:0x3B2A22, sweat:0xFFFBF2, sweatStripe:0xF27DA2, ladybug:0xE4574C, daisy:0xFFFBF2,
  explorer:0xDCC28C, explorerBand:0x8A5A36,
  miner:0xF5A33A, minerDark:0xD9822A, lamp:0xFFF6C8, gnome:0xE4574C, goggle:0xA9703F, lensBlue:0xBFE6F7,
  softSoil:0xB07850, softRidge:0xCB9468, softClod:0x8A5A3A,
  wetLeaf:0x8EE0B4, leafVein:0x5DBA8A, dew:0xEAF8FF, hedge:0x5FA64F, hedgeDark:0x4E8F40, petalB:0xF7A8C4,
  burrow:0x3A2A22, mound:0xB07B57, ready:0x8EDB72, line:0x5B4436,
  chef:0xFFFBF2, wizard:0x8E7BE0, cowboy:0xC98E52, cowboyBand:0x8A5A36, phones:0xF7A8C4, phonesBand:0x6E5F86,
  frame:0x4A3C52, lensDark:0x3E3548, heartFrame:0xF27DA2, starFrame:0xF5C14E, monocle:0xE0B04A, tash:0x6B4A35, tashLight:0xB08560,
  portal:{ '1':0x7FCFEA, '2':0xC69CF7, '3':0xFFB877, '4':0x9BE39B }
};
// ---------- DOM helpers ----------
const $=id=>document.getElementById(id);
const qa=(root,sel)=>[...root.querySelectorAll(sel)];
// ---------- three setup ----------
const canvas=document.getElementById('c'), stage=document.getElementById('stage');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true}); }catch(e){ document.getElementById('noGL').classList.add('show'); return; }
// quality 2 = full, 1 = lighter shadows, 0 = also lower resolution; drops automatically on slow devices
let quality=2; { const q=parseInt(store.get('squirm-quality'),10); if(q>=0&&q<=2) quality=q; }
// Settings > Graphics: 'auto' lets watchSpeed adapt, 'saver' pins the lowest quality, 'best' the highest
let gfx=store.get('squirm-gfx')||'auto'; if(gfx==='saver') quality=0; else if(gfx==='best') quality=2;
const pixelRatio=()=>Math.min(window.devicePixelRatio||1,quality===2?2.5:quality===1?1.75:1.25);
renderer.setPixelRatio(pixelRatio());
renderer.setClearColor(C.lawn);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,0.1,300);
scene.add(new THREE.HemisphereLight(0xfffaf0,0xb7d79a,0.38));
scene.add(new THREE.AmbientLight(0xfff4e2,0.2));
const sun=new THREE.DirectionalLight(0xfff1dc,0.55);
sun.position.set(-4,10,5); sun.castShadow=true; sun.shadow.mapSize.setScalar(quality===2?2048:1024);
sun.shadow.radius=4; sun.shadow.bias=-0.0012; scene.add(sun); scene.add(sun.target);
const garden=new THREE.Group(), board=new THREE.Group(), wormG=new THREE.Group(), fx=new THREE.Group(), flyers=new THREE.Group();
scene.add(garden,board,wormG,fx,flyers);

// soft cartoon shading: a smooth ramp instead of hard bands
const gradTex=(()=>{ const d=new Uint8Array([175,175,180,255, 205,205,208,255, 232,232,232,255, 255,255,255,255]);
  const t=new THREE.DataTexture(d,4,1,THREE.RGBAFormat); t.minFilter=t.magFilter=THREE.LinearFilter; t.generateMipmaps=false; t.needsUpdate=true; return t; })();
const toon=(color,o={})=>new THREE.MeshToonMaterial(Object.assign({color,gradientMap:gradTex},o));
const MC={}; const m=k=>MC[k]||(MC[k]=toon(C[k]));
const lineMat=new THREE.MeshBasicMaterial({color:C.line,side:THREE.BackSide});
// flat shapes (a flag's cloth) have no inside for an inverted hull, so their outline is a slightly larger copy pushed back in depth
const flatLineMat=new THREE.MeshBasicMaterial({color:C.line,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2});
function outline(mesh,t=.028,r){ if(!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  const rad=r||mesh.geometry.boundingSphere.radius; const o=new THREE.Mesh(mesh.geometry,lineMat); o.scale.setScalar(1+t/rad); mesh.add(o); return o; }
function outlineBox(mesh,t,w,h,d){ const o=new THREE.Mesh(mesh.geometry,lineMat); o.scale.set(1+2*t/w,1+2*t/h,1+2*t/d); mesh.add(o); return o; }
// sphere geometries are cached by size; radii are rounded so random scenery sizes don't grow the cache forever
const GC={}; const sph=(r,ws=28,hs=20)=>{ r=Math.round(r*100)/100; const k=r+'_'+ws+'_'+hs; return GC[k]||(GC[k]=new THREE.SphereGeometry(r,ws,hs)); };

// ---------- audio ----------
const AC=window.AudioContext||window.webkitAudioContext; let ac=null, master=null, muted=store.get('squirm-muted')==='1';
function ensureAudio(){ if(!AC) return; if(!ac){ ac=new AC(); master=ac.createGain(); master.gain.value=.55;
    const comp=ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination); musicSetup(); }
  if(ac.state==='suspended') ac.resume(); }
function tone(freq,dur,o={}){ if(!ac||muted) return; const t=ac.currentTime+(o.delay||0);
  const osc=ac.createOscillator(), g=ac.createGain(); osc.type=o.type||'sine'; osc.frequency.setValueAtTime(freq,t);
  if(o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*o.slide),t+dur);
  const v=o.vol==null?.2:o.vol; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+(o.attack||.008)); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  osc.connect(g); g.connect(master); osc.start(t); osc.stop(t+dur+.05); }
let noiseBuf=null;
function noise(dur,o={}){ if(!ac||muted) return; const t=ac.currentTime+(o.delay||0);
  if(!noiseBuf){ noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  const s=ac.createBufferSource(); s.buffer=noiseBuf; const f=ac.createBiquadFilter(); f.type=o.ftype||'bandpass'; f.Q.value=o.q||1;
  f.frequency.setValueAtTime(o.freq||800,t); if(o.slide) f.frequency.exponentialRampToValueAtTime(Math.max(40,(o.freq||800)*o.slide),t+dur);
  const g=ac.createGain(); const v=o.vol||.2; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+dur+.05); }
const SFX={
  move:(n)=>{ const b=n%2?300:340; tone(b,.11,{type:'triangle',vol:.15,slide:1.5}); noise(.06,{freq:1800,vol:.025,q:2}); },
  grow:()=>{ tone(440,.16,{type:'triangle',vol:.18,slide:1.8}); tone(660,.18,{vol:.12,slide:1.5,delay:.08}); },
  shrink:()=>{ tone(700,.2,{type:'triangle',vol:.16,slide:.45}); tone(520,.16,{vol:.08,slide:.5,delay:.07}); },
  key:()=>{ [1046,1318,1568,2093].forEach((f,i)=>tone(f,.18,{vol:.1,delay:i*.055})); },
  gate:()=>{ noise(.25,{freq:500,vol:.16,q:1.5,slide:.6}); tone(220,.25,{type:'triangle',vol:.1,slide:.8}); tone(784,.25,{vol:.07,delay:.15}); },
  flag:()=>{ tone(1046,.35,{vol:.13}); tone(1568,.4,{vol:.09,delay:.07}); },
  portal:()=>{ tone(260,.38,{vol:.13,slide:4}); noise(.38,{freq:300,slide:8,vol:.1,q:3}); },
  crumble:()=>{ noise(.4,{freq:240,ftype:'lowpass',vol:.28,slide:.5}); tone(110,.25,{type:'triangle',vol:.08,slide:.6}); },
  creak:()=>{ noise(.5,{freq:300,q:6,vol:.12,slide:1.6}); tone(140,.4,{type:'sawtooth',vol:.03,slide:1.3}); tone(523,.2,{vol:.06,delay:.42}); },
  rainOn:()=>{ [784,659,523].forEach((f,i)=>tone(f,.3,{vol:.08,delay:i*.09})); noise(.8,{freq:1500,ftype:'lowpass',vol:.06}); },
  rainOff:()=>{ [523,659,784,1046].forEach((f,i)=>tone(f,.25,{vol:.08,delay:i*.07})); },
  bump:()=>{ tone(180,.09,{type:'triangle',vol:.12,slide:.8}); },
  stuck:()=>{ tone(392,.18,{type:'triangle',vol:.1}); tone(330,.3,{type:'triangle',vol:.1,delay:.16}); },
  badge:()=>{ [659,784,988,1318].forEach((f,i)=>tone(f,.22,{type:'triangle',vol:.09,delay:i*.08})); tone(1568,.5,{vol:.06,delay:.34}); },
  undo:()=>{ tone(520,.09,{type:'triangle',vol:.1,slide:.7}); },
  shutter:()=>{ noise(.05,{freq:3200,vol:.14,q:.7}); tone(1900,.035,{type:'square',vol:.025,delay:.01}); noise(.07,{freq:1300,vol:.11,q:1,delay:.08}); },
  tap:()=>{ tone(880,.05,{type:'triangle',vol:.07,slide:1.2}); },
  // toggles: a little rise for on, a little fall for off
  on:()=>{ tone(700,.06,{type:'triangle',vol:.07,slide:1.3}); tone(1050,.09,{vol:.05,delay:.05}); },
  off:()=>{ tone(760,.06,{type:'triangle',vol:.06,slide:.75}); tone(520,.09,{vol:.04,delay:.05}); },
  win:()=>{ [523,659,784,1046].forEach((f,i)=>tone(f,.28,{type:'triangle',vol:.14,delay:i*.11})); tone(1318,.6,{vol:.1,delay:.46}); tone(1568,.7,{vol:.08,delay:.5}); },
  ready:()=>{ tone(880,.15,{vol:.08}); tone(1320,.25,{vol:.07,delay:.08}); },
  slide:()=>{ noise(.16,{freq:2600,slide:.5,vol:.05,q:1.5}); tone(620,.14,{type:'sine',vol:.05,slide:1.4}); },
  hedgeOpen:()=>{ noise(.3,{freq:900,vol:.09,q:1.2,slide:.5}); tone(392,.2,{type:'triangle',vol:.06,slide:.8}); },
  hedgeClose:()=>{ noise(.26,{freq:500,vol:.08,q:1.2,slide:1.6}); tone(294,.18,{type:'triangle',vol:.05,slide:1.2}); },
  yawn:()=>{ tone(330,.7,{type:'sine',vol:.05,slide:.6,attack:.25}); noise(.6,{freq:500,ftype:'lowpass',vol:.03,slide:.7}); },
  push:()=>{ noise(.22,{freq:420,ftype:'lowpass',vol:.12,slide:.6}); tone(196,.16,{type:'triangle',vol:.09,slide:.8}); tone(392,.12,{type:'sine',vol:.05,slide:1.3,delay:.1}); },
  // pollen: a soft puff with a shimmer; petal gates bloom open with a rising pluck and fold shut with a falling one
  pollen:()=>{ noise(.22,{freq:2400,vol:.05,q:.8,slide:.6}); [1175,1480,1760].forEach((f,i)=>tone(f,.16,{vol:.05,delay:.04+i*.05})); },
  bloom:()=>{ tone(523,.14,{type:'triangle',vol:.08,slide:1.5}); tone(784,.22,{vol:.07,delay:.07}); noise(.2,{freq:1600,vol:.04,q:1.5,slide:.6}); },
  bud:()=>{ tone(659,.14,{type:'triangle',vol:.06,slide:.6}); noise(.16,{freq:900,vol:.04,q:1.5,slide:1.4}); },
  // soft soil: an earthy shuffle as the worm burrows under itself
  dig:()=>{ noise(.32,{freq:300,ftype:'lowpass',vol:.2,slide:.6}); tone(150,.2,{type:'triangle',vol:.07,slide:.7}); tone(440,.12,{vol:.04,delay:.18,slide:1.3}); },
  snail:()=>{ tone(330,.14,{type:'sine',vol:.05,slide:.75}); tone(250,.12,{type:'sine',vol:.035,slide:.8,delay:.08}); },
};
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

// ---------- state ----------
let mode='garden', endlessDiff='medium', li=0, L=null, state=null, history=[], cells=[], segMeshes=[];
let animating=0, queue=[], headDir=[1,0], idleT=0, lastMoveT=0, wasReady=false;
let progress={v:2,best:{},stars:{}};
{ const p=store.json('squirm-progress'); if(p&&p.best) progress=Object.assign(progress,p); }
const isCleared=i=>progress.best[LEVELS[i].name]!=null;
const isUnlocked=i=>i===0||isCleared(i)||isCleared(i-1);
function currentGardenIndex(){ const n=store.get('squirm-current-name'), i=LEVELS.findIndex(l=>l.name===n); return i>=0&&isUnlocked(i)?i:0; }
progress.endless=progress.endless||{}; ['easy','medium','hard'].forEach(d=>{ progress.endless[d]=Object.assign({cleared:0,streak:0,best:0,stars:0},progress.endless[d]||{}); });
let endlessOpts={flags:true,fruit:true,keys:true,portals:false,dry:true,rain:false,rivers:false};
{ const o=store.json('squirm-endless-opts'); if(o){ Object.assign(endlessOpts,o.opts||{}); if(o.diff) endlessDiff=o.diff; } }
const curPar=()=> L.par;
function askPersist(){ try{ const st=navigator.storage; if(st&&st.persist) st.persisted().then(p=>p||st.persist()).catch(()=>{}); }catch(e){} }
const save=()=>{ store.set('squirm-progress',JSON.stringify(progress)); };
function wp(x,y,yy=0){ return new THREE.Vector3(x-(state.w-1)/2, yy, y-(state.h-1)/2); }
function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// ---------- geometry helpers ----------
// a texture drawn once on a fresh canvas; rep>0 makes it tile (rep times across a face)
function canvasTex(w,h,draw,rep){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; draw(cv.getContext('2d'));
  const t=new THREE.CanvasTexture(cv); if(rep){ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rep,rep); } return t; }
function rrShape(w,d,r){ const s=new THREE.Shape(), x=-w/2, y=-d/2;
  s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+d-r); s.quadraticCurveTo(x+w,y+d,x+w-r,y+d);
  s.lineTo(x+r,y+d); s.quadraticCurveTo(x,y+d,x,y+d-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s; }
function slab(w,d,r,h,b){ const g=new THREE.ExtrudeGeometry(rrShape(w-2*b,d-2*b,r),{depth:Math.max(.01,h-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:5,curveSegments:8});
  g.rotateX(-Math.PI/2); g.center(); g.computeVertexNormals(); return g; }
const TURF=slab(.94,.94,.16,.3,.08), HEDGE=slab(.8,.8,.12,.5,.06);
const turfTex=canvasTex(256,256,g=>{ g.fillStyle='#fff'; g.fillRect(0,0,256,256);
  for(let i=0;i<1040;i++){ const x=Math.random()*256,y=Math.random()*256; g.fillStyle=Math.random()<.5?'rgba(80,140,60,.16)':'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x,y,1.2+Math.random()*1.6,3+Math.random()*3,Math.random()*3,0,Math.PI*2); g.fill(); } },1.6);
MC.turf1=toon(C.turf1,{map:turfTex}); MC.turf2=toon(C.turf2,{map:turfTex});
const crackTex=canvasTex(128,128,g=>{
  g.strokeStyle='rgba(150,110,70,.85)'; g.lineWidth=5; g.lineCap='round'; g.lineJoin='round';
  g.beginPath(); g.moveTo(18,36); g.lineTo(50,56); g.lineTo(62,90); g.lineTo(98,108); g.moveTo(50,56); g.lineTo(90,42); g.lineTo(110,22); g.moveTo(62,90); g.lineTo(30,106); g.stroke(); });
const swirlTex=canvasTex(128,128,g=>{
  g.translate(64,64); g.strokeStyle='rgba(255,255,255,.95)'; g.lineWidth=7; g.lineCap='round';
  for(let a=0;a<3;a++){ g.beginPath(); for(let t=0;t<1;t+=.02){ const r=6+t*52, an=a*2.094+t*4.2; const px=Math.cos(an)*r, py=Math.sin(an)*r; t?g.lineTo(px,py):g.moveTo(px,py);} g.stroke(); } });
const lawnTex=canvasTex(64,8,g=>{
  g.fillStyle='#8CC673'; g.fillRect(0,0,64,8); g.fillStyle='#84BF6B'; g.fillRect(32,0,32,8); },60);

// ---------- garden scenery ----------
const lawnMat=toon(0xffffff,{map:lawnTex});
// the camera looks at the ground at a slant, where plain mipmapping smears textures; anisotropic filtering keeps them crisp
{ const an=Math.min(8,renderer.capabilities.getMaxAnisotropy()); for(const t of [turfTex,crackTex,lawnTex]) t.anisotropy=an; }
const PETAL=[0xF57FA4,0xFFB05E,0xB89CF5,0xFFD95A,0xFF8C8C];
function tulip(r,col){ const g=new THREE.Group(); const h=.22+r()*.12;
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,h,8),m('leaf')); st.position.y=h/2; g.add(st);
  const lf=new THREE.Mesh(sph(.07,14,10),m('leaf')); lf.scale.set(.5,1.4,.25); lf.position.set(.05,.08,0); lf.rotation.z=-.5; g.add(lf);
  // the bloom: three petals leaning out a little, so the top of the cup is notched like a tulip's
  const pm=toon(col); for(let i=0;i<3;i++){ const pv=new THREE.Group(); pv.rotation.y=-i/3*Math.PI*2; g.add(pv);
    const p=new THREE.Mesh(sph(.06,10,8),pm); p.scale.set(.62,1.5,.9); p.position.set(.03,h+.06,0); p.rotation.z=-.22; outline(p,.012); p.castShadow=true; pv.add(p); }
  return g; }
function daisy(r,col){ const g=new THREE.Group(); const h=.16+r()*.1;
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.015,.018,h,8),m('leaf')); st.position.y=h/2; g.add(st);
  const head=new THREE.Group(); head.position.y=h; head.rotation.x=-.5; g.add(head);
  const pm=toon(col||0xFFFFFF); for(let i=0;i<7;i++){ const p=new THREE.Mesh(sph(.045,12,8),pm); const a=i/7*Math.PI*2; p.position.set(Math.cos(a)*.065,0,Math.sin(a)*.065); p.scale.set(1,.35,.6); p.rotation.y=-a; head.add(p); }
  const c=new THREE.Mesh(sph(.04,14,10),toon(0xFFC93C)); c.scale.y=.6; c.position.y=.01; head.add(c); return g; }
function tree(r,s=1){ const g=new THREE.Group(); const h=1.1+r()*.5;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.15,h,12),toon(0x9B6B47)); trunk.position.y=h/2; trunk.castShadow=true; outline(trunk,.02); g.add(trunk);
  const greens=[0x6FB45A,0x7CC062,0x86C96B,0x5FA64F]; const n=4+Math.floor(r()*3);
  for(let i=0;i<n;i++){ const c=new THREE.Mesh(sph(.42+r()*.22,16,12),toon(greens[Math.floor(r()*greens.length)])); const a=r()*Math.PI*2, d=i?.25+r()*.25:0;
    c.position.set(Math.cos(a)*d,h+.15+r()*.35,Math.sin(a)*d); c.castShadow=true; outline(c,.026); g.add(c); }
  if(r()<.5){ const fc=toon(r()<.5?0xFF9E9E:0xFFF0A8); for(let i=0;i<6;i++){ const f=new THREE.Mesh(sph(.05,10,8),fc); const a=r()*Math.PI*2; f.position.set(Math.cos(a)*.5,h+.2+r()*.5,Math.sin(a)*.5); g.add(f); } }
  g.scale.setScalar(s); return g; }
const trees=new THREE.Group(); scene.add(trees);
function placeTrees(){ disposeTree(trees); trees.clear(); treeObstacles=[]; swayers=swayers.filter(w=>w.o.parent); if(!state) return; const scen=new THREE.Group(); const r=rng((mode==='garden'?li*31+7:(L.seed|0))+99);
  const yaw=camYaw*Math.PI/180, fx=Math.sin(yaw), fz=Math.cos(yaw), sx=Math.cos(yaw), sz=-Math.sin(yaw);
  const hw=(camYaw%180===0?state.w:state.h)/2+1.4, hd=(camYaw%180===0?state.h:state.w)/2+1.4;
  for(let t=0;t<(quality===0?9:16);t++){ let side,along;
    if(r()<.55){ side=(r()-.5)*2*(hw+4); along=-(hd+1.3+r()*4); } else { side=(r()<.5?-1:1)*(hw+1.3+r()*3); along=-hd-3+r()*(hd*1.4+3); }
    const x=sx*side+fx*along, z=sz*side+fz*along;
    const big=r()<.55; const o= big? tree(r,.8+r()*.5) : bush(r,1.2+r()*.9); o.position.set(x,-.34,z); treeObstacles.push({x,z,r:(big?.95:.5)*o.scale.x}); o.rotation.y=r()*6; scen.add(o); swayers.push({o,ph:r()*6,amp:big?.12:.025}); }
  batchScenery(scen,trees);
}
function bush(r,s=1){ const g=new THREE.Group(); const bm=toon(r()>.5?0x6FB45A:0x7CC062);
  const n=3+Math.floor(r()*2); for(let i=0;i<n;i++){ const b=new THREE.Mesh(sph(.22+r()*.12,14,10),bm); b.position.set((r()-.5)*.4,.16+r()*.12,(r()-.5)*.35); b.castShadow=true; outline(b,.025); g.add(b); }
  if(r()>.5){ const bm2=toon(PETAL[Math.floor(r()*PETAL.length)]); for(let i=0;i<4;i++){ const f=new THREE.Mesh(sph(.04,10,8),bm2); f.position.set((r()-.5)*.5,.3+r()*.15,(r()-.5)*.4+.12); g.add(f); } }
  g.scale.setScalar(s); return g; }
function pebbles(r){ const g=new THREE.Group(); const pm=toon(0xD8CFC4); for(let i=0;i<2+Math.floor(r()*2);i++){ const p=new THREE.Mesh(sph(.06+r()*.04,14,10),pm); p.scale.y=.55; p.position.set((r()-.5)*.4,.02,(r()-.5)*.4); outline(p,.015); g.add(p); } return g; }
function sprout(r){ const g=new THREE.Group(); for(const s of [-1,1]){ const l=new THREE.Mesh(sph(.06,14,10),m('leaf')); l.scale.set(1.3,.3,.7); l.position.set(s*.06,.1,0); l.rotation.z=s*.5; g.add(l); }
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.012,.015,.1,6),m('leaf')); st.position.y=.05; g.add(st); return g; }
function bloom(s=1){ const r=Math.random; const f=r()<.5?daisy(r,0xFFFFFF):tulip(r,PETAL[Math.floor(r()*PETAL.length)]); f.scale.setScalar(s); f.position.set(-.18,0,.16); shade(f); return f; }
function shade(o){ o.traverse(c=>{ if(c.isMesh && c.material!==lineMat) c.castShadow=true; }); return o; }
let swayers=[];
// ---------- scenery batching ----------
// The plants around the bed are hundreds of small meshes. They're merged into one mesh (plus one for
// their outlines) with per-vertex colours, and their swaying moves into the vertex shader, so the
// lawn costs a few draw calls instead of hundreds. Batches are cut into chunks of lawn so the ones
// off screen are still skipped.
const windU={value:0}, gustU={value:1};
function windify(mt){ mt.onBeforeCompile=sh=>{ sh.uniforms.uWind=windU; sh.uniforms.uGust=gustU;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 sway;\nuniform float uWind, uGust;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n{ float h=max(0.,position.y-sway.z), a=sway.y*.07*uGust; transformed.x-=h*sin(uWind*1.6+sway.x)*a; transformed.z+=h*cos(uWind*1.3+sway.x)*a*.5; }'); };
  mt.customProgramCacheKey=()=>'wind'; return mt; }
const batchMat=windify(toon(0xffffff,{vertexColors:true})), batchLine=windify(new THREE.MeshBasicMaterial({color:C.line,side:THREE.BackSide}));
function batchScenery(src,dst){ src.updateMatrixWorld(true);
  const swayOf=new Map(swayers.map(w=>[w.o,w])), parts={}, wp0=new THREE.Vector3();
  src.traverse(o=>{ if(!o.isMesh) return; const mt=o.material, line=mt===lineMat;
    if(!line&&!(mt.isMeshToonMaterial&&!mt.map&&!mt.transparent&&mt.side===THREE.FrontSide)) return;
    let a=o, w=null; while(a&&a!==src&&!w){ w=swayOf.get(a)||null; if(!w) a=a.parent; }
    let sw=[0,0,1e4]; if(w){ a.getWorldPosition(wp0); sw=[w.ph,w.amp||1,wp0.y]; } else o.getWorldPosition(wp0);
    const key=(line?'l':'b')+Math.floor(wp0.x/5)+','+Math.floor(wp0.z/5); (parts[key]=parts[key]||[]).push({o,col:line?null:mt.color,sw}); });
  Object.entries(parts).forEach(([key,list])=>{ const mat=key[0]==='l'?batchLine:batchMat;
    let nv=0, ni=0; for(const {o} of list){ const g=o.geometry; nv+=g.attributes.position.count; ni+=g.index?g.index.count:g.attributes.position.count; }
    const P=new Float32Array(nv*3), N=new Float32Array(nv*3), Cc=mat===batchMat?new Float32Array(nv*3):null, S=new Float32Array(nv*3), I=nv>65535?new Uint32Array(ni):new Uint16Array(ni);
    const v=new THREE.Vector3(), nm=new THREE.Matrix3(); let vo=0, io=0;
    for(const {o,col,sw} of list){ const g=o.geometry, pa=g.attributes.position, na=g.attributes.normal, n=pa.count; nm.getNormalMatrix(o.matrixWorld);
      for(let k=0;k<n;k++){ v.fromBufferAttribute(pa,k).applyMatrix4(o.matrixWorld); P.set([v.x,v.y,v.z],(vo+k)*3);
        if(na){ v.fromBufferAttribute(na,k).applyMatrix3(nm).normalize(); N.set([v.x,v.y,v.z],(vo+k)*3); }
        if(Cc) Cc.set([col.r,col.g,col.b],(vo+k)*3); S.set(sw,(vo+k)*3); }
      if(g.index){ const ix=g.index.array; for(let k=0;k<ix.length;k++) I[io++]=ix[k]+vo; } else for(let k=0;k<n;k++) I[io++]=vo+k;
      vo+=n; }
    const bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.BufferAttribute(P,3)); bg.setAttribute('normal',new THREE.BufferAttribute(N,3));
    if(Cc) bg.setAttribute('color',new THREE.BufferAttribute(Cc,3)); bg.setAttribute('sway',new THREE.BufferAttribute(S,3)); bg.setIndex(new THREE.BufferAttribute(I,1));
    bg.computeBoundingSphere(); const mesh=new THREE.Mesh(bg,mat); mesh.castShadow=mat===batchMat&&quality>0; dst.add(mesh); });
  disposeTree(src); swayers=swayers.filter(w=>!swayOf.has(w.o)||!isUnder(w.o,src)); }
const isUnder=(o,root)=>{ for(let a=o;a;a=a.parent) if(a===root) return true; return false; };
const blobTex=canvasTex(64,64,c=>{ const gr=c.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(40,30,25,.32)'); gr.addColorStop(1,'rgba(40,30,25,0)'); c.fillStyle=gr; c.fillRect(0,0,64,64); });
let flyShadows=[], bedBox={cx:0,cz:0,hw:1,hd:1};
// things standing on the lawn, so the bird hops around them instead of through them
let lawnObstacles=[], treeObstacles=[];
function buildGarden(){ swayers=[]; lawnObstacles=[];
  disposeTree(garden); garden.clear(); const r=rng(mode==='garden'?li*97+13:(L.seed|0));
  const lawn=new THREE.Mesh(new THREE.PlaneGeometry(240,240),lawnMat); lawn.rotation.x=-Math.PI/2; lawn.rotation.z=.12; lawn.position.y=-.34; lawn.receiveShadow=true; garden.add(lawn);
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++) if(state.grid[y][x]!==' '){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
  const c0=wp(x0,y0), c1=wp(x1,y1); const cx=(c0.x+c1.x)/2, cz=(c0.z+c1.z)/2, bw=c1.x-c0.x+1+.9, bd=c1.z-c0.z+1+.9;
  const soil=new THREE.Mesh(slab(bw,bd,.45,.14,.05),m('soil')); soil.position.set(cx,-.29,cz); soil.receiveShadow=true; garden.add(soil);
  // wooden border around the bed
  const outer=rrShape(bw+.42,bd+.42,.6); outer.holes.push(rrShape(bw-.02,bd-.02,.45));
  const fg=new THREE.ExtrudeGeometry(outer,{depth:.18,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:4,curveSegments:10}); fg.rotateX(-Math.PI/2);
  const frame=new THREE.Mesh(fg,m('wood')); frame.position.set(cx,-.3,cz); frame.castShadow=true; frame.receiveShadow=true; garden.add(frame);
  const fo=new THREE.Mesh(fg,lineMat); fo.scale.set(1.006,1.15,1.006); fo.position.y=-.01; frame.add(fo);
  const scen=new THREE.Group();
  // plants in the soil wherever the worm cannot go
  for(let y=Math.floor(y0-.0);y<=y1;y++) for(let x=x0;x<=x1;x++){ if(state.grid[y][x]!==' ') continue; const roll=r(); if(roll<.22) continue;
    const p=roll<.5?tulip(r,PETAL[Math.floor(r()*PETAL.length)]):roll<.7?daisy(r):roll<.85?sprout(r):pebbles(r);
    const pos=wp(x,y,-.22); p.position.set(pos.x+(r()-.5)*.22,-.22,pos.z+(r()-.5)*.22); p.rotation.y=r()*6; p.scale.setScalar(1.5); shade(p); if(roll<.85) swayers.push({o:p,ph:r()*6}); scen.add(p);
    if(roll>=.22 && roll<.5 && r()>.4){ const q=tulip(r,PETAL[Math.floor(r()*PETAL.length)]); q.position.set(pos.x+(r()-.5)*.3,-.22,pos.z+(r()-.5)*.3); q.scale.setScalar(1.3); shade(q); swayers.push({o:q,ph:r()*6}); scen.add(q); } }
  // a loose hedge of bushes hugging the bed's wooden border
  const lite=quality===0;
  for(let i=0;i<(lite?8:14);i++){ const t=r(); const side=Math.floor(r()*4); const hx=bw/2+.75, hz=bd/2+.75; let x,z;
    if(side<2){ x=cx+(t-.5)*bw; z=cz+(side?hz:-hz); } else { z=cz+(t-.5)*bd; x=cx+(side===2?hx:-hx); }
    const b=bush(r,.8+r()*.5); b.position.set(x,-.34,z); shade(b); lawnObstacles.push({x,z,r:.5*b.scale.x}); swayers.push({o:b,ph:r()*6,amp:.02}); scen.add(b); }
  // lawn scenery around the bed
  const R=Math.max(bw,bd)/2;
  for(let i=0;i<(lite?24:54);i++){ const a=r()*Math.PI*2, d=R+1+r()*6; const x=cx+Math.cos(a)*d*(bw/Math.max(bw,bd)+.2), z=cz+Math.sin(a)*d*(bd/Math.max(bw,bd)+.2);
    if(Math.abs(x-cx)<bw/2+.6 && Math.abs(z-cz)<bd/2+.6) continue;
    const k=r(); const o = k<.35? bush(r,1+r()*.8) : k<.75? (r()>.5?tulip(r,PETAL[Math.floor(r()*PETAL.length)]):daisy(r,r()>.6?0xFFE27A:0xFFFFFF)) : pebbles(r);
    o.position.set(x,-.34,z); o.rotation.y=r()*6; shade(o); lawnObstacles.push({x,z,r:k<.35?.5*o.scale.x:.24}); if(k<.75) swayers.push({o,ph:r()*6,amp:k<.35?.025:1}); if(k>=.35&&k<.75) o.scale.setScalar(2.1); else if(k>=.75) o.scale.setScalar(1.6); scen.add(o); }
  batchScenery(scen,garden);
  const s=Math.max(bw,bd)*.75+2;
  Object.assign(sun.shadow.camera,{left:-s,right:s,top:s,bottom:-s,near:.5,far:40}); sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(cx,0,cz); sun.position.set(cx-4,10,cz+5);
  // butterflies
  disposeTree(flyers); flyers.clear(); flyShadows.forEach(o=>{ disposeTree(o); removeObj(o); }); flyShadows=[]; bedBox={cx,cz,hw:bw/2,hd:bd/2}; for(let i=0;i<2;i++){ const b=new THREE.Group(); const col=[0xFFB3C9,0xFFE07A][i];
    const body=new THREE.Mesh(sph(.025,10,8),m('pupil')); body.scale.set(1,1,3); b.add(body);
    // each wing is a big forewing and a smaller hindwing, outlined like everything else
    const wm=toon(col,{side:THREE.DoubleSide}), fore=new THREE.CircleGeometry(.085,16), hind=new THREE.CircleGeometry(.06,14);
    for(const sd of [-1,1]){ const piv=new THREE.Group(); b.add(piv); b.userData['w'+sd]=piv;
      for(const [geo,x,y,z,sx,sz] of [[fore,.08,0,.03,1,1.15],[hind,.06,-.004,-.05,1,1]]){ const w=new THREE.Mesh(geo,wm); w.position.set(sd*x,y,z); w.scale.set(sx,sz,1); w.rotation.x=-Math.PI/2; piv.add(w);
        const o=new THREE.Mesh(geo,flatLineMat); o.scale.setScalar(1.2); w.add(o); } }
    b.userData.ph=r()*10; b.userData.c=[cx,cz]; b.userData.R=R*.8+.5; flyers.add(b);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(.32,.32),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false})); sh.rotation.x=-Math.PI/2; scene.add(sh); flyShadows.push(sh); b.userData.shadow=sh; }
  buildCritters(r,cx,cz,bw,bd);
}
// ---------- little garden visitors: a ladybug on the wooden border, a bird hopping on the lawn ----------
let critters=[];
function ladybug(){ const g=new THREE.Group(), red=toon(0xE8544E), dark=m('pupil');
  const shell=new THREE.Mesh(sph(.075,16,12),red); shell.scale.set(1,.55,1.2); shell.position.y=.03; outline(shell,.012); g.add(shell);
  const head=new THREE.Mesh(sph(.04,12,10),dark); head.position.set(0,.025,.085); g.add(head);
  for(const [x,z] of [[.035,.02],[-.035,.02],[.03,-.045],[-.03,-.045],[0,-.01]]){ const d=new THREE.Mesh(sph(.017,8,6),dark); d.scale.y=.4; d.position.set(x,.068,z); g.add(d); }
  // the seam between the wing cases follows the curve of the shell
  const line=new THREE.Mesh(new THREE.TorusGeometry(.09,.006,4,24,Math.PI),dark); line.scale.y=.46; line.rotation.y=Math.PI/2; line.position.y=.03; g.add(line);
  return merged(g,1.5); }
// a critter's parts are merged into one mesh (plus outline), like the scenery
function merged(src,scale){ const g=new THREE.Group(); batchScenery(src,g); g.scale.setScalar(scale); return g; }
function birdie(){ const g=new THREE.Group(), body=toon(0x7DB4E8), belly=toon(0xFFE9C9), beak=toon(0xFFB24A), dark=m('pupil');
  const b=new THREE.Mesh(sph(.14,18,14),body); b.scale.set(1,.9,1.15); b.position.y=.17; outline(b,.016); g.add(b);
  const bl=new THREE.Mesh(sph(.1,14,10),belly); bl.position.set(0,.14,.07); bl.scale.set(1,.9,.8); g.add(bl);
  const head=new THREE.Group();
  const hd=new THREE.Mesh(sph(.095,16,12),body); outline(hd,.014); head.add(hd);
  const bk=new THREE.Mesh(new THREE.ConeGeometry(.03,.08,8),beak); bk.rotation.x=Math.PI/2; bk.position.set(0,-.01,.1); head.add(bk);
  for(const sd of [-1,1]){ const e=new THREE.Mesh(sph(.017,8,6),dark); e.position.set(sd*.055,.02,.07); head.add(e); }
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.06,.14,8),body); tail.rotation.x=-2.2; tail.position.set(0,.2,-.17); g.add(tail);
  for(const sd of [-1,1]){ const leg=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.06,5),beak); leg.position.set(sd*.04,.03,0); g.add(leg); }
  const bird=merged(g,1.7), hg=merged(head,1); hg.position.set(0,.3,.08); bird.add(hg); bird.userData.head=hg; return bird; }
function buildCritters(r,cx,cz,bw,bd){ critters=[];
  // the ladybug walks the top of the wooden border, now and then stopping for a rest
  const bug=ladybug(); garden.add(bug); critters.push({kind:'bug',o:bug,s:r()*4,rest:0,dir:r()<.5?1:-1,hw:bw/2+.12,hd:bd/2+.12,cx,cz});
  if(quality===0) return;
  // a bird visits the lawn in front of the bed and hops about
  const bird=birdie(); garden.add(bird); const c={kind:'bird',o:bird,cx,cz,hw:bw/2,hd:bd/2,mode:'eat',t:0,wait:0,to:null,peck:0,look:0,lookTo:0};
  critters.push(c); bird.visible=false; }
const BIRD_R=.28, BUG_Y=-.052; // the wooden border's top is at y -.07; the bug's shell reaches .011 below its origin (x1.5)
const clearAt=(x,z)=>![...lawnObstacles,...treeObstacles].some(o=>Math.hypot(x-o.x,z-o.z)<o.r+BIRD_R);
function clearPath(a,b){ const n=Math.ceil(a.distanceTo(b)/.12); for(let i=1;i<=n;i++){ const t=i/n; if(!clearAt(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)) return false; } return true; }
// a free spot on the lawn between the bed and the camera that the bird can reach without going through anything
function birdSpot(c,from){ const fx=camera.position.x-c.cx, fz=camera.position.z-c.cz, l=Math.hypot(fx,fz)||1, ux=fx/l, uz=fz/l;
  const ext=Math.abs(ux)*c.hw+Math.abs(uz)*c.hd, span=Math.abs(uz)*c.hw+Math.abs(ux)*c.hd, box=viewBox();
  for(let k=0;k<120;k++){ const wide=1+Math.floor(k%80/20)*.5; // look a little further out if the near lawn is crowded
    let side=(Math.random()-.5)*2*span*wide, d=ext+.7+Math.random()*.8*wide;
    // when the lawn in front is hidden (under the buttons on a phone), try the lawn beside the bed
    if(k>=80){ side=(Math.random()<.5?-1:1)*(span+.8+Math.random()*.9); d=(Math.random()-.3)*ext*1.4; }
    const p=new THREE.Vector3(c.cx+ux*d-uz*side,-.34,c.cz+uz*d+ux*side);
    if(!clearAt(p.x,p.z)||!inView(p,box)) continue; if(from&&(from.distanceTo(p)<.9||!clearPath(from,p))) continue; return p; }
  return null; }
// the open part of the screen between the HUD and the buttons, measured once per search
function viewBox(){ const W=window.innerWidth, H=window.innerHeight, hd=document.querySelector('header'), nv=document.querySelector('nav'), hr=hd&&hd.getBoundingClientRect(), nr=nv&&nv.getBoundingClientRect();
  return {W,H,t:hr&&hr.height?hr.bottom:0,b:nr&&nr.height?nr.top:H}; }
function inView(p,box){ const v=p.clone(); v.y+=.25; v.project(camera); if(v.z>1) return false; const px=(v.x+1)/2*box.W, py=(1-v.y)/2*box.H;
  return px>24 && px<box.W-24 && py>box.t+10 && py<box.b-14; }
function perimeter(c,s){ // a point on the border's centre line, s in 0..4 going round the bed
  const k=((s%4)+4)%4, f=k%1; const P=[[-1,-1],[1,-1],[1,1],[-1,1]][Math.floor(k)], Q=[[1,-1],[1,1],[-1,1],[-1,-1]][Math.floor(k)];
  return [c.cx+(P[0]+(Q[0]-P[0])*f)*c.hw, c.cz+(P[1]+(Q[1]-P[1])*f)*c.hd]; }
function updateCritters(dt){ const sec=dt/1000;
  for(const c of critters){ const o=c.o;
    if(c.kind==='bug'){ if(reduceMotion){ const [x,z]=perimeter(c,c.s); o.position.set(x,BUG_Y,z); continue; }
      if(c.rest>0){ c.rest-=sec; continue; }
      const sp=.035/Math.max(c.hw,c.hd); c.s+=c.dir*sp*sec*4; if(Math.random()<sec*.12){ c.rest=1.5+Math.random()*3; if(Math.random()<.3) c.dir*=-1; }
      const [x,z]=perimeter(c,c.s), [nx,nz]=perimeter(c,c.s+c.dir*.01); o.position.set(x,BUG_Y+Math.abs(Math.sin(idleT*30))*.004,z); o.rotation.y=Math.atan2(nx-x,nz-z); continue; }
    // bird: settles on a spot and eats there for a while (pecks, looks around), then hops a few times to another spot
    if(!o.visible){ if((c.retry=(c.retry||0)-sec)>0) continue; const p=birdSpot(c); if(!p){ c.retry=1; continue; } o.position.copy(p); o.rotation.y=Math.random()*6; o.visible=true; c.mode='eat'; c.t=3+Math.random()*4; } // placed once the camera has settled
    const head=o.userData.head; head.rotation.z=birdSong>0?Math.sin(birdSong*30)*.2:0;
    if(reduceMotion){ head.rotation.x=0; continue; }
    if(c.mode==='eat'){ c.t-=sec;
      if(c.peck>0){ c.peck-=sec; head.rotation.x=Math.sin((1-c.peck/.45)*Math.PI)*.95; }
      else { head.rotation.x*=.85; if(Math.random()<sec*1.1) c.peck=.45; }
      if(c.look>0){ c.look-=sec; head.rotation.y+=(c.lookTo-head.rotation.y)*Math.min(1,sec*8); } else { head.rotation.y*=.9; if(Math.random()<sec*.25){ c.look=.9; c.lookTo=(Math.random()-.5)*1.4; } }
      if(c.t<=0){ const p=birdSpot(c,o.position); if(p){ c.mode='go'; c.to=p; c.wait=0; } else c.t=2; }
      continue; }
    // travelling: short hops with small pauses, facing where it's going
    head.rotation.x*=.8; head.rotation.y*=.8;
    if(c.hop){ c.hop.t+=sec/c.hop.dur; const k=Math.min(1,c.hop.t); o.position.lerpVectors(c.hop.a,c.hop.b,k); o.position.y=-.34+Math.sin(k*Math.PI)*c.hop.h;
      if(k>=1){ c.hop=null; c.wait=.18+Math.random()*.25; } continue; }
    c.wait-=sec; if(c.wait>0) continue;
    const a=o.position.clone(); a.y=-.34; const dir=c.to.clone().sub(a); dir.y=0;
    if(dir.length()<.05){ c.mode='eat'; c.t=5+Math.random()*6; continue; }
    if(dir.length()>.32) dir.setLength(.26+Math.random()*.06);
    o.rotation.y=Math.atan2(dir.x,dir.z); c.hop={a,b:a.clone().add(dir),t:0,dur:.24,h:.1}; }
  birdSong=Math.max(0,birdSong-sec); }

// ---------- tiles and items ----------
const flowTex=canvasTex(64,64,g=>{ g.fillStyle='#fff'; g.fillRect(0,0,64,64);
  g.strokeStyle='rgba(255,255,255,1)'; g.fillStyle='rgba(120,190,220,.18)'; for(let i=0;i<3;i++){ g.fillRect(0,i*21+8,64,2); }
  g.strokeStyle='rgba(255,255,255,.95)'; g.lineWidth=2.5; g.lineCap='round'; for(let i=0;i<5;i++){ const y=Math.random()*64,x=Math.random()*64; g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+6,y-3,x+12,y); g.stroke(); } },1);
flowTex.anisotropy=turfTex.anisotropy; const flowH=flowTex, flowV=flowTex.clone(); flowV.needsUpdate=true; flowV.center.set(.5,.5); flowV.rotation=Math.PI/2;
const waterMatH=toon(C.riverWater,{map:flowH}), waterMatV=toon(C.riverWater,{map:flowV});
const WATER=new THREE.BoxGeometry(1,.1,1);
function riverAt(x,y){ const c=tileAt(state,x,y); return c==='~'||c==='='||c==='|'; }
const glintMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:.9}), glintGeo=new THREE.CircleGeometry(.05,12), rippleGeo=new THREE.RingGeometry(.1,.13,28);
let flowTiles=[];
function waterTile(g,x,y){ const horiz=riverAt(x-1,y)||riverAt(x+1,y); const vert=riverAt(x,y-1)||riverAt(x,y+1);
  const w=new THREE.Mesh(WATER, (vert&&!horiz)?waterMatV:waterMatH); w.position.y=-.19; w.receiveShadow=true; g.add(w);
  // little things on the current: a leaf drifting downstream on some tiles, glints twinkling on all of them
  const along=vert&&!horiz?'z':'x', f={w,along,ph:(x*1.7+y*2.9)%6.28,glints:[],leaf:null};
  if((x*7+y*13)%3===0){ const leaf=new THREE.Group(); leaf.position.y=-.125; g.add(leaf); f.leaf=leaf;
    const pad=new THREE.Mesh(sph(.1,14,8),m('leaf')); pad.scale.set(1.3,.2,.75); pad.castShadow=true; outline(pad,.012); leaf.add(pad);
    const vein=new THREE.Mesh(new THREE.BoxGeometry(.2,.01,.012),toon(0x4E9A3E)); vein.position.y=.022; leaf.add(vein); }
  f.rippleMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0,depthWrite:false});
  f.ripple=new THREE.Mesh(rippleGeo,f.rippleMat); f.ripple.rotation.x=-Math.PI/2; f.ripple.position.y=-.13; g.add(f.ripple);
  for(let i=0;i<2;i++){ const gl=new THREE.Mesh(glintGeo,glintMat); gl.rotation.x=-Math.PI/2; gl.position.set((i-.5)*.36,-.132,((x+y+i)%3-1)*.22); gl.scale.set(1,.45,1); gl.userData.ph=f.ph+i*2.1; g.add(gl); f.glints.push(gl); }
  flowTiles.push(f);
  for(let i=0;i<2;i++){ const st=new THREE.Mesh(sph(.05+Math.random()*.03,12,8),toon(0xC9BFB2)); st.scale.y=.5; const sx=(Math.random()<.5?-1:1)*.42, sz=(Math.random()-.5)*.8; st.position.set(vert&&!horiz?sx:sz,-.14,vert&&!horiz?sz:sx); g.add(st); } }
function makeBridge(ch){ const br=new THREE.Group(); const wm=m('plank'), dm=m('plankDark');
  for(let i=0;i<5;i++){ const p=new THREE.Mesh(new THREE.BoxGeometry(.17,.07,.8),i%2?wm:dm); p.position.set(-.4+i*.2,-.03,0); p.castShadow=true; p.receiveShadow=true; outlineBox(p,.012,.17,.07,.8); br.add(p); }
  for(const z of [-.3,.3]){ const s=new THREE.Mesh(new THREE.BoxGeometry(1.06,.06,.08),dm); s.position.set(0,-.09,z); br.add(s); }
  for(const z of [-.42,.42]){ for(const x of [-.46,.46]){ mk(new THREE.CylinderGeometry(.035,.04,.34,10),dm,br,[x,.1,z],.012); }
    mk(new THREE.BoxGeometry(.96,.05,.06),wm,br,[0,.24,z],.012); }
  br.rotation.y = ch==='|'?Math.PI/2:0; return br; }
function makeTile(x,y,ch){
  const g=new THREE.Group(); const dry=ch==='x';
  if(ch===SOFT){ makeSoftTile(g,x,y); g.position.copy(wp(x,y)); board.add(g); return g; }
  if(ch==='~'||ch==='='||ch==='|'){ waterTile(g,x,y); if(ch!=='~'){ const br=makeBridge(ch); g.add(br); g.userData.bridge=br; } g.userData.river=true; g.position.copy(wp(x,y)); board.add(g); return g; }
  if(ch==='i'){ // a big wet leaf lying on the grass: slippery
    const top=new THREE.Mesh(TURF,m('turf2')); top.position.y=-.15; top.receiveShadow=true; outlineBox(top,.02,.94,.3,.94); g.add(top);
    const leaf=new THREE.Group(); leaf.position.y=.01; leaf.rotation.y=(x*5+y*3)%4*.35; g.add(leaf);
    const pad=new THREE.Mesh(sph(.44,32,14),m('wetLeaf')); pad.scale.set(1.05,.07,.95); pad.receiveShadow=true; outline(pad,.02); leaf.add(pad);
    const vein=new THREE.Mesh(new THREE.BoxGeometry(.72,.012,.03),m('leafVein')); vein.position.y=.032; leaf.add(vein);
    for(const sd of [-1,1]) for(const t of [-.16,.14]){ const v=new THREE.Mesh(new THREE.BoxGeometry(.22,.012,.022),m('leafVein')); v.position.set(t,.032,sd*.09); v.rotation.y=sd*.7; leaf.add(v); }
    const shine=new THREE.Mesh(new THREE.CircleGeometry(.2,20),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false})); shine.rotation.x=-Math.PI/2; shine.scale.set(1.3,.35,1); shine.position.set(-.08,.036,-.12); leaf.add(shine);
    for(let i=0;i<3;i++){ const dw=new THREE.Mesh(sph(.035,10,8),m('dew')); dw.scale.y=.6; dw.position.set(Math.cos(i*2.3+x)*.22,.045,Math.sin(i*2.3+y)*.2); leaf.add(dw); }
    g.userData.wetLeaf=leaf; g.position.copy(wp(x,y)); board.add(g); return g; }
  if(ch==='s'){ // a seedling in the soil; rain grows it into a big leaf you can crawl on
    const sp=sprout(Math.random); sp.position.y=-.22; sp.scale.setScalar(1.6); g.add(sp); g.userData.sprout=sp;
    const leaf=new THREE.Group(); const lm=m('leafBig');
    const pad=new THREE.Mesh(sph(.47,32,16),lm); pad.scale.set(1,.12,1); pad.castShadow=true; pad.receiveShadow=true; outline(pad,.025); leaf.add(pad);
    const vein=new THREE.Mesh(new THREE.BoxGeometry(.7,.012,.03),toon(0x5FAE48)); vein.position.y=.058; leaf.add(vein);
    for(const s of [-1,1]) for(const t of [-.18,.12]){ const v=new THREE.Mesh(new THREE.BoxGeometry(.24,.012,.025),toon(0x5FAE48)); v.position.set(t,.058,s*.1); v.rotation.y=s*.7; leaf.add(v); }
    leaf.position.y=-.03; leaf.rotation.y=(x*7+y*3)%4*.4; leaf.scale.setScalar(.01); leaf.visible=false; g.add(leaf); g.userData.leaf=leaf;
    g.position.copy(wp(x,y)); board.add(g); return g; }
  const top=new THREE.Mesh(TURF, dry?m('dry'):((x+y)%2?m('turf1'):m('turf2')));
  top.position.y=-.15; top.receiveShadow=true; top.castShadow=true; outlineBox(top,.02,.94,.3,.94); g.add(top);
  if(dry){ const dec=new THREE.Mesh(new THREE.PlaneGeometry(.76,.76),new THREE.MeshBasicMaterial({map:crackTex,transparent:true,depthWrite:false}));
    dec.rotation.x=-Math.PI/2; dec.position.y=.004; g.add(dec); }
  if(ch==='w'){ // a dip that fills with water when it rains
    const mud=new THREE.Mesh(new THREE.CircleGeometry(.37,32),toon(C.mud)); mud.rotation.x=-Math.PI/2; mud.position.y=.004; mud.receiveShadow=true; g.add(mud);
    const water=new THREE.Group(); water.position.y=.012; g.add(water);
    const wm=new THREE.Mesh(new THREE.CircleGeometry(.4,32),new THREE.MeshBasicMaterial({color:C.water,transparent:true,opacity:.92})); wm.rotation.x=-Math.PI/2; water.add(wm);
    const shine=new THREE.Mesh(new THREE.RingGeometry(.2,.25,24,1,0.4,1.2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7})); shine.rotation.x=-Math.PI/2; shine.position.y=.003; water.add(shine);
    water.scale.setScalar(.01); water.visible=false; g.userData.water=water; }
  g.position.copy(wp(x,y)); board.add(g); return g;
}
function numberTex(n){ return canvasTex(128,128,g=>{
  g.fillStyle='#FFF8EA'; g.beginPath(); g.arc(64,64,52,0,Math.PI*2); g.fill(); g.lineWidth=7; g.strokeStyle='#5B4436'; g.stroke();
  g.fillStyle='#5B4436'; g.font='800 70px Grandstander, Nunito, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(n),64,70);
  }); }
function faceCamera(o){ const yaw=(typeof camYaw==='number'?camYaw:0)*Math.PI/180;
  if(o.userData.faceCam){ o.rotation.y=yaw; if(o.userData.lean){ o.rotation.order='YXZ'; o.rotation.x=o.userData.lean; } }
  if(o.userData.signs) o.userData.signs.forEach(s=>{ s.rotation.y=yaw-o.rotation.y; s.position.set(-Math.sin(yaw)*.36+Math.cos(yaw)*.26,0,-Math.cos(yaw)*.36-Math.sin(yaw)*.26); }); }
// the soil heaped around a tunnel: a low torus whose thickness wobbles, so it reads as dug-up earth
function moundGeo(seed){ const R=.32, g=new THREE.TorusGeometry(R,.095,10,40), pa=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i); const u=Math.atan2(v.y,v.x), cx=Math.cos(u)*R, cy=Math.sin(u)*R;
    const f=1+.1*Math.sin(5*u+seed)+.05*Math.sin(11*u+seed*1.7); pa.setXYZ(i,cx+(v.x-cx)*f,cy+(v.y-cy)*f,v.z*f*.8); }
  g.rotateX(-Math.PI/2); g.computeVertexNormals(); return g; }
function mk(geo,mt,parent,pos,ol=.022){ const o=new THREE.Mesh(geo,mt); if(pos) o.position.set(...pos); o.castShadow=true; if(ol) outline(o,ol); parent.add(o); return o; }
function makeItem(x,y,ch){
  const g=new THREE.Group(); g.position.copy(wp(x,y)); g.userData.kind=ch;
  if(ch==='+'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b;
    const f=mk(sph(.2,28,20),m('peach'),b,[0,.3,0]); f.scale.set(1,.92,1);
    mk(new THREE.CylinderGeometry(.018,.022,.1,8),toon(0x8A5A3C),b,[0,.52,0],0);
    const lf=mk(sph(.09,16,10),m('leaf'),b,[.08,.53,0],.016); lf.scale.set(1,.35,.6); lf.rotation.z=-.5;
    const lf2=mk(sph(.07,16,10),m('leaf'),b,[-.06,.52,.02],.014); lf2.scale.set(1,.35,.6); lf2.rotation.z=.6;
    // the crease and the blush sit on the skin (a sphere of radius .2, squashed to .92 in y)
    const crease=new THREE.Mesh(new THREE.TorusGeometry(.2,.009,6,40,Math.PI),toon(0xF07F5E)); crease.position.set(0,.3,.0); crease.rotation.y=Math.PI/2; crease.scale.y=.92; b.add(crease);
    const blush=new THREE.Mesh(sph(.08,14,10),new THREE.MeshBasicMaterial({color:0xFF7C6E,transparent:true,opacity:.45,depthWrite:false})); const bn=new THREE.Vector3(.45,.15,.88).normalize(); blush.position.set(0,.3,0).addScaledVector(bn,.196); blush.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),bn); blush.scale.set(1,1,.25); b.add(blush); }
  else if(ch==='-'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b;
    mk(new THREE.CylinderGeometry(.08,.1,.22,18),m('stem'),b,[0,.13,0]);
    const cap=mk(new THREE.SphereGeometry(.22,30,14,0,Math.PI*2,0,Math.PI/2),m('cap'),b,[0,.22,0]); cap.scale.y=.85;
    const gills=new THREE.Mesh(new THREE.CircleGeometry(.2,28),toon(0xF4E3F7)); gills.rotation.x=Math.PI/2; gills.position.y=.215; b.add(gills);
    const dm=toon(0xFFFFFF);
    [[0,.35],[1.2,.75],[2.4,.7],[3.6,.8],[4.8,.72],[.6,1.05],[3,1.1]].forEach(([az,el])=>{ const R=.22, x=Math.cos(az)*Math.sin(el)*R, z=Math.sin(az)*Math.sin(el)*R, y=Math.cos(el)*R*.85;
      const d=new THREE.Mesh(sph(.04,12,8),dm); d.position.set(x,.22+y,z); d.lookAt(x*3,.22+y*3,z*3); d.scale.set(1,1,.35); b.add(d); }); }
  else if(ch==='K'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b; g.userData.noSpin=true; g.userData.faceCam=true; const km=m('key');
    const k=new THREE.Group(); k.position.y=.36; k.rotation.x=-.75; b.add(k); g.userData.keyBody=k;
    mk(new THREE.TorusGeometry(.12,.05,14,30),km,k,[0,.16,0],.016);
    mk(new THREE.CylinderGeometry(.035,.035,.3,12),km,k,[0,-.05,0],.016).rotation.z=0;
    mk(new THREE.BoxGeometry(.11,.05,.05),km,k,[.07,-.17,0],.014); mk(new THREE.BoxGeometry(.08,.05,.05),km,k,[.06,-.09,0],.014);
    const gem=new THREE.Mesh(sph(.04,12,10),toon(0xFF8FB1)); gem.position.set(0,.16,0); gem.scale.z=.6; k.add(gem); }
  else if(ch==='G'){ const gm=m('gateWood'); // little wooden garden gate
    for(const sx of [-.38,.38]){ mk(new THREE.CylinderGeometry(.06,.065,.72,14),gm,g,[sx,.36,0]); mk(sph(.075,16,12),gm,g,[sx,.74,0]); }
    const door=new THREE.Group(); door.position.x=-.32; g.add(door); g.userData.door=door;
    for(const sx of [.1,.25,.4,.55]){ mk(new THREE.BoxGeometry(.1,.5,.05),gm,door,[sx,.31,0],.016); mk(new THREE.ConeGeometry(.07,.1,4),gm,door,[sx,.6,0],0).rotation.y=Math.PI/4; }
    mk(new THREE.BoxGeometry(.6,.07,.06),gm,door,[.32,.22,.03],.014); mk(new THREE.BoxGeometry(.6,.07,.06),gm,door,[.32,.44,.03],.014);
    mk(new THREE.BoxGeometry(.13,.13,.08),m('key'),door,[.32,.33,.07],.016);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(.38,.045,10,28,Math.PI),gm); arch.position.y=.74; arch.castShadow=true; outline(arch,.014); g.add(arch);
    for(let i=0;i<4;i++){ const lf=new THREE.Mesh(sph(.06,10,8),m('leaf')); const a=.5+i*.7; lf.position.set(Math.cos(a)*.38,.74+Math.sin(a)*.38,.03); lf.scale.set(1,.6,.5); g.add(lf); }
    g.userData.faceCam=true; g.userData.lean=-.28; }
  else if(ch==='C'||ch==='c'){ const done=ch==='c';
    mk(new THREE.CylinderGeometry(.028,.028,.74,10),m('pole'),g,[0,.37,0],.014);
    mk(sph(.05,14,10),m('key'),g,[0,.76,0],.014);
    const fg=new THREE.PlaneGeometry(.42,.26,14,1); fg.translate(.21,0,0); g.userData.faceCam=true;
    if(done) g.add(bloom(.9));
    const fl=new THREE.Mesh(fg,toon(done?C.flagDone:C.flag,{side:THREE.DoubleSide})); fl.position.set(.02,.6,0); fl.castShadow=true; g.add(fl);
    // its outline is its own slightly larger cloth that waves exactly like the flag (same bend at the same x)
    const fog=new THREE.PlaneGeometry(.45,.3,15,1); fog.translate(.21,0,0); const fo=new THREE.Mesh(fog,flatLineMat); fl.add(fo);
    g.userData.flagLine=fo; g.userData.flagLineBase=Float32Array.from(fog.attributes.position.array);
    g.userData.flag=fl; g.userData.flagBase=Float32Array.from(fg.attributes.position.array);
    mk(new THREE.CylinderGeometry(.11,.14,.05,18),m('pole'),g,[0,.025,0],.014); }
  else if(ch>='1'&&ch<='9'){ const col=C.portal[ch]||0x9fd8e8; // a tunnel dug into the soil, marked with flowers of its pair colour
    const hole=new THREE.Mesh(new THREE.CircleGeometry(.27,32),new THREE.MeshBasicMaterial({color:0x2E2019})); hole.rotation.x=-Math.PI/2; hole.position.y=.012; g.add(hole);
    const inner=new THREE.Mesh(new THREE.RingGeometry(.15,.27,32),new THREE.MeshBasicMaterial({color:0x4A3226})); inner.rotation.x=-Math.PI/2; inner.position.y=.014; g.add(inner);
    const dm=MC.tunnelSoil||(MC.tunnelSoil=toon(0xA9744F)), dm2=MC.tunnelClod||(MC.tunnelClod=toon(0x96633F));
    const ring=new THREE.Mesh(moundGeo(x*3+y*5),dm); ring.position.y=-.03; ring.castShadow=true; ring.receiveShadow=true; outline(ring,.014,.4); g.add(ring);
    for(let i=0;i<4;i++){ const a=i*1.9+x+y*2, c=new THREE.Mesh(sph(.045,10,8),dm2); c.position.set(Math.cos(a)*.33,.065,Math.sin(a)*.33); c.scale.set(1,.6,.8); c.rotation.y=a; g.add(c); }
    const fm=toon(col); for(let i=0;i<3;i++){ const a=i/3*Math.PI*2+.6; const f=new THREE.Group(); f.position.set(Math.cos(a)*.36,.075,Math.sin(a)*.36);
      for(let k=0;k<5;k++){ const pt=new THREE.Mesh(sph(.032,10,8),fm); const b=k/5*Math.PI*2; pt.position.set(Math.cos(b)*.04,.04,Math.sin(b)*.04); pt.scale.y=.5; f.add(pt); }
      const c=new THREE.Mesh(sph(.024,10,8),toon(0xFFD866)); c.position.y=.05; f.add(c); g.add(f); }
    g.userData.tunnel=hole; }
  else if(ch==='B'){ // a big flower lying flat: a button that holds the hedges open while the worm rests on it
    const fl=new THREE.Group(); fl.position.y=.02; g.add(fl); g.userData.flower=fl;
    const base=mk(new THREE.CylinderGeometry(.36,.38,.04,24),m('leaf'),fl,[0,.0,0],.014); base.receiveShadow=true;
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; const pt=new THREE.Mesh(sph(.13,16,10),m('petalB')); pt.scale.set(1.2,.28,.62); pt.position.set(Math.cos(a)*.21,.05,Math.sin(a)*.21); pt.rotation.y=-a; pt.castShadow=true; outline(pt,.012); fl.add(pt); }
    const c=mk(sph(.12,18,12),m('key'),fl,[0,.07,0],.014); c.scale.y=.5; }
  else if(ch==='H'){ // a little hedge that sinks into the ground while a flower is held
    const hg=new THREE.Group(); g.add(hg); g.userData.hedge=hg;
    const box=new THREE.Mesh(HEDGE,m('hedge')); box.position.y=.25; box.castShadow=true; box.receiveShadow=true; outlineBox(box,.02,.8,.5,.8); hg.add(box);
    for(let i=0;i<9;i++){ const b=new THREE.Mesh(sph(.17,14,10),i%2?m('hedge'):m('hedgeDark')); b.position.set(((i%3)-1)*.27,.5+((i*7)%3)*.02,(Math.floor(i/3)-1)*.27); b.castShadow=true; outline(b,.012); hg.add(b); }
    for(let i=0;i<4;i++){ const fl=new THREE.Mesh(sph(.04,10,8),m('petalB')); fl.position.set(Math.cos(i*1.7)*.3,.62,Math.sin(i*1.7)*.3); hg.add(fl); } }
  else if(ch==='L'){ mk(new THREE.CylinderGeometry(.14,.17,.1,18),toon(0xD8CFC4),g,[0,.05,0],.014);
    mk(new THREE.BoxGeometry(.09,.5,.09),m('plankDark'),g,[0,.3,0],.014);
    const wheel=new THREE.Group(); wheel.position.set(0,.5,.07); wheel.rotation.x=-.6; g.add(wheel); g.userData.wheel=wheel; g.userData.faceCam=true;
    mk(new THREE.TorusGeometry(.17,.03,10,28),m('plank'),wheel,null,.012);
    for(let i=0;i<3;i++){ const sp=new THREE.Mesh(new THREE.BoxGeometry(.34,.035,.035),m('plankDark')); sp.rotation.z=i*Math.PI/3; wheel.add(sp); }
    mk(sph(.045,12,10),m('key'),wheel,[0,0,.02],.012); mk(new THREE.CylinderGeometry(.02,.02,.12,8),m('key'),wheel,[.17,0,.06],.01).rotation.x=Math.PI/2; }
  else if(ch==='R'){ const st=mk(sph(.22,20,14),toon(0xC9C0B4),g,[0,.04,0],.016); st.scale.set(1,.45,.9);
    const moss=new THREE.Mesh(sph(.16,16,10),m('leaf')); moss.scale.set(1,.3,.8); moss.position.set(-.04,.11,0); g.add(moss);
    const cl=new THREE.Group(); cl.position.y=.76; cl.scale.setScalar(1.6); cl.rotation.x=-.6; g.add(cl); g.userData.bob=cl; g.userData.bobBase=.76; g.userData.at=[x,y]; g.userData.noSpin=true; g.userData.cloud=cl; g.userData.faceCam=true; const cm=toon(C.cloud);
    const face=new THREE.Group(); face.position.set(0,.02,.158); cl.add(face); const fm=m('pupil');
    for(const s of [-1,1]){ const e=new THREE.Mesh(new THREE.TorusGeometry(.026,.009,6,12,Math.PI),fm); e.position.set(s*.055,.01,0); e.rotation.z=Math.PI; face.add(e);
      const ck=new THREE.Mesh(sph(.02,8,6),new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.6})); ck.position.set(s*.085,-.025,-.005); ck.scale.set(1,.6,.4); face.add(ck); }
    const mo=new THREE.Mesh(new THREE.TorusGeometry(.016,.006,6,12,Math.PI),fm); mo.position.set(0,-.03,0); mo.rotation.z=Math.PI; face.add(mo); g.userData.cloudMouth=mo;
    [[0,0,0,.15],[-.15,-.03,0,.11],[.15,-.03,0,.11],[.07,.08,0,.11],[-.07,.07,0,.1]].forEach(p=>{ const s=new THREE.Mesh(sph(p[3],20,14),cm); s.position.set(p[0],p[1],p[2]); s.castShadow=true; outline(s,.016); cl.add(s); });
    g.userData.cloudMat=cm;
    const drops=new THREE.Group(); drops.visible=false; cl.add(drops); g.userData.drops=drops;
    for(let i=0;i<3;i++){ const d=new THREE.Mesh(sph(.025,10,8),toon(C.water)); d.scale.y=1.6; d.position.set((i-1)*.1,-.15,0); d.userData.ph=i*.33; drops.add(d); } }
  else if(ch==='E'){
    const hole=new THREE.Mesh(new THREE.CircleGeometry(.28,32),new THREE.MeshBasicMaterial({color:C.burrow})); hole.rotation.x=-Math.PI/2; hole.position.y=.01; g.add(hole);
    const rim=mk(new THREE.TorusGeometry(.33,.09,14,36),toon(C.mound),g,[0,.05,0],.018); rim.rotation.x=-Math.PI/2; rim.scale.z=.8;
    const sign=new THREE.Group(); sign.position.set(.3,0,-.34); sign.scale.setScalar(1.55); g.add(sign); sign.userData.faceCam=true;
    mk(new THREE.CylinderGeometry(.03,.035,.5,10),m('pole'),sign,[0,.25,0],.014);
    const face=new THREE.Group(); face.position.y=.55; face.rotation.x=-.35; sign.add(face);
    g.userData.signBoard=mk(slab(.38,.07,.06,.32,.025),m('plank'),face,[0,0,0],.016);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.28,.28),new THREE.MeshBasicMaterial({map:numberTex(state.exitLen),transparent:true})); label.position.set(0,0,.04); face.add(label);
    for(let i=0;i<3;i++){ const t=new THREE.Mesh(new THREE.ConeGeometry(.03,.12,6),m('leaf')); const a=i*2.1+.4; t.position.set(Math.cos(a)*.36,.05,Math.sin(a)*.3); t.rotation.z=(i-1)*.3; t.castShadow=true; g.add(t); }
    g.userData.rim=rim; g.userData.sprite=sign; g.userData.signs=[sign]; }
  else if(POLLEN[ch]) makePollenFlower(g,ch,x,y);
  else if(PETALS[ch]) makePetalGate(g,ch,x,y);
  else return null;
  faceCamera(g); board.add(g); return g;
}
// Each patch builds its own meshes; free their GPU memory when the next patch replaces them.
// Cached and module-level geometries, materials and textures are shared, so they are kept.
function disposeTree(root){
  const keepG=new Set([...Object.values(GC),TURF,HEDGE,WATER,spriteGeo,ringGeo,glintGeo,rippleGeo]);
  const keepM=new Set([...Object.values(MC),lineMat,flatLineMat,batchMat,batchLine,tubeMat,capMat,waterMatH,waterMatV,lawnMat,sparkMat,glintMat]);
  const keepT=new Set([gradTex,glowTex,sparkTex,turfTex,crackTex,swirlTex,lawnTex,flowH,flowV,blobTex,zTex,slimeTex]);
  root.traverse(o=>{ if(o.geometry&&!keepG.has(o.geometry)) o.geometry.dispose();
    for(const mt of o.material?[].concat(o.material):[]){ if(keepM.has(mt)) continue; if(mt.map&&!keepT.has(mt.map)) mt.map.dispose(); mt.dispose(); } }); }
function buildBoard(){
  disposeTree(board); disposeTree(fx); board.clear(); fx.clear(); cells=[]; flowTiles=[]; polItems=[]; snapPollen();
  for(let y=0;y<state.h;y++){ const row=[]; for(let x=0;x<state.w;x++){
    const ch=state.grid[y][x]; row.push({ch, tile: ch===' '?null:makeTile(x,y,ch), item: makeItem(x,y,ch)}); } cells.push(row); }
  buildGarden(); buildRain(); syncWeather(false); buildSnails(); buildBeetles(); syncHedges(false);
}
// hedges stand while no flower is held and sink while one is (or while the worm is inside them)
function syncHedges(animate){ if(!state) return; const open=hedgesOpen(state); let changed=false;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const it=cells[y]&&cells[y][x]&&cells[y][x].item; if(!it) continue; const u=it.userData;
    if(u.flower){ const want=occupied(x,y)||beetleAt(state,x,y)>=0?.35:1; if(u.pressed!==want){ u.pressed=want; const f=u.flower, s0=f.scale.y; if(animate) tween(180,e=>{ f.scale.y=s0+(want-s0)*e; }); else f.scale.y=want; } }
    // an open hedge sinks to a low cushion and pulls in from the tile edges, so grass shows round it even from above
    if(u.hedge){ const want=occupied(x,y)?.06:open?.22:1, wide=want<1?.66:1; if(u.hedgeH!==want){ if(u.hedgeH!==undefined) changed=true; u.hedgeH=want; const h=u.hedge, s0=h.scale.y, w0=h.scale.x;
        if(animate) tween(300,e=>{ h.scale.y=Math.max(.06,s0+(want-s0)*e); const w=w0+(wide-w0)*e; h.scale.x=h.scale.z=w; h.position.y=-(1-h.scale.y)*.06; }); else { h.scale.set(wide,want,wide); h.position.y=-(1-want)*.06; } } } }
  if(changed&&animate){ sfx(open?'hedgeOpen':'hedgeClose'); if(open) bumpStat('hedges'); }
  syncPetals(animate); syncSoil(animate); }
function removeObj(o){ if(o&&o.parent) o.parent.remove(o); }
// ---------- snails ----------
let snailMeshes=[];
function makeSnail(){ const g=new THREE.Group(); const inner=new THREE.Group(); g.add(inner); g.userData.inner=inner;
  const bodyM=toon(0xF6E2B0), shellM=toon(0xC9A0E6), spiralM=toon(0xA67CCB);
  const body=new THREE.Mesh(sph(.16,24,16),bodyM); body.scale.set(.85,.55,1.75); body.position.set(0,.09,.04); body.castShadow=true; outline(body,.02); inner.add(body);
  const head=new THREE.Mesh(sph(.1,20,14),bodyM); head.position.set(0,.15,.25); head.castShadow=true; outline(head,.018); inner.add(head);
  const shell=new THREE.Mesh(sph(.19,24,18),shellM); shell.position.set(0,.27,-.04); shell.scale.set(.82,1,1); shell.castShadow=true; outline(shell,.022); inner.add(shell);
  for(const s of [-1,1]){ const sp=new THREE.Mesh(new THREE.TorusGeometry(.1,.022,8,24),spiralM); sp.position.set(s*.15,.27,-.04); sp.rotation.y=Math.PI/2; inner.add(sp);
    const sp2=new THREE.Mesh(sph(.04,10,8),spiralM); sp2.position.set(s*.155,.27,-.04); sp2.scale.x=.5; inner.add(sp2); }
  const eyes=[]; for(const s of [-1,1]){ const st=new THREE.Group(); st.position.set(s*.045,.22,.28); st.rotation.z=-s*.25; st.rotation.x=-.25; inner.add(st);
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.013,.016,.14,8),bodyM); stalk.position.y=.07; st.add(stalk);
    const e=new THREE.Mesh(sph(.04,14,10),m('eye')); e.position.y=.15; outline(e,.012); st.add(e);
    const pu=new THREE.Mesh(sph(.022,10,8),m('pupil')); pu.position.set(0,0,.025); e.add(pu); eyes.push(st); }
  g.userData.eyes=eyes;
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.025,.007,6,12,Math.PI),m('pupil')); smile.position.set(0,.13,.345); smile.rotation.z=Math.PI; inner.add(smile);
  board.add(g); return g; }
const snailYaw=n=>Math.atan2(n.dx,n.dy);
// ---------- beetles: round, sturdy, a little grumpy about being pushed ----------
let beetleMeshes=[];
function makeBeetle(){ const g=new THREE.Group(), size=new THREE.Group(), inner=new THREE.Group(); size.scale.setScalar(1.15); g.add(size); size.add(inner); g.userData.inner=inner;
  // the solid body (shell, seam, spots, neck plate, head, horn) is one merged mesh plus its outline
  const body=new THREE.Group();
  const shell=new THREE.Mesh(sph(.28,28,20),m('beetle')); shell.scale.set(1,.76,1); shell.position.set(0,.19,-.05); outline(shell,.02); body.add(shell);
  // a darker rim where the shell meets the body, and the seam between the two wing covers
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.272,.026,8,32),m('beetleDark')); rim.rotation.x=Math.PI/2; rim.position.set(0,.12,-.05); body.add(rim);
  const seam=new THREE.Mesh(new THREE.TorusGeometry(.283,.012,6,28,Math.PI),m('beetleDark')); seam.rotation.y=Math.PI/2; seam.scale.set(1,.76,1); seam.position.set(0,.19,-.05); body.add(seam);
  // pale spots sitting on the shell surface
  const C0=new THREE.Vector3(0,.19,-.05);
  for(const sd of [-1,1]) for(const [a,e,r] of [[.55,.95,.055],[.95,.5,.045],[.3,.45,.04]]){ const dir=new THREE.Vector3(sd*Math.sin(a)*Math.cos(e),Math.sin(e),-Math.cos(a)*Math.cos(e)*.2-.25).normalize();
    const pos=new THREE.Vector3(dir.x*.28,dir.y*.28*.76,dir.z*.28).add(C0); const sp=new THREE.Mesh(sph(r,12,8),m('beetleSpot')); sp.scale.set(1,.3,1); sp.position.copy(pos);
    sp.lookAt(pos.clone().add(new THREE.Vector3(dir.x,dir.y/.76,dir.z))); sp.rotateX(Math.PI/2); body.add(sp); }
  const neck=new THREE.Mesh(sph(.17,20,14),m('beetleDark')); neck.scale.set(1.15,.72,.78); neck.position.set(0,.17,.22); outline(neck,.016); body.add(neck);
  const head=new THREE.Mesh(sph(.16,22,16),m('beetleHead')); head.position.set(0,.17,.37); outline(head,.016); body.add(head);
  // a little rhino horn: rises from the top of the head and curls forward, thinning to a rounded tip
  const hornPts=[]; for(let k=0;k<=8;k++){ const t=k/8, a=t*1.35; hornPts.push(new THREE.Vector3(0,.29+Math.sin(a)*.13,.33+(1-Math.cos(a))*.13)); }
  const hornPath=new THREE.CatmullRomCurve3(hornPts), hornG=new THREE.TubeGeometry(hornPath,12,.04,10,false), hp=hornG.attributes.position;
  // taper the tube toward the tip
  for(let k=0;k<hp.count;k++){ const ring=Math.floor(k/11), t=ring/12, c=hornPath.getPointAt(Math.min(1,t)); const f=1-t*.6; hp.setXYZ(k,c.x+(hp.getX(k)-c.x)*f,c.y+(hp.getY(k)-c.y)*f,c.z+(hp.getZ(k)-c.z)*f); }
  hornG.computeVertexNormals(); hornG.computeBoundingSphere(); const hc=hornG.boundingSphere.center.clone(); hornG.translate(-hc.x,-hc.y,-hc.z); // centred, so its outline scales in place
  const horn=new THREE.Mesh(hornG,m('beetleDark')); horn.position.copy(hc); outline(horn,.008); body.add(horn);
  const hb=new THREE.Mesh(sph(.045,12,8),m('beetleDark')); hb.position.copy(hornPts[0]); body.add(hb);
  const tip=new THREE.Mesh(sph(.018,8,6),m('beetleSpot')); tip.position.copy(hornPts[8]); body.add(tip);
  inner.add(merged(body,1));
  // a soft gloss on the shell
  const gloss=new THREE.Mesh(sph(.07,12,8),MC.beetleGloss||(MC.beetleGloss=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthWrite:false})));
  gloss.scale.set(1.3,.35,.8); gloss.position.set(-.1,.385,0); gloss.rotation.z=.35; inner.add(gloss);
  // the face, on the front of the head: big eyes that follow the worm, closed arcs for blinks and bumps
  const face=new THREE.Group(); face.position.set(0,.19,.49); inner.add(face); const F={eyes:[],pupils:[],arcs:[]}; g.userData.face=F;
  for(const sd of [-1,1]){ const e=new THREE.Mesh(sph(.058,14,10),m('eye')); e.position.set(sd*.062,.03,0); outline(e,.012); face.add(e);
    const pu=new THREE.Mesh(sph(.03,10,8),m('pupil')); pu.position.set(0,0,.042); e.add(pu); const hl=new THREE.Mesh(sph(.011,6,4),m('eye')); hl.position.set(.012,.012,.026); pu.add(hl);
    const arc=new THREE.Mesh(new THREE.TorusGeometry(.036,.009,6,12,Math.PI),m('pupil')); arc.position.set(sd*.062,.03,.04); arc.visible=false; face.add(arc);
    const ck=new THREE.Mesh(sph(.028,8,6),new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.55})); ck.position.set(sd*.1,-.04,.0); ck.scale.set(1,.55,.4); face.add(ck);
    F.eyes.push(e); F.pupils.push(pu); F.arcs.push(arc); }
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.022,.007,6,12,Math.PI),m('pupil')); smile.position.set(0,-.045,.05); smile.rotation.z=Math.PI; face.add(smile); F.smile=smile;
  const oo=new THREE.Mesh(new THREE.TorusGeometry(.016,.007,6,12),m('pupil')); oo.position.set(0,-.05,.05); oo.visible=false; face.add(oo); F.oo=oo;
  // antennae and six stubby legs, each on a pivot so they can wiggle
  const ants=[]; for(const sd of [-1,1]){ const a=new THREE.Group(); a.position.set(sd*.09,.27,.38); a.rotation.set(-.2,0,-sd*.75); inner.add(a);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.009,.011,.1,6),m('beetleLeg')); st.position.y=.05; a.add(st);
    const bl=new THREE.Mesh(sph(.022,8,6),m('beetleSpot')); bl.position.y=.105; outline(bl,.008); a.add(bl); ants.push(a); }
  g.userData.ants=ants;
  const legs=[]; for(const sd of [-1,1]) for(const z of [.15,-.02,-.19]){ const lg=new THREE.Group(); lg.position.set(sd*.21,.08,z); lg.rotation.z=sd*1.15; lg.rotation.y=sd*z*1.2; inner.add(lg);
    const l=new THREE.Mesh(new THREE.CylinderGeometry(.032,.028,.09,8),m('beetleLeg')); l.position.y=-.045; lg.add(l);
    const ft=new THREE.Mesh(sph(.036,10,8),m('beetleLeg')); ft.position.y=-.095; ft.scale.set(1,.65,1.25); lg.add(ft); lg.userData.sd=sd; legs.push(lg); }
  g.userData.legs=legs; g.userData.blink=2+Math.random()*3; g.userData.ph=Math.random()*6;
  g.traverse(o=>{ if(o.isMesh&&o.material!==lineMat&&o.material!==MC.beetleGloss) o.castShadow=true; });
  board.add(g); return g; }
function beetleFace(b,mode){ const F=b.userData.face; if(!F) return; b.userData.mood=mode;
  const shut=mode==='oof'||mode==='happy'; F.eyes.forEach(e=>e.visible=!shut); F.arcs.forEach(a=>{ a.visible=shut; a.rotation.z=mode==='happy'?0:Math.PI; });
  F.smile.visible=mode!=='oof'&&mode!=='wow'; F.oo.visible=mode==='oof'||mode==='wow'; }
// face the camera by default; once pushed, face back toward the worm that pushed it
function buildBeetles(){ beetleMeshes.forEach(g=>{ disposeTree(g); removeObj(g); }); beetleMeshes=(state.beetles||[]).map(b=>{ const g=makeBeetle(); g.position.copy(wp(b.x,b.y,0)); g.rotation.y=camYaw*Math.PI/180; beetleFace(g,'idle'); return g; }); }
// undo, restart and resume: put the beetles back where the state says, without rebuilding them
function snapBeetles(){ const bs=state.beetles||[]; if(beetleMeshes.length!==bs.length) return buildBeetles();
  bs.forEach((b,i)=>{ const g=beetleMeshes[i]; g.userData.moving=false; g.userData.scrabble=0; g.userData.inner.scale.set(1,1,1); g.position.copy(wp(b.x,b.y,0)); beetleFace(g,'idle'); }); }
// shoved along its path: it turns to face the worm, scrabbles backwards with its eyes squeezed shut, then looks up
function pushBeetle(p,dur){ const g=beetleMeshes[p.i]; if(!g) return; const pts=[p.from,...p.path].map(q=>wp(q[0],q[1],0));
  const dx=pts[1].x-pts[0].x, dz=pts[1].z-pts[0].z, face=Math.atan2(-dx,-dz); sfx('push'); dustPuff(pts[0]);
  if(reduceMotion){ g.position.copy(pts[pts.length-1]); g.rotation.y=face; return; }
  const n=pts.length-1, total=dur*(n>1?.6+n*.55:1), r0=g.rotation.y; let dr=face-r0; dr=((dr+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  g.userData.moving=true; beetleFace(g,'oof'); const inner=g.userData.inner;
  tween(total,(e,k)=>{ const f=Math.min(n-1e-6,k*n), j=Math.floor(f), t=f-j, a=pts[j], b=pts[j+1];
    g.position.lerpVectors(a,b,n>1?t:e); g.rotation.y=r0+dr*Math.min(1,k*3);
    const hop=n>1?Math.sin(k*Math.PI)*.05:Math.sin(t*Math.PI)*.07; g.position.y=hop;
    const sq=Math.sin(k*Math.PI); inner.scale.set(1+sq*.08,1-sq*.12,1+sq*.06); g.userData.scrabble=1; },
    ()=>{ g.position.copy(pts[n]); g.position.y=0; g.rotation.y=face; inner.scale.set(1,1,1); g.userData.moving=false; g.userData.scrabble=0;
      beetleFace(g,n>1?'wow':'idle'); g.userData.moodT=n>1?1.2:0; if(n>1) burst(pts[n],C.beetleSpot); dustPuff(pts[n]); }); }
// tried to push it into something: a little head shake
function beetleNope(i){ const g=beetleMeshes[i]; if(!g||reduceMotion) return; const r0=g.rotation.y; beetleFace(g,'oof'); g.userData.moodT=.6;
  tween(360,(e,k)=>{ g.rotation.y=r0+Math.sin(k*Math.PI*4)*.18*(1-k); },()=>{ g.rotation.y=r0; }); }
function updateBeetles(dt){ const sec=dt/1000, hp=segMeshes[0]&&segMeshes[0].position;
  beetleMeshes.forEach((g,i)=>{ const u=g.userData, F=u.face, t=idleT+u.ph;
    if(u.moodT>0){ u.moodT-=sec; if(u.moodT<=0) beetleFace(g,'idle'); }
    // sitting on a flower makes a beetle very content
    const b=state.beetles&&state.beetles[i]; if(b&&!u.moving&&u.mood==='idle'&&tileAt(state,b.x,b.y)==='B') beetleFace(g,'happy');
    if(b&&!u.moving&&u.mood==='happy'&&tileAt(state,b.x,b.y)!=='B') beetleFace(g,'idle');
    if(reduceMotion) return;
    u.inner.position.y=u.moving?0:Math.sin(t*2.1)*.008;
    u.ants.forEach((a,j)=>{ a.rotation.x=-.35+Math.sin(t*3+j)*.12; });
    u.legs.forEach((l,j)=>{ l.rotation.x=u.scrabble?Math.sin(idleT*40+j*2.1)*.6:Math.sin(t*1.3+j)*.05; });
    // eyes follow the worm's head, and blink now and then
    if(hp&&F){ const lp=g.worldToLocal(hp.clone()); const ax=Math.max(-.012,Math.min(.012,lp.x*.02)), ay=Math.max(-.01,Math.min(.01,(lp.y-.2)*.02)); F.pupils.forEach(p=>{ p.position.x=ax; p.position.y=ay; }); }
    u.blink-=sec; let bl=1; if(u.blink<0){ bl=Math.max(.1,Math.abs(u.blink+.07)/.07); if(u.blink<-.14) u.blink=2+Math.random()*3.5; }
    if(F) F.eyes.forEach(e=>e.scale.set(1,bl,1)); }); }
function buildSnails(){ snailMeshes.forEach(removeObj); snailMeshes=(state.snails||[]).map(n=>{ const s=makeSnail(); s.userData.inner.scale.setScalar(1); s.children[0].scale.setScalar(1.4); s.position.copy(wp(n.x,n.y,0)); s.rotation.y=snailYaw(n); return s; }); }
function syncSnails(animate,ev){ const ss=state.snails||[]; if(snailMeshes.length!==ss.length) return buildSnails();
  ss.forEach((n,i)=>{ const s=snailMeshes[i], to=wp(n.x,n.y,0), yaw=snailYaw(n);
    if(!animate||reduceMotion){ s.position.copy(to); s.rotation.y=yaw; return; }
    const from=s.position.clone(), r0=s.rotation.y; const turned=ev&&ev.snails&&ev.snails[i]&&ev.snails[i].turned;
    if(!turned){ trail(from,to); tween(260,(e,k)=>{ s.position.lerpVectors(from,to,e); s.userData.inner.scale.set(1.4,1.4*(1-Math.sin(k*Math.PI)*.08),1.4*(1+Math.sin(k*Math.PI)*.12)); },()=>s.userData.inner.scale.setScalar(1.4)); }
    else { sfx('snail'); let d=yaw-r0; d=((d+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; if(Math.abs(d)<.01) d=Math.PI;
      tween(380,(e,k)=>{ s.rotation.y=r0+d*e; s.userData.inner.position.y=Math.sin(k*Math.PI)*.05; },()=>{ s.rotation.y=yaw; s.userData.inner.position.y=0; }); } }); }
const slimeTex=canvasTex(128,32,c=>{
  const g=c.createLinearGradient(0,0,0,32); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.3,'rgba(235,248,255,.75)'); g.addColorStop(.5,'rgba(255,255,255,1)'); g.addColorStop(.7,'rgba(235,248,255,.75)'); g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g; c.beginPath(); c.roundRect?c.roundRect(2,0,124,32,16):c.rect(2,0,124,32); c.fill(); });
// where the strip crosses the gap between two tiles it thins to a strand and sags a little, instead of a flat bar floating over it
const slimeGap=s=>{ const d=Math.abs(s-.56)/.12; return d>=1?0:(1+Math.cos(d*Math.PI))/2; };
function trail(from,to){ if(reduceMotion) return; const dx=to.x-from.x, dz=to.z-from.z, len=Math.hypot(dx,dz)+.12;
  const mt=new THREE.MeshBasicMaterial({map:slimeTex,color:0xF2FAFF,transparent:true,opacity:.7,depthWrite:false});
  const t=new THREE.Group(); t.position.set(from.x-dx/Math.hypot(dx,dz)*.06,.012,from.z-dz/Math.hypot(dx,dz)*.06); t.rotation.y=Math.atan2(-dz,dx);
  const geo=new THREE.PlaneGeometry(1,.2,18,1).translate(.5,0,0), pa=geo.attributes.position;
  const strip=new THREE.Mesh(geo,mt); strip.rotation.x=-Math.PI/2; strip.scale.x=.01; t.add(strip); board.add(t);
  const done=kill(t);
  tween(260,e=>{ const L=Math.max(.01,e*len); strip.scale.x=L; for(let v=0;v<pa.count;v++){ const b=slimeGap(pa.getX(v)*L); pa.setY(v,(v<pa.count/2?.1:-.1)*(1-.65*b)); pa.setZ(v,-.02*b); } pa.needsUpdate=true; },
    ()=>tween(2600,(e,k)=>{ mt.opacity=.7*(1-k); },()=>{ mt.dispose(); geo.dispose(); done(); })); }
function dent(x,y){ const d=new THREE.Mesh(new THREE.CircleGeometry(.36,24),new THREE.MeshBasicMaterial({color:C.soilDark})); d.rotation.x=-Math.PI/2; d.position.copy(wp(x,y,-.215));
  // a few crumbs of the dry patch lie in the hollow it left
  for(let i=0;i<4;i++){ const a=i*1.7+x*.9+y*1.3, r=.07+(i%2)*.15, c=new THREE.Mesh(sph(.04+.012*(i%3),10,8),m('dry')); c.scale.z=.5; c.position.set(Math.cos(a)*r,Math.sin(a)*r,.012); d.add(c); }
  board.add(d); return d; }
function syncBoard(animate){
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){
    const cell=cells[y][x], ch=state.grid[y][x]; if(cell.ch===ch) continue;
    const old=cell.ch; cell.ch=ch;
    if(animate && '=|'.includes(old) && '=|'.includes(ch) && cell.tile && cell.tile.userData.bridge){ const br=cell.tile.userData.bridge, r0=br.rotation.y;
      tween(520,(e)=>{ br.rotation.y=r0+e*Math.PI/2; br.position.y=Math.sin(e*Math.PI)*.12; },()=>{ br.position.y=0; }); continue; }
    if(animate && old==='x' && ch===' '){ const t=cell.tile; cell.tile=dent(x,y); sfx('crumble'); dustPuff(wp(x,y,.05));
      tween(500,(e)=>{ t.position.y=-e*.32; t.scale.set(1-e*.25,1,1-e*.25); },kill(t)); continue; }
    if(animate && old==='C' && ch==='c'){ react('grin',800); { const bl=bloom(.01); cell.item.add(bl); tween(500,(e,k)=>{ const t=Math.min(1,k*1.2); bl.scale.setScalar(Math.max(.01,.9*(1+Math.sin(t*Math.PI)*.3)*t)); }); } cell.item.userData.flag.material=toon(C.flagDone,{side:THREE.DoubleSide}); sfx('flag');
      const it=cell.item; tween(380,(e,k)=>{ it.scale.setScalar(1+Math.sin(k*Math.PI)*.35); }); burst(wp(x,y,.6),C.flagDone); continue; }
    if(animate && cell.item && ch==='.'){ const it=cell.item; cell.item=null;
      if(old==='G'){ sfx('gate'); const door=it.userData.door; burst(it.position.clone().setY(.45),C.key);
        // the door flies open while the whole gate shrinks away: the worm crawls right through where it stood
        tween(400,(e,k)=>{ const sw=Math.min(1,k*2.4), sh=Math.min(1,Math.max(0,(k-.04)/.7)); door.rotation.y=-(1-(1-sw)*(1-sw))*1.9; it.scale.setScalar(Math.max(.01,1-sh*sh*(3-2*sh))); },kill(it)); }
      else { sfx(old==='+'?'grow':old==='-'?'shrink':'key'); react(old==='+'?'joy':old==='-'?'wow':'grin'); burst(it.position.clone().setY(.4), old==='+'?C.peach:old==='-'?C.cap:C.key);
        tween(240,(e)=>{ it.scale.setScalar(Math.max(.01,1+e*.5-e*1.4)); it.position.y=e*.35; },kill(it)); }
      continue; }
    removeObj(cell.tile); removeObj(cell.item);
    cell.tile = ch===' '?null:makeTile(x,y,ch); cell.item=makeItem(x,y,ch);
    const pops=[cell.tile,cell.item].filter(Boolean); pops.forEach(p=>p.scale.setScalar(.7));
    tween(220,(e)=>pops.forEach(p=>p.scale.setScalar(.7+.3*e)));
  }
}
// every sprite shares three's one quad; keep it when a patch's meshes are freed
const spriteGeo=new THREE.Sprite().geometry;
// a key's twinkles: a four-pointed star with a warm rim, so it reads against the gold key and the grass
const sparkTex=canvasTex(64,64,c=>{ c.translate(32,32);
  const star=(R,r)=>{ c.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4-Math.PI/2, d=i%2?r:R; c.lineTo(Math.cos(a)*d,Math.sin(a)*d); } c.closePath(); };
  star(29,7); c.fillStyle='#F2A93B'; c.fill(); star(22,4.5); c.fillStyle='#FFFDF2'; c.fill(); });
let fxTimer=0; const sparkMat=new THREE.SpriteMaterial({map:sparkTex,transparent:true,depthWrite:false});
function sparkle(p){ const s=new THREE.Sprite(sparkMat); s.position.set(p.x+(Math.random()-.5)*.45,.3+Math.random()*.45,p.z+(Math.random()-.5)*.45); s.scale.setScalar(.01); fx.add(s);
  const sz=.13+Math.random()*.07; tween(600,(e,k)=>{ s.scale.setScalar(Math.max(.01,sz*Math.sin(k*Math.PI))); },kill(s)); }
const ringGeo=new THREE.RingGeometry(.03,.05,20);
function splash(){ const spots=[]; for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const ch=state.grid[y][x]; if(ch!==' ') spots.push([x,y,ch]); }
  if(!spots.length) return; const s=spots[Math.floor(Math.random()*spots.length)]; const wet=s[2]==='~'||s[2]==='='||s[2]==='|'||s[2]==='w';
  const p=wp(s[0]+(Math.random()-.5)*.8,s[1]+(Math.random()-.5)*.8, s[2]==='~'?-.085:s[2]==='s'?-.2:.012);
  const mt=new THREE.MeshBasicMaterial({color:0xEAF6FF,transparent:true,opacity:.8,depthWrite:false}); const r=new THREE.Mesh(ringGeo,mt); r.rotation.x=-Math.PI/2; r.position.copy(p); fx.add(r);
  tween(450,(e,k)=>{ r.scale.setScalar(1+k*(wet?4:2.5)); mt.opacity=.8*(1-k); },kill(r)); }
function burst(pos,color){
  if(reduceMotion) return; const geo=sph(.05,10,8), mt=toon(color);
  for(let i=0;i<10;i++){ const p=new THREE.Mesh(geo,mt); p.position.copy(pos); fx.add(p);
    const a=i/10*Math.PI*2, v=new THREE.Vector3(Math.cos(a)*.035,.05+Math.random()*.03,Math.sin(a)*.035);
    tween(520,(e,k)=>{ p.position.add(v); v.y-=.006; p.scale.setScalar(Math.max(.01,1-k)); },kill(p)); }
}
function dustPuff(pos,col=0xE6D2A8){ if(reduceMotion) return; const mt=toon(col,{transparent:true,opacity:.9,depthWrite:false});
  for(let i=0;i<8;i++){ const p=new THREE.Mesh(sph(.09,12,8),mt), a=i/8*Math.PI*2+Math.random()*.5, s0=.75+Math.random()*.5; p.position.copy(pos); fx.add(p); const done=kill(p);
    tween(650,(e,k)=>{ const r=.16+e*.34; p.position.set(pos.x+Math.cos(a)*r,pos.y+Math.sin(Math.min(1,k*1.5)*Math.PI/2)*.2,pos.z+Math.sin(a)*r); p.scale.setScalar(s0*(.55+e*.85)); mt.opacity=.85*Math.min(1,(1-k)*2); },
      ()=>{ done(); if(i===7) mt.dispose(); }); } }

// ---------- pollen and soft soil ----------
// Pollen flowers (P poppy, Y buttercup, U bluebell) are low cupped blooms with a fuzzy centre and motes above.
// Petal gates (p, y, u) are tall closed buds that fold down flat while the worm wears their colour or lies in them.
// The worm's body and head blend toward its pollen colour, with a few motes drifting round it.
const POLL={P:{n:'poppy',col:C.pollenP,light:C.pollenPLight,dark:C.pollenPDark},Y:{n:'buttercup',col:C.pollenY,light:C.pollenYLight,dark:C.pollenYDark},U:{n:'bluebell',col:C.pollenU,light:C.pollenULight,dark:C.pollenUDark}};
const polMat=(ch,k='col')=>MC['pol'+ch+k]||(MC['pol'+ch+k]=toon(POLL[ch][k]));
let polItems=[];
function makePollenFlower(g,ch,x,y){ const fl=new THREE.Group(); fl.position.y=.02; fl.rotation.y=(x*3+y*5)%6*.5; g.add(fl); g.userData.pollenFlower=fl; g.userData.pcol=ch;
  for(let i=0;i<3;i++){ const a=i/3*Math.PI*2+.5, lf=new THREE.Mesh(sph(.12,14,8),m('leaf')); lf.scale.set(1.7,.16,.6); lf.position.set(Math.cos(a)*.31,0,Math.sin(a)*.31); lf.rotation.y=-a; outline(lf,.01); fl.add(lf); }
  // six cupped petals, tips turned up, round a fuzzy dome dotted with darker stamens
  for(let i=0;i<6;i++){ const pv=new THREE.Group(); pv.rotation.y=-i/6*Math.PI*2; fl.add(pv);
    const pt=new THREE.Mesh(sph(.13,18,12),polMat(ch)); pt.scale.set(1.35,.32,.95); pt.position.set(.19,.08,0); pt.rotation.z=.42; pt.castShadow=true; outline(pt,.012); pv.add(pt); }
  const c=new THREE.Mesh(sph(.13,20,14),polMat(ch,'light')); c.scale.set(1,.62,1); c.position.y=.11; outline(c,.012); fl.add(c);
  for(let i=0;i<11;i++){ const a=i*2.4, r=i?.035+(i%3)*.027:0, d=new THREE.Mesh(sph(.02,8,6),polMat(ch,'dark')); d.position.set(Math.cos(a)*r,.11+.0806*Math.sqrt(Math.max(0,1-(r/.13)**2)),Math.sin(a)*r); fl.add(d); }
  const motes=[]; for(let i=0;i<4;i++){ const mo=new THREE.Mesh(sph(.026,8,6),polMat(ch,'light')); mo.userData.ph=i*1.6+x+y*.7; fl.add(mo); motes.push(mo); }
  polItems.push({motes,fl}); }
function makePetalGate(g,ch,x,y){ const P=ch.toUpperCase(), gt=new THREE.Group(); gt.rotation.y=(x+y)%2*.5; g.add(gt); g.userData.petalGate=gt; g.userData.pcol=P;
  // a ring of the colour on the grass, so even a folded gate says whose it is
  const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.43,36),polMat(P,'light')); ring.rotation.x=-Math.PI/2; ring.position.y=.006; ring.receiveShadow=true; gt.add(ring);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.07,20),m('leaf')); base.position.y=.035; outline(base,.012); gt.add(base);
  for(let i=0;i<6;i++){ const a=(i+.5)/6*Math.PI*2, se=new THREE.Mesh(sph(.08,10,8),m('leaf')); se.scale.set(1.5,.3,.7); se.position.set(Math.cos(a)*.26,.03,Math.sin(a)*.26); se.rotation.y=-a; gt.add(se); }
  const petals=[]; for(let i=0;i<6;i++){ const h=new THREE.Group(); h.rotation.y=-i/6*Math.PI*2; gt.add(h);
    const pv=new THREE.Group(); pv.position.set(.16,.05,0); h.add(pv);
    const pt=new THREE.Mesh(sph(.18,20,14),polMat(P)); pt.scale.set(.32,2.3,1.15); pt.castShadow=true; outline(pt,.012); pv.add(pt);
    const vein=new THREE.Mesh(sph(.18,12,10),polMat(P,'light')); vein.scale.set(.2,.8,.16); vein.position.x=-.14; pt.add(vein); petals.push(pv); }
  g.userData.petals=petals; setPetals(g.userData,0); }
// o: 0 is a closed bud (tips leaning in to meet), 1 is folded flat round the edge of the tile
function setPetals(u,o){ for(const pv of u.petals){ pv.rotation.z=.27+(-1.45-.27)*o; const pt=pv.children[0], sy=2.3-(2.3-.85)*o; pt.scale.y=sy; pt.position.y=.18*sy; } u.open=o; }
function syncPetals(animate){ if(!state) return; let opened=false, closed=false;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const it=cells[y]&&cells[y][x]&&cells[y][x].item; if(!it||!it.userData.petalGate) continue; const u=it.userData;
    const want=state.pollen===u.pcol||occupied(x,y)?1:0; if(u.want===want) continue; const first=u.want===undefined; u.want=want;
    if(animate&&!first){ const o0=u.open; if(want){ opened=true; burst(wp(x,y,.5),POLL[u.pcol].light); } else closed=true;
      // opening overshoots a little, like a bloom springing open
      tween(want?460:300,(e,k)=>setPetals(u,o0+(want-o0)*(want?Math.min(1.08,e*1.08)-Math.max(0,e-.92):e))); }
    else setPetals(u,want); }
  if(opened) sfx('bloom'); else if(closed) sfx('bud'); }
function petalsNope(x,y){ const it=cells[y]&&cells[y][x]&&cells[y][x].item; if(!it||!it.userData.petalGate||reduceMotion) return; const gt=it.userData.petalGate, r0=gt.rotation.y;
  tween(320,(e,k)=>{ gt.rotation.y=r0+Math.sin(k*Math.PI*4)*.12*(1-k); },()=>{ gt.rotation.y=r0; }); }
// soft soil: a tilled bed (raised like grass, so it reads as somewhere to go) with a heap that rises while the worm is under it
function softDome(){ const g=new THREE.SphereGeometry(.4,26,10,0,Math.PI*2,0,Math.PI/2), pa=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i); const a=Math.atan2(v.z,v.x), f=1+.07*Math.sin(5*a)+.04*Math.sin(9*a+1.3)+.05*Math.sin(v.y*30); pa.setXYZ(i,v.x*f,v.y,v.z*f); }
  g.computeVertexNormals(); return g; }
function makeSoftTile(g,x,y){ const top=new THREE.Mesh(TURF,(x+y)%2?m('turf1'):m('turf2')); top.position.y=-.15; top.receiveShadow=true; top.castShadow=true; outlineBox(top,.02,.94,.3,.94); g.add(top);
  // a low molehill of loose earth on the grass; it swells up while the worm burrows under it
  const md=new THREE.Group(); md.rotation.y=(x*7+y*3)%6; g.add(md); g.userData.mound=md;
  const dome=new THREE.Mesh(GC.softDome||(GC.softDome=softDome()),m('softSoil')); dome.castShadow=true; dome.receiveShadow=true; outline(dome,.012,.4); md.add(dome);
  for(let i=0;i<9;i++){ const a=i*2.4, r=i<3?.1+i*.04:.24+(i%3)*.05, c=new THREE.Mesh(sph(i%2?.045:.035,10,8),i%3?m('softClod'):m('softRidge')); c.position.set(Math.cos(a)*r,.0,Math.sin(a)*r); c.userData.r=r; c.scale.set(1,.65,.85); md.add(c); }
  g.userData.moundH=-1; setMound(g.userData,0); }
// v: 0 a flat molehill, 1 a heap with the worm under it (a little more for two passes), .45 a collar round the head
function setMound(u,v){ const md=u.mound, h=.17+.33*Math.min(1.25,v), w=.82+.18*Math.min(1,v); md.children[0].scale.set(w,h,w);
  for(const c of md.children.slice(1)){ const r=c.userData.r*w, k=Math.max(0,1-(r/.4)**2); c.position.y=.4*h*Math.sqrt(k)-.005; } u.moundV=v; }
// how deep an anchor at world position v sits under soft soil: 1 in the middle of a soft tile, easing to 0 at its edge
function soilDepth(v){ const gx=v.x+(state.w-1)/2, gy=v.z+(state.h-1)/2, x=Math.round(gx), y=Math.round(gy);
  if(tileAt(state,x,y)!==SOFT) return 0; const d=Math.max(Math.abs(gx-x),Math.abs(gy-y)); return 1-Math.min(1,Math.max(0,(d-.12)/.42)); }
function syncSoil(animate){ if(!state) return;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const t=cells[y]&&cells[y][x]&&cells[y][x].tile; if(!t||!t.userData.mound) continue; const u=t.userData;
    let n=0, head=false; state.segs.forEach((p,i)=>{ if(p[0]===x&&p[1]===y){ if(i) n++; else head=true; } });
    const want=n?(n>1?1.25:1):head?.45:0; if(u.moundH===want) continue; u.moundH=want; const v0=u.moundV;
    if(animate) tween(260,e=>setMound(u,v0+(want-v0)*e)); else setMound(u,want); } }
// the worm's pollen: its colour eases in, and a few motes drift round the body while it carries some
const DUST_K=.78, dustCol=new THREE.Color(), dustTarget=new THREE.Color(); let dustAmt=0, dustG=null;
MC.gameHead=toon(C.head);
const dusty=c=>dustAmt>.002?c.lerp(dustCol,DUST_K*dustAmt):c;
function snapPollen(){ const p=state&&POLL[state.pollen]; dustAmt=p?1:0; if(p) dustCol.setHex(p.col); }
function pollenPuff(pos,ch){ if(reduceMotion) return; const mt=polMat(ch,'light');
  for(let i=0;i<14;i++){ const p=new THREE.Mesh(sph(.03,8,6),mt), a=Math.random()*Math.PI*2, r=.25+Math.random()*.35, up=.25+Math.random()*.35; p.position.copy(pos); fx.add(p);
    tween(700+i*15,(e,k)=>{ p.position.set(pos.x+Math.cos(a)*r*e,pos.y+Math.sin(k*Math.PI)*up,pos.z+Math.sin(a)*r*e); p.scale.setScalar(Math.max(.01,1.4*(1-k*k))); },kill(p)); } }
function updatePollen(dt){ if(!state) return; const sec=dt/1000, k=1-Math.exp(-sec*5), p=POLL[state.pollen];
  if(p){ dustTarget.setHex(p.col); if(dustAmt<.02) dustCol.copy(dustTarget); else dustCol.lerp(dustTarget,k); }
  dustAmt+=((p?1:0)-dustAmt)*k; MC.gameHead.color.copy(m('head').color).lerp(dustCol,DUST_K*dustAmt);
  if(!dustG){ dustG=new THREE.Group(); wormG.add(dustG); const mt=MC.dustMote=new THREE.MeshBasicMaterial({color:0xffffff});
    for(let i=0;i<7;i++){ const mo=new THREE.Mesh(sph(.028,8,6),mt); mo.userData.ph=i*.9; dustG.add(mo); } }
  dustG.visible=dustAmt>.03&&!reduceMotion; if(dustG.visible){ MC.dustMote.color.copy(dustCol).lerp(WHITE,.4); const n=segMeshes.length;
    dustG.children.forEach((mo,i)=>{ const s=segMeshes[Math.min(n-1,Math.floor(i*n/7))]; if(!s){ mo.visible=false; return; } const ph=mo.userData.ph+idleT*1.3;
      mo.visible=soilDepth(s.position)<.3; mo.position.set(s.position.x+Math.cos(ph*1.7)*.24,s.position.y+.18+Math.sin(ph*2.3)*.1,s.position.z+Math.sin(ph*1.7)*.24); mo.scale.setScalar(dustAmt*(.7+.3*Math.sin(ph*3))); }); }
  for(const it of polItems) it.motes.forEach((mo,i)=>{ const ph=mo.userData.ph+idleT*.9; mo.position.set(Math.cos(ph)*.13,.3+.08*Math.sin(ph*1.7+i)+i*.03,Math.sin(ph)*.13); }); }

// ---------- weather ----------
let wet=0, rainLines=null, rainGain=null, riverGain=null;
const hemi=scene.children.find(o=>o.isHemisphereLight), amb=scene.children.find(o=>o.isAmbientLight);
const lawnDry=new THREE.Color(C.lawn), lawnWet=new THREE.Color(0x6E9E63); const cloudDry=new THREE.Color(C.cloud), cloudWet=new THREE.Color(C.rainCloud);
function buildRain(){
  if(rainLines){ removeObj(rainLines); rainLines=null; }
  if(!L.map.join('').includes('R')) return;
  const N=420, pos=new Float32Array(N*6), sp=new Float32Array(N); const W=state.w+4, D=state.h+4;
  for(let i=0;i<N;i++){ const x=(Math.random()-.5)*W, z=(Math.random()-.5)*D, y=Math.random()*5; pos.set([x,y,z,x+.03,y+.28,z+.03],i*6); sp[i]=5+Math.random()*3; }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.userData.sp=sp;
  rainLines=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xEAF6FF,transparent:true,opacity:0})); rainLines.frustumCulled=false; scene.add(rainLines);
}
function occupied(x,y){ return state.segs.some(p=>p[0]===x&&p[1]===y); }
function syncWeather(animate){
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y][x]; if(!c.tile) continue; const u=c.tile.userData;
    if(u.leaf){ const want=state.raining||occupied(x,y); if(u.leafOn!==want){ u.leafOn=want; const leaf=u.leaf, s0=leaf.scale.x, s1=want?1:.01; leaf.visible=true;
        if(animate){ tween(want?420:300,(e)=>{ leaf.scale.setScalar(s0+(s1-s0)*e); },()=>{ if(!want) leaf.visible=false; }); } else { leaf.scale.setScalar(s1); leaf.visible=want; } u.sprout.visible=true; } }
    if(u.water){ const want=state.raining&&!occupied(x,y); if(u.waterOn!==want){ u.waterOn=want; const w=u.water, s0=w.scale.x, s1=want?1:.01; w.visible=true;
        if(animate){ tween(500,(e)=>{ w.scale.setScalar(s0+(s1-s0)*e); },()=>{ if(!want) w.visible=false; }); } else { w.scale.setScalar(s1); w.visible=want; } } }
  }
  for(const row of cells) for(const c of row){ const u=c.item&&c.item.userData; if(u&&u.cloudMat){ u.cloudMat.color.set(state.raining?C.rainCloud:C.cloud); u.drops.visible=state.raining; if(u.cloudMouth) u.cloudMouth.rotation.z=state.raining?0:Math.PI; } }
  if(ac){ if(!rainGain){ const s=ac.createBufferSource(); if(!noiseBuf){ noise(.01,{vol:.0001}); } s.buffer=noiseBuf; s.loop=true; const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1400; rainGain=ac.createGain(); rainGain.gain.value=0; s.connect(f); f.connect(rainGain); rainGain.connect(master); s.start(); }
    rainGain.gain.setTargetAtTime(state.raining&&!muted?.07:0,ac.currentTime,.4);
    // a soft babble on patches with a river: band-passed noise whose level drifts slowly
    if(!riverGain){ const s2=ac.createBufferSource(); s2.buffer=noiseBuf; s2.loop=true; const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=650; f.Q.value=.8;
      const lfo=ac.createOscillator(), depth=ac.createGain(); lfo.frequency.value=.23; depth.gain.value=180; lfo.connect(depth); depth.connect(f.frequency); lfo.start();
      riverGain=ac.createGain(); riverGain.gain.value=0; s2.connect(f); f.connect(riverGain); riverGain.connect(master); s2.start(); }
    riverGain.gain.setTargetAtTime(flowTiles.length&&!muted?.035:0,ac.currentTime,.6); }
}
const themeMeta=document.querySelector('meta[name="theme-color"]'); let themeHex='';
function syncThemeColor(c){ const h='#'+c.getHexString(); if(h!==themeHex&&themeMeta){ themeHex=h; themeMeta.setAttribute('content',h); } }
// the garden is always lit like a bright day; the time of day sets the music's mood and
// brings out fireflies in the evening and at night
const tod={si:.55,hemi:.38,amb:[1,.96,.89],lawn:[1,1,1]};
let todName='day', fireflies=null;
function pickTod(){ if(typeof renderHome==='function'&&$('homeOv').classList.contains('show')) renderHome(); const h=new Date().getHours()+new Date().getMinutes()/60;
  const was=todName; todName= h>=6&&h<10?'morning' : h>=10&&h<17?'day' : h>=17&&h<20?'evening' : 'night'; if(was!==todName||!fireflies) buildFireflies(); }
// a soft round glow with a bright core, shared by every firefly
const glowTex=canvasTex(64,64,c=>{ const gr=c.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.18,'rgba(255,250,200,.95)'); gr.addColorStop(.45,'rgba(255,230,120,.35)'); gr.addColorStop(1,'rgba(255,220,100,0)'); c.fillStyle=gr; c.fillRect(0,0,64,64); });
function buildFireflies(){ if(fireflies){ disposeTree(fireflies); removeObj(fireflies); fireflies=null; } if(todName!=='night'&&todName!=='evening') return;
  fireflies=new THREE.Group(); const n=todName==='night'?18:8;
  for(let i=0;i<n;i++){ const f=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xFFF0A0,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending})); f.scale.setScalar(.26); f.userData={ph:Math.random()*10,r:1+Math.random()*4,s:.2+Math.random()*.3,y:.4+Math.random()*1.2}; fireflies.add(f); } scene.add(fireflies); }
function updateRain(dt){
  if(fireflies) fireflies.children.forEach(f=>{ const u=f.userData, t=idleT*u.s+u.ph; f.position.set(Math.cos(t)*u.r,u.y+Math.sin(t*2.3)*.25,Math.sin(t*1.4)*u.r*.8); f.material.opacity=.35+.55*Math.max(0,Math.sin(idleT*2+u.ph*3)); });
  wet+=((state&&state.raining?1:0)-wet)*(1-Math.exp(-dt/1000*2.5));
  lawnMat.color.setRGB(tod.lawn[0]*(1-.2*wet),tod.lawn[1]*(1-.12*wet),tod.lawn[2]*(1-.05*wet)); sun.intensity=tod.si-.22*wet; hemi.intensity=tod.hemi-.06*wet; amb.color.setRGB(tod.amb[0]*(1-.12*wet),tod.amb[1]*(1-.06*wet),tod.amb[2]);
  const lc=lawnDry.clone().lerp(lawnWet,wet).multiply(new THREE.Color(tod.lawn[0],tod.lawn[1],tod.lawn[2])); renderer.setClearColor(lc); syncThemeColor(lc);
  if(rainLines){ rainLines.material.opacity=.75*wet; rainLines.visible=wet>.02;
    if(rainLines.visible){ const a=rainLines.geometry.attributes.position, sp=rainLines.geometry.userData.sp, d=dt/1000;
      for(let i=0;i<sp.length;i++){ let y=a.array[i*6+1]-sp[i]*d; if(y<-.25) y+=5; a.array[i*6+1]=y; a.array[i*6+4]=y+.28; } a.needsUpdate=true; } }
  document.documentElement.style.setProperty('--wet',wet.toFixed(3));
}

// ---------- worm: smooth tapered body through the segment anchors ----------
const HEAD_R=.34;
function segR(i,n){ if(i===0) return .22; const t=(i-1)/Math.max(1,n-2); return .27-.1*t; }
function segY(i,n){ return i===0?HEAD_R:segR(i,n); }
function makeSeg(i,parent){
  const g=new THREE.Group();
  if(i===0){
    // the worm in a patch has its own head material, so pollen can tint it without touching the home worm
    const head=new THREE.Mesh(sph(HEAD_R,36,28),parent?m('head'):MC.gameHead); head.castShadow=true; outline(head,.03); g.add(head); g.userData.body=head;
    const face=new THREE.Group(); head.add(face);
    const F={eyes:[],arcs:[],squints:[],pupils:[],mouths:{}}; g.userData.face=F;
    const dark=m('pupil');
    for(const s of [-1,1]){
      const e=new THREE.Mesh(sph(.11,24,18),m('eye')); e.position.set(s*.13,.14,.24); outline(e,.018); face.add(e); F.eyes.push(e);
      const pu=new THREE.Mesh(sph(.062,18,14),dark); pu.position.set(0,0,.064); e.add(pu); F.pupils.push(pu);
      const hl=new THREE.Mesh(sph(.022,10,8),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(.024,.03,.048); pu.add(hl);
      const arc=new THREE.Mesh(new THREE.TorusGeometry(.06,.016,8,18,Math.PI),dark); arc.position.set(s*.13,.13,.31); arc.visible=false; face.add(arc); F.arcs.push(arc);
      // squeezed shut, > <, for a bump
      const sq=new THREE.Group(); sq.position.set(s*.13,.14,.315); sq.visible=false; face.add(sq); F.squints.push(sq);
      for(const sy of [-1,1]){ const dx=s*.07, dy=sy*.035, bar=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,Math.hypot(dx,dy)+.016,8),dark); bar.position.set(0,dy/2,0); bar.rotation.z=Math.atan2(-dx,dy); sq.add(bar); }
      const ck=new THREE.Mesh(sph(.055,14,10),cheekMat); ck.position.set(s*.21,-.04,.25); ck.scale.set(1,.55,.4); face.add(ck);
    }
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,8,18,Math.PI),dark); smile.position.set(0,-.06,.325); smile.rotation.z=Math.PI; face.add(smile); F.mouths.smile=smile;
    const grin=new THREE.Group(); grin.position.set(0,-.05,.31); face.add(grin); F.mouths.grin=grin;
    const gm=new THREE.Mesh(new THREE.SphereGeometry(.075,20,12,0,Math.PI*2,Math.PI/2,Math.PI/2),dark); gm.scale.set(1,.85,.5); grin.add(gm);
    const tg=new THREE.Mesh(sph(.04,14,10),toon(0xFF6F8E)); tg.position.set(0,-.045,.015); tg.scale.set(1,.55,.6); grin.add(tg);
    const o=new THREE.Mesh(new THREE.TorusGeometry(.03,.014,8,18),dark); o.position.set(0,-.07,.33); face.add(o); F.mouths.o=o;
    const flat=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.075,8),dark); flat.rotation.z=Math.PI/2; flat.position.set(0,-.06,.33); face.add(flat); F.mouths.flat=flat;
    const tongue=new THREE.Mesh(sph(.035,14,10),toon(0xFF7A98)); tongue.position.set(.02,-.1,.31); tongue.scale.set(1,1.2,.5); tongue.visible=false; face.add(tongue); F.tongue=tongue;
    const hat=new THREE.Group(); hat.position.set(0,.27,-.02); hat.rotation.x=-.18; head.add(hat); g.userData.hatSlot=hat; dressHat(g);
    const acc=new THREE.Group(); head.add(acc); g.userData.accSlot=acc; dressExtra(g);
    g.userData.expr='smile'; applyExpr(g,'smile');
  }
  (parent||wormG).add(g); return g;
}
const EXPRS=['grin','joy','wink','wow','sleepy','cheeky'];
let reactT=0, zT=0;
const zTex=canvasTex(64,64,c=>{ c.font='800 48px Grandstander, Nunito, sans-serif'; c.textAlign='center'; c.textBaseline='middle';
  c.lineWidth=8; c.strokeStyle='#FFF8EA'; c.strokeText('z',32,34); c.fillStyle='#5B4436'; c.fillText('z',32,34); });
function snore(h){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:zTex,transparent:true,depthWrite:false})); s.position.copy(h.position).add(new THREE.Vector3(.15,.45,0)); s.scale.setScalar(.01); fx.add(s);
  const x0=s.position.x; tween(1800,(e,k)=>{ s.position.y+=.004; s.position.x=x0+Math.sin(k*5)*.08; s.scale.setScalar(.12+k*.18); s.material.opacity=1-k; },kill(s)); }
function react(name,ms=900){ const h=segMeshes[0]; if(!h||!h.userData.face) return; applyExpr(h,name); reactT=ms/1000; }
function applyExpr(g,name){ const F=g.userData.face; if(!F) return; g.userData.expr=name;
  const open=[true,true], eyeY=[1,1]; let mouth='smile', tongue=false, pupilY=0;
  if(name==='grin') mouth='grin';
  if(name==='joy'){ open[0]=open[1]=false; mouth='grin'; }
  if(name==='wink'){ open[0]=false; tongue=true; }
  if(name==='wow'){ mouth='o'; }
  if(name==='sleepy'){ open[0]=open[1]=false; mouth='flat'; }
  if(name==='cheeky'){ tongue=true; mouth='flat'; }
  if(name==='oops'){ open[0]=open[1]=false; mouth='o'; }
  if(name==='yawn'){ open[0]=open[1]=false; mouth='o'; }
  F.mouths.o.scale.set(1,1,1);
  F.eyes.forEach((e,i)=>{ e.visible=open[i]; e.userData.baseY=eyeY[i]; e.userData.baseS=name==='wow'?1.15:1; });
  // closed eyes: happy arcs, relaxed upside-down arcs when sleepy, or squeezed > < for a bump
  const squeeze=name==='oops', relaxed=name==='sleepy';
  F.arcs.forEach((a,i)=>{ a.visible=!open[i]&&!squeeze; a.rotation.z=relaxed?Math.PI:0; a.position.y=relaxed?.17:.13; });
  if(F.squints) F.squints.forEach(q=>q.visible=squeeze);
  F.pupils.forEach(p=>p.position.y=pupilY);
  for(const k in F.mouths) F.mouths[k].visible=(k===mouth);
  F.tongue.visible=tongue;
}
function snapWorm(){
  act=null; segMeshes.forEach(removeObj); segMeshes=[]; tailExtras=[];
  const n=state.segs.length;
  state.segs.forEach((p,i)=>{ const s=makeSeg(i); s.position.copy(wp(p[0],p[1],segY(i,n))); segMeshes.push(s); });
  if(n>1){ const a=state.segs[0], b=state.segs[1]; const dx=a[0]-b[0], dy=a[1]-b[1]; if(Math.abs(dx)+Math.abs(dy)===1) headDir=[dx,dy]; }
  segMeshes[0].rotation.y=Math.atan2(headDir[0],headDir[1]); wormG.visible=true; lookPhase='off';
}
let tailExtras=[];
const tubeMat=new THREE.MeshToonMaterial({color:0xffffff,vertexColors:true,gradientMap:gradTex});
// patterns with edges are drawn per pixel from 'pg' (place along the worm, then the ring direction scaled by the
// radius), so they stay crisp and keep their size on the stage and in a patch, at any length: the soft groove
// between body rings (every pattern), Stripes, Bands, Spots (round pale spots on the back, alternating left and
// right of the spine, two to a segment) and Glitter (specks a fixed size in the world, a whole number of them
// around the body so there's no seam). fwidth(g) is about one pixel on the body, for edges that don't shimmer
const patU={value:0}, PAT_ID={stripes:1,spots:2,bands:3,glitter:4};
tubeMat.extensions={derivatives:true};
tubeMat.onBeforeCompile=sh=>{ sh.uniforms.uPat=patU;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 pg; varying vec3 vPg;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPg=pg;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uPat; varying vec3 vPg;').replace('#include <color_fragment>',`#include <color_fragment>
    float g=vPg.x, r=max(length(vPg.yz),.001), an=atan(vPg.z,vPg.y), px=max(fwidth(g),.0005), q=abs(fract(g*2.+.5)-.5)*.5, m=abs(.25-q);
    if(g>.4) diffuseColor.rgb*=1.-.07*(1.-smoothstep(0.,.05+px,q));
    if(g>.55 && uPat>.5 && uPat<1.5) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.5*(1.-smoothstep(.085-.012-px,.085+.012+px,m)));
    if(g>.55 && uPat>2.5 && uPat<3.5) diffuseColor.rgb*=1.-.18*(1.-smoothstep(.026-px,.026+px,m));
    if(uPat>1.5 && uPat<2.5){ float k=floor(g*2.+.5); if(k>1.5){ float a=an-1.5708-(mod(k,2.)>.5?.7:-.7); a=abs(mod(a+3.14159,6.28318)-3.14159);
      float d=length(vec2(g-k*.5,a*r)), R=.36*r; diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.6*(1.-smoothstep(R-px,R+px,d))); } }
    if(uPat>3.5){ vec2 c=vec2(g*8.,an*1.909859), id=floor(c), fr=fract(c)-.5; float h=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
      if(id.x>3.5 && h>.55){ vec2 o=vec2(fract(h*7.31),fract(h*13.7))-.5, cs=vec2(.125,r*.5236); float R=min(.016+.008*fract(h*3.7),.3*cs.y), d=length((fr-o*.4)*cs);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.9*(1.-smoothstep(R-px,R+px,d))); } }`); };
const capMat=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:gradTex});
const COL_A=new THREE.Color(0xFFB3C8), tmpC=new THREE.Color();
// the worm's blush, one per colour (WORM_COLS); kept in MC so disposeTree never frees it
const cheekMat=MC.wormCheek=new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.7});
// worm colours, earned with garden stars: [name, body, head, stars needed, cheek blush].
// Head and body share a hex: the head's toon sphere and the body's vertex colours render the same
// colour under the same light, so any difference shows as a seam at the neck.
// hats, earned by finishing chapters: [id, name, chapter index that unlocks it]. Each is built once and cloned.
const HATS=[['none','No hat',-1],['crown','Flower crown',0],['mush','Mushroom cap',1],['straw','Straw hat',2],['tophat','Top hat',3],['leaf','Leaf cap',4],['rainhat','Rain hat',5],
  ['acorn','Acorn cap',6],['bee','Bee antennae',7],['party','Party hat',8],['brolly','Tiny umbrella',9],['beret','Dewdrop beret',10],['bow','Ribbon bow',11],['gold','Garden crown',12],['beanie','Pompom beanie',13],['sunflower','Sunflower',14],['horn','Beetle horn',15],['shell','Snail shell',16],['pumpkin','Pumpkin hat',17],['bonnet','Petal bonnet',18],['miner','Miner\'s helmet',19],['gnome','Gnome hat',20],['explorer','Explorer\'s hat',21],
  ['sprout','Little sprout',-2,'Let the worm doze off 10 times',()=>(progress.stats.naps||0)>=10],
  ['teacup','Teacup',-2,'Finish a patch at tea time, 3 to 5 pm',()=>(progress.stats.teatime||0)>=1],
  ['nest','Bird\'s nest',-2,'Visit the garden on 7 different days',()=>(progress.stats.days||0)>=7],
  ['cloud','Little cloud',-2,'Start the rain 30 times',()=>(progress.stats.rains||0)>=30],
  ['chef','Chef hat',-2,'Eat 100 snacks',()=>(progress.stats.fruit||0)>=100],
  ['wizard','Wizard hat',-2,'30 patches, no hints',()=>Object.keys(progress.clean).length>=30],
  ['cowboy','Cowboy hat',-2,'Clear 15 meadow patches',()=>['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0)>=15],
  ['phones','Headphones',-2,'Finish 10 daily patches',()=>(progress.stats.dailies||0)>=10]];
const hatArt=(id,size=36)=>tintArt(id,art('hat-'+id,size));
// extras: things for the face, earned with milestones: [id, name, how to earn, test]. Built once and cloned, like hats.
const EXTRAS=[['none','Nothing','',()=>true],
  ['glasses','Round glasses','Earn 10 badges',()=>Object.keys(progress.badges).length>=10],
  ['tash','Fancy mustache','Say hi 50 times',()=>(progress.stats.taps||0)>=50],
  ['walrus','Bushy mustache','Crawl 5,000 moves',()=>(progress.stats.moves||0)>=5000],
  ['freckles','Freckles','Eat 50 snacks',()=>(progress.stats.fruit||0)>=50],
  ['nose','Button nose','Snap 3 photos',()=>(progress.stats.photos||0)>=3],
  ['flower','Flower clip','Finish 5 chapters',()=>CHAPTERS.filter((ch,k)=>chapterCleared(k)).length>=5],
  ['bowtie','Bow tie','3 stars on 20 patches',()=>LEVELS.filter(l=>progress.stars[l.name]===3).length>=20],
  ['scarf','Cozy scarf','Finish 20 daily patches',()=>(progress.stats.dailies||0)>=20],
  ['shades','Sunglasses','Clear 10 meadow patches',()=>['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0)>=10],
  ['hearts','Heart glasses','Collect 200 stars',()=>starTotal()>=200],
  ['monocle','Monocle','50 patches, no hints',()=>Object.keys(progress.clean).length>=50],
  ['stars','Star shades','3 stars on 60 patches',()=>LEVELS.filter(l=>progress.stars[l.name]===3).length>=60],
  ['butterfly','Butterfly friend','Finish every garden patch',()=>allCleared()],
  ['goggles','Digging goggles','Burrow under yourself 30 times',()=>(progress.stats.burrows||0)>=30],
  ['bandana','Explorer\'s bandana','Finish 200 patches',()=>LEVELS.filter((l,i)=>isCleared(i)).length>=200],
  ['eyepatch','Pirate patch','Start a patch over 15 times',()=>(progress.stats.restarts||0)>=15],
  ['ladybug','Ladybug friend','Change your outfit 40 times',()=>(progress.stats.outfits||0)>=40],
  ['sweatband','Sweatband','Crawl 20,000 moves',()=>(progress.stats.moves||0)>=20000],
  ['daisies','Daisy chain','Wear all three pollens in one patch',()=>(progress.stats.allPollen||0)>=1]];
let extraId=store.get('squirm-extra')||'none';
const extraOn=()=>{ const e=EXTRAS.find(x=>x[0]===extraId); return e&&e[3]()?extraId:'none'; };
const extraArt=(id,size=36)=>tintArt(id,art(id==='none'?'hat-none':'extra-'+id,size));
// colour options for some hats and extras: each option swaps the item's own materials (keys, by index) and recolours
// its sticker (art: the sticker's hexes for those keys). Option 0 is the item's own look. Items without an entry
// (sunglasses, the monocle, ...) have no colour picker. Chosen options live in squirm-tints, by item id.
const TINT_SET={red:[['Poppy',0xE4574C],['Bluebell',0x5B8FD9],['Fern',0x5FAE6A],['Plum',0x9A72D6],['Marigold',0xF2B83A]],
  pastel:[['Sky',0x9FD2F2],['Blossom',0xF7A8C4],['Butter',0xFFE08A],['Mint',0x9FE0BE],['Lilac',0xCDB8F5]]};
const TINTS={
  bow:{keys:['bowDark','bowKnot'],art:['#E36A8C','#C24E72'],opts:[['Berry',0xE36A8C,0xC24E72],['Sky',0x7FBFEA,0x4F95C8],['Mint',0x7FD3A8,0x4FAE80],['Butter',0xF5C84E,0xD9A22A],['Lilac',0xB79CF2,0x8E72D6]]},
  beanie:{keys:['beanie','beanieRib'],art:['#8FD0B0','#6FB894'],opts:[['Mint',0x8FD0B0,0x6FB894],['Berry',0xF2A0B8,0xE07A98],['Sky',0x9FCBF0,0x7AAEDC],['Butter',0xF7D57A,0xE8BC4E],['Lilac',0xC7B2F2,0xA890E0]]},
  party:{keys:['partyA'],art:['#9FD2F2'],opts:TINT_SET.pastel.map(([n,c])=>[n,c])},
  brolly:{keys:['brolly'],art:['#9FD2F2'],opts:TINT_SET.pastel.map(([n,c])=>[n,c])},
  beret:{keys:['beret'],art:['#B79CF2'],opts:[['Lilac',0xB79CF2],['Berry',0xE36A8C],['Navy',0x5B6FB8],['Mint',0x7FD3A8],['Coral',0xF07A6A]]},
  rainhat:{keys:['rainHat'],art:['#FFD04A'],opts:[['Sunny',0xFFD04A],['Coral',0xF07A6A],['Sky',0x7FBFEA],['Mint',0x7FD3A8],['Lilac',0xB79CF2]]},
  mush:{keys:['mushRed'],art:['#F07A6A'],opts:[['Toadstool',0xF07A6A],['Lilac',0xB79CF2],['Butter',0xF5C84E],['Sky',0x7FBFEA],['Mint',0x7FD3A8]]},
  gnome:{keys:['gnome'],art:['#E4574C'],opts:TINT_SET.red},
  teacup:{keys:['teacup','teacupDot'],art:['#9FD2F2','#FFFBF2'],opts:[['Sky',0x9FD2F2,0xFFFBF2],['Rose',0xF7A8C4,0xFFFBF2],['Butter',0xFFE08A,0xF27DA2],['Mint',0x9FE0BE,0xFFFBF2],['Lilac',0xCDB8F5,0xFFE08A]]},
  scarf:{keys:['mushRed','partyB'],art:['#F07A6A','#FFF1A8'],opts:[['Coral',0xF07A6A,0xFFF1A8],['Sky',0x7FBFEA,0xFFFBF2],['Mint',0x7FD3A8,0xFFF1A8],['Berry',0xE36A8C,0xFFE3EC],['Lilac',0xB79CF2,0xFFF1A8]]},
  bowtie:{keys:['bowDark','heartFrame'],art:['#E36A8C','#F27DA2'],opts:[['Berry',0xE36A8C,0xF27DA2],['Navy',0x4E5E9E,0x6F80C2],['Fern',0x4FAE80,0x7FD3A8],['Marigold',0xD9A22A,0xF5C84E],['Plum',0x8E72D6,0xB79CF2]]},
  bandana:{keys:['bandana'],art:['#E4574C'],opts:TINT_SET.red},
  flower:{keys:['chef'],art:['#FFFBF2'],opts:[['Daisy',0xFFFBF2],['Blossom',0xF7A8C4],['Butter',0xFFE08A],['Lilac',0xCDB8F5],['Sky',0x9FD2F2]]},
  sweatband:{keys:['sweat','sweatStripe'],art:['#FFFBF2','#F27DA2'],opts:[['Classic',0xFFFBF2,0xF27DA2],['Sky',0x9FD2F2,0xFFFBF2],['Lime',0xC9E77E,0x4FAE80],['Sunny',0xFFD04A,0xE4574C],['Berry',0xE36A8C,0xFFFBF2]]}};
let tints=store.json('squirm-tints')||{};
const tintOf=id=>{ const t=TINTS[id]; return t?Math.min(t.opts.length-1,Math.max(0,tints[id]|0)):0; };
const hexStr=n=>'#'+n.toString(16).padStart(6,'0').toUpperCase();
function tintArt(id,svg){ const t=TINTS[id], k=tintOf(id); if(!t||!k) return svg; t.art.forEach((h,i)=>{ if(t.opts[k][i+1]!=null) svg=svg.split(h).join(hexStr(t.opts[k][i+1])); }); return svg; }
// swaps the tinted materials in a freshly built hat or extra
function tinted(id,proto){ const t=TINTS[id], k=tintOf(id); if(!t||!k) return proto;
  const map=new Map(t.keys.map((key,i)=>[m(key),MC['tint'+t.opts[k][i+1]]||(MC['tint'+t.opts[k][i+1]]=toon(t.opts[k][i+1]))]).filter((e,i)=>t.opts[k][i+1]!=null));
  proto.traverse(o=>{ if(o.material&&map.has(o.material)) o.material=map.get(o.material); }); return proto; }
const extraProto={};
const SHAPE_HEART=()=>{ const s=new THREE.Shape(); s.moveTo(0,-1); s.bezierCurveTo(-.6,-.45,-1.25,-.1,-1.05,.45); s.bezierCurveTo(-.88,.95,-.25,1.05,0,.55); s.bezierCurveTo(.25,1.05,.88,.95,1.05,.45); s.bezierCurveTo(1.25,-.1,.6,-.45,0,-1); return s; };
const SHAPE_STAR=()=>{ const s=new THREE.Shape(); for(let i=0;i<10;i++){ const a=Math.PI/2+i*Math.PI/5, r=i%2?.45:1; s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r); } return s; };
// a flat frame with a lens in it, from a shape: the frame is the shape with a smaller copy cut out
function shapedLens(mk,fr,lens,scale){ const g=new THREE.Group(), o=mk();
  const inner=new THREE.Path(mk().getPoints(30).map(p=>p.multiplyScalar(.72)).reverse()); o.holes.push(inner);
  const f=new THREE.Mesh(new THREE.ExtrudeGeometry(o,{depth:.12,bevelEnabled:false,curveSegments:16}),fr); f.scale.setScalar(scale); g.add(f);
  const l=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(mk().getPoints(30).map(p=>p.multiplyScalar(.74))),24),lens); l.scale.setScalar(scale); l.position.z=.004; g.add(l); return g; }
function buildExtra(id){ // frames sit in front of the eyes even when they widen (wow) or the head turns: eye front + outline is ~.39
  const g=new THREE.Group(), EY=.14, EZ=.41;
  // a thin rod from point a to point b
  const bar=(a,b,r,mat)=>{ const d=new THREE.Vector3().subVectors(b,a), c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat); c.position.copy(a).addScaledVector(d,.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()); return c; };
  // the arms start at the frame's outer edge (x = ox), run back just off the side of the head and bend into it
  // there, like over an ear: a straight arm to the back would graze the round head and show through in dashes
  const arms=(mat,ox,z)=>{ for(const s of [-1,1]){ const k=new THREE.Vector3(s*.32,EY+.01,.1);
    g.add(bar(new THREE.Vector3(s*ox,EY,z),k,.014,mat)); g.add(bar(k,new THREE.Vector3(s*.24,EY+.02,-.12),.014,mat)); g.add(new THREE.Mesh(sph(.014,8,6),mat).translateOnAxis(k.clone().normalize(),k.length())); } };
  if(id==='glasses'||id==='shades'){ const sh=id==='shades', z=sh?EZ+.01:EZ, rad=sh?.13:.12;
    for(const s of [-1,1]){ const r=new THREE.Mesh(new THREE.TorusGeometry(rad,.019,10,30),m('frame')); r.position.set(s*.13,EY,z); g.add(r);
      if(sh){ const l=new THREE.Mesh(new THREE.CircleGeometry(rad,28),m('lensDark')); l.position.set(s*.13,EY,z-.004); g.add(l);
        const hl=new THREE.Mesh(new THREE.CircleGeometry(.025,12),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(s*.13-.05,EY+.05,z+.002); hl.scale.set(1.6,.6,1); hl.rotation.z=.5; g.add(hl); } }
    const br=new THREE.Mesh(new THREE.TorusGeometry(.03,.013,8,12,Math.PI),m('frame')); br.position.set(0,EY+.03,z+.005); g.add(br); arms(m('frame'),.13+rad,z); }
  else if(id==='hearts'||id==='stars'){ const mk=id==='hearts'?SHAPE_HEART:SHAPE_STAR, fr=m(id==='hearts'?'heartFrame':'starFrame'), lens=m(id==='hearts'?'petalB':'lensDark');
    const sc=id==='hearts'?.125:.15;
    for(const s of [-1,1]){ const l=shapedLens(mk,fr,lens,sc); l.position.set(s*.135,EY,EZ-.01); l.rotation.z=s*-.08; g.add(l); }
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.07,8),fr); br.rotation.z=Math.PI/2; br.position.set(0,EY+.02,EZ+.005); g.add(br); arms(fr,.135+sc*.95,EZ); }
  else if(id==='monocle'){ const r=new THREE.Mesh(new THREE.TorusGeometry(.125,.02,10,30),m('monocle')); r.position.set(-.13,EY,EZ+.005); g.add(r);
    // a little chain from the rim, sagging over the cheek to a clip on the side of the head (never off in the air)
    const ca=new THREE.Vector3(-.235,EY-.06,EZ-.01), cc=new THREE.Vector3(-.28,-.18,.37), cb=new THREE.Vector3(-.27,-.13,.17), chain=new THREE.QuadraticBezierCurve3(ca,cc,cb);
    for(let i=0;i<9;i++){ const c=new THREE.Mesh(sph(.014,8,6),m('monocle')); c.position.copy(chain.getPoint(i/8)); g.add(c); }
    const clip=new THREE.Mesh(sph(.026,10,8),m('monocle')); clip.position.copy(cb); clip.scale.set(.55,1,1); outline(clip,.008); g.add(clip); }
  else if(id==='freckles'){ const R=HEAD_R+.004;
    for(const s of [-1,1]) for(const [x,y] of [[.17,.02],[.21,.04],[.2,-.005],[.24,.015]]){ const xx=s*x, z=Math.sqrt(R*R-xx*xx-y*y), d=new THREE.Mesh(sph(.014,8,6),m('tash')); d.position.set(xx,y,z); d.scale.z=.4; d.lookAt(xx*3,y*3,z*3); g.add(d); } }
  else if(id==='nose'){ const n=new THREE.Mesh(sph(.055,18,14),m('bowDark')); n.position.set(0,.035,HEAD_R+.01); outline(n,.01); g.add(n);
    const hl=new THREE.Mesh(sph(.015,8,6),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(-.018,.055,HEAD_R+.058); g.add(hl); }
  else if(id==='flower'){ // clipped on the left, off the top where most hats sit and away from the ribbon bow on the right
    const f=new THREE.Group(), fp=new THREE.Vector3(-.29,.17,.12).setLength(HEAD_R+.012); f.position.copy(fp); f.lookAt(fp.x*3,fp.y*3,fp.z*3+.3); f.scale.setScalar(1.25); g.add(f);
    for(let k=0;k<5;k++){ const a=k/5*Math.PI*2, pt=new THREE.Mesh(sph(.05,12,8),m('chef')); pt.position.set(Math.cos(a)*.055,Math.sin(a)*.055,0); pt.scale.z=.5; outline(pt,.008); f.add(pt); }
    const c=new THREE.Mesh(sph(.035,12,8),m('crown')); c.position.z=.02; f.add(c); }
  else if(id==='bowtie'){ const b=new THREE.Group(); b.position.set(0,-.3,.2); b.rotation.x=.5; g.add(b);
    for(const s of [-1,1]){ const w=new THREE.Mesh(new THREE.ConeGeometry(.075,.13,16),m('bowDark')); w.rotation.z=s*Math.PI/2; w.position.x=s*.07; w.scale.z=.55; outline(w,.008); b.add(w); }
    const k=new THREE.Mesh(sph(.035,12,8),m('heartFrame')); k.scale.z=.7; outline(k,.008); b.add(k); }
  else if(id==='scarf'){ // a soft roll slanting round the bottom of the head: under the chin in front, up over the neck behind
    // (so it shows from the tilted game camera too), with cream stripes, a knot at the side and two short tails
    const R=.33, tube=.066, ring=new THREE.Group(); ring.position.set(0,-.1,-.07); ring.rotation.x=-.93; ring.scale.x=.92; g.add(ring);
    const roll=new THREE.Mesh(new THREE.TorusGeometry(R,tube,12,36),m('mushRed')); ring.add(roll);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(R,tube+.012,10,36),lineMat));
    const band=new THREE.TorusGeometry(tube+.003,.014,6,16);
    for(let k=0;k<8;k++){ const a=(k+.5)/8*Math.PI*2, st=new THREE.Mesh(band,m('partyB')); st.position.set(R*Math.cos(a),R*Math.sin(a),0);
      st.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(-Math.sin(a),Math.cos(a),0)); ring.add(st); }
    const kp=new THREE.Vector3(.215,-.245,.18), knot=new THREE.Mesh(sph(.068,14,10),m('mushRed')); knot.position.copy(kp); knot.scale.set(1,.85,.8); outline(knot,.01); g.add(knot);
    for(const [dx,dy,dz,rz,rx] of [[.075,-.065,0,.9,.15],[.025,-.075,.06,.35,-.35]]){ const t=new THREE.Mesh(sph(.05,14,10),m('mushRed')); t.position.set(kp.x+dx,kp.y+dy,kp.z+dz); t.rotation.set(rx,0,rz); t.scale.set(1,2,.5); outline(t,.01); g.add(t);
      const tip=new THREE.Mesh(sph(.05,12,8),m('partyB')); tip.position.y=-.036; tip.scale.set(.88,.2,1.08); t.add(tip); } }
  else if(id==='eyepatch'){ // over the right eye, its strap running up over the forehead and round the back of the head
    const p=new THREE.Vector3(.13,.14,.34), pt=new THREE.Mesh(sph(.13,22,16),m('patch')); pt.position.copy(p); pt.scale.set(1,.95,.46); pt.lookAt(p.clone().multiplyScalar(3)); outline(pt,.01); g.add(pt);
    const on=d=>new THREE.Vector3(...d).normalize().multiplyScalar(HEAD_R+.012);
    const strap=new THREE.CatmullRomCurve3([on([.33,.37,.87]),on([.05,.62,.75]),on([-.35,.72,.5]),on([-.75,.55,.0]),on([-.45,.35,-.8])]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(strap,30,.016,6,false),m('patch')));
    const end=on([.62,.15,.77]), side=new THREE.CatmullRomCurve3([on([.4,.2,.88]),end,on([.85,.15,.45]),on([.6,.1,-.75])]); g.add(new THREE.Mesh(new THREE.TubeGeometry(side,24,.016,6,false),m('patch'))); }
  else if(id==='ladybug'){ // a ladybug resting on the right of the head, away from the flower clip and the butterfly
    const b=new THREE.Group(), bp=new THREE.Vector3(.26,.24,.12).setLength(HEAD_R+.02); b.position.copy(bp); b.lookAt(bp.x*3,bp.y*3,bp.z*3); b.rotateZ(-.6); b.scale.setScalar(1.25); g.add(b);
    const shell=new THREE.Mesh(new THREE.SphereGeometry(.07,18,12,0,Math.PI*2,0,Math.PI/2),m('ladybug')); shell.rotation.x=Math.PI/2; shell.scale.set(1,1,.7); outline(shell,.008); b.add(shell);
    const head=new THREE.Mesh(sph(.032,12,10),m('patch')); head.position.set(0,.07,.012); b.add(head);
    const line=new THREE.Mesh(new THREE.BoxGeometry(.006,.13,.01),m('patch')); line.position.z=.05; b.add(line);
    for(const [x,y] of [[-.035,.02],[.035,.02],[-.03,-.03],[.03,-.03]]){ const d=new THREE.Mesh(sph(.014,8,6),m('patch')); d.position.set(x,y,.045); d.scale.z=.4; b.add(d); }
    for(const sd of [-1,1]){ const e=new THREE.Mesh(sph(.008,6,4),m('eye')); e.position.set(sd*.013,.085,.03); b.add(e); } }
  else if(id==='sweatband'){ // a stretchy band hugging the top of the head, tipped back round the head's centre so it sits on
    // the forehead above the eyes and lower behind; its two edges follow the head's curve (hats go on top)
    const tilt=new THREE.Group(); tilt.rotation.x=-.42; g.add(tilt);
    const y=.215, hh=.075, rr=v=>Math.sqrt(HEAD_R*HEAD_R-v*v)+.016, band=new THREE.Group(); band.position.y=y; tilt.add(band);
    band.add(new THREE.Mesh(new THREE.CylinderGeometry(rr(y+hh/2),rr(y-hh/2),hh,36,1,true),m('sweat')));
    band.add(new THREE.Mesh(new THREE.CylinderGeometry(rr(y+.013)+.003,rr(y-.013)+.003,.026,36,1,true),m('sweatStripe')));
    for(const e of [-hh/2,hh/2]){ const r=new THREE.Mesh(new THREE.TorusGeometry(rr(y+e),.007,6,40),lineMat); r.rotation.x=Math.PI/2; r.position.y=e; band.add(r); } }
  else if(id==='daisies'){ // a chain of daisies lying on the head under the mouth: a circle on the head's sphere, round the
    // chin and down the sides, its back hidden under the body
    const tilt=new THREE.Group(); tilt.rotation.x=Math.PI-.47; g.add(tilt);
    const d=.27, r=Math.sqrt(HEAD_R*HEAD_R-d*d)+.012, ring=new THREE.Group(); ring.position.y=d; tilt.add(ring);
    const stem=new THREE.Mesh(new THREE.TorusGeometry(r,.014,6,48),m('leaf')); stem.rotation.x=Math.PI/2; ring.add(stem);
    // (the ring's -z is the front once tipped; each daisy faces straight out from the head's centre)
    for(let k=0;k<8;k++){ const a=-Math.PI/2+(k-3.5)*.4, f=new THREE.Group(), wv=new THREE.Vector3();
      f.position.set(Math.cos(a)*r,0,Math.sin(a)*r); ring.add(f); f.getWorldPosition(wv); f.lookAt(wv.multiplyScalar(2));
      for(let q=0;q<7;q++){ const pt=new THREE.Mesh(sph(.026,8,6),m('daisy')); const b=q/7*Math.PI*2+k; pt.position.set(Math.cos(b)*.03,Math.sin(b)*.03,.01); pt.scale.set(1,1,.45); f.add(pt); }
      const c=new THREE.Mesh(sph(.018,8,6),m('crown')); c.position.z=.022; outline(c,.005); f.add(c);
      if(k%2){ const lf=new THREE.Mesh(sph(.022,8,6),m('leaf')); lf.scale.set(1.6,.5,.4); lf.position.set(.045,-.02,0); lf.rotation.z=-.5; f.add(lf); } } }
  else if(id==='bandana'){ // a spotted neckerchief: a thin roll round the bottom of the head (like the scarf) and a triangle in front
    const R=.33, ring=new THREE.Group(); ring.position.set(0,-.1,-.07); ring.rotation.x=-.93; ring.scale.x=.92; g.add(ring);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(R,.036,10,36),m('bandana')), new THREE.Mesh(new THREE.TorusGeometry(R,.048,8,36),lineMat));
    const tri=new THREE.Shape(); tri.moveTo(-.14,0); tri.lineTo(.14,0); tri.quadraticCurveTo(.03,-.12,0,-.19); tri.quadraticCurveTo(-.03,-.12,-.14,0);
    const geo=new THREE.ExtrudeGeometry(tri,{depth:.02,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:10}); geo.translate(0,0,-.01);
    const t=new THREE.Mesh(geo,m('bandana')); t.position.set(0,-.27,.21); t.rotation.x=-.35; outline(t,.01); g.add(t);
    for(const [x,y] of [[-.06,-.04],[.06,-.04],[0,-.1]]){ const d=new THREE.Mesh(sph(.017,8,6),m('bandanaDot')); d.position.set(x,y,.024); d.scale.z=.35; t.add(d); } }
  else if(id==='goggles'){ // chunky round goggles on a strap that hugs the head at eye height
    const z=EZ+.01, rad=.125, R=Math.sqrt(HEAD_R*HEAD_R-EY*EY)+.012;
    const strap=new THREE.Mesh(new THREE.TorusGeometry(R,.028,8,40,Math.PI*1.3),m('goggle')); strap.rotation.set(Math.PI/2,0,Math.PI*.85); strap.position.y=EY; g.add(strap);
    for(const s of [-1,1]){ const f=new THREE.Mesh(new THREE.TorusGeometry(rad,.032,10,30),m('goggle')); f.position.set(s*.135,EY,z); outline(f,.008); g.add(f);
      const cup=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*.95,.06,26,1,true),m('goggle')); cup.rotation.x=Math.PI/2; cup.position.set(s*.135,EY,z-.03); g.add(cup);
      const l=new THREE.Mesh(new THREE.CircleGeometry(rad,28),m('lensBlue')); l.position.set(s*.135,EY,z-.004); g.add(l);
      const hl=new THREE.Mesh(new THREE.CircleGeometry(.03,12),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(s*.135-.05,EY+.05,z+.002); hl.scale.set(1.5,.6,1); hl.rotation.z=.5; g.add(hl); }
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.05,8),m('goggle')); br.rotation.z=Math.PI/2; br.position.set(0,EY,z); g.add(br); }
  else if(id==='butterfly'){ // perched where the flower clip sits, wings tipped up a little as if it just landed
    const b=new THREE.Group(), bp=new THREE.Vector3(-.28,.24,.1).setLength(HEAD_R+.04); b.position.copy(bp); b.lookAt(bp.x*3,bp.y*3,bp.z*3+.3); b.scale.setScalar(1.4); g.add(b);
    const body=new THREE.Mesh(sph(.022,10,8),m('pupil')); body.scale.set(1,3.2,1); outline(body,.006); b.add(body);
    for(const s of [-1,1]){ for(const [y,r,mat,sx] of [[.035,.07,'petalB',1.1],[-.04,.05,'crown',1]]){ const w=new THREE.Mesh(sph(r,14,10),m(mat)); w.scale.set(sx,1,.25); w.position.set(s*(r+.008),y,.02); w.rotation.set(0,s*.5,s*(y>0?-.35:.4)); outline(w,.006); b.add(w); }
      const an=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.07,4),m('pupil')); an.position.set(s*.016,.095,0); an.rotation.z=-s*.35; b.add(an); } }
  else if(id==='tash'){ // a handlebar: two tapered lobes from a round knot, curling up at the tips, hugging the face
    const R=HEAD_R, Y=0, surf=(x,y)=>Math.sqrt(Math.max(0,R*R-x*x-y*y));
    const lobe=[[0,.02],[.05,.006],[.1,-.006],[.15,-.004],[.185,.012],[.193,.036],[.177,.052],[.159,.047],[.158,.033]];
    const rad=t=>.009+.028*Math.pow(1-t,1.2);
    // a tube whose radius follows rad(t): TubeGeometry samples the curve evenly, so ring k sits at t=k/segs
    const taper=(curve,f,add)=>{ const segs=48, rs=12, g=new THREE.TubeGeometry(curve,segs,1,rs,false), pa=g.attributes.position, v=new THREE.Vector3();
      for(let i=0;i<pa.count;i++){ const t=Math.floor(i/(rs+1))/segs, c=curve.getPointAt(t); v.fromBufferAttribute(pa,i).sub(c).multiplyScalar(f(t)+add).add(c); pa.setXYZ(i,v.x,v.y,v.z); }
      g.computeVertexNormals(); return g; };
    for(const sd of [-1,1]){ const pts=lobe.map(([x,y])=>{ const X=sd*x, Yy=Y+y; return new THREE.Vector3(X,Yy,surf(X,Yy)+.012); });
      const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
      g.add(new THREE.Mesh(taper(curve,rad,0),m('tash')), new THREE.Mesh(taper(curve,rad,.011),lineMat));
      // a lighter strand along the top of the lobe, like the sticker
      const hp=[]; for(let k=0;k<=8;k++){ const t=.08+k/8*.5, c=curve.getPointAt(t), n=c.clone().normalize(); hp.push(c.addScaledVector(n,rad(t)*.7).add(new THREE.Vector3(0,rad(t)*.4,0))); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp),16,0.006,6,false),m('tashLight'))); }
    const knot=new THREE.Mesh(sph(.038,16,12),m('tash')); knot.position.set(0,Y+.02,surf(0,Y+.02)+.008); knot.scale.set(1.15,.85,.75); outline(knot,.011); g.add(knot); }
  else if(id==='walrus'){ const half=id==='tash'
      ?[[0,.1],[.2,.17],[.45,.11],[.68,.02],[.86,.06],[.97,.22],[.93,.37],[.82,.4],[.78,.31],[.85,.24],[.8,.13],[.66,-.04],[.45,-.17],[.2,-.17],[0,-.06]]
      :[[0,.15],[.3,.2],[.6,.13],[.8,-.04],[.79,-.22],[.64,-.3],[.52,-.21],[.38,-.32],[.24,-.22],[.11,-.32],[0,-.22]];
    const pts=[...half,...half.slice(1,-1).reverse().map(([x,y])=>[-x,y])].map(([x,y])=>new THREE.Vector2(x,y)), sh=new THREE.Shape();
    sh.moveTo(pts[0].x,pts[0].y); sh.splineThru([...pts.slice(1),pts[0]]);
    // sized and raised to sit between the eyes and the mouth, clear of every mouth (the wow/yawn 'o' tops out at y -.026)
    const geo=new THREE.ExtrudeGeometry(sh,{depth:.22,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2,curveSegments:24}), w=id==='tash'?.17:.18;
    geo.scale(w,id==='tash'?w:w*.78,w); const pos=geo.getAttribute('position'); for(let i=0;i<pos.count;i++){ const x=pos.getX(i); pos.setZ(i,pos.getZ(i)-x*x*1.5); } geo.computeVertexNormals();
    const t=new THREE.Mesh(geo,m('tash')); t.position.set(0,id==='tash'?.008:.026,.322); t.rotation.x=-.22; outline(t,.008); g.add(t); }
  return g; }
function dressExtra(g){ const slot=g&&g.userData.accSlot; if(!slot) return; slot.clear(); const id=extraOn(); if(id==='none') return;
  const k=id+'|'+tintOf(id); if(!extraProto[k]) extraProto[k]=tinted(id,buildExtra(id)); slot.add(extraProto[k].clone()); }
const hatProto={};
function buildHat(id){ const h=new THREE.Group();
  if(id==='chef'){ const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.2,.13,24),m('chef')); band.position.y=.05; outline(band,.012); h.add(band);
    for(const [x,y,z,r] of [[0,.24,0,.15],[.12,.19,.03,.12],[-.12,.19,.03,.12],[0,.19,-.11,.12],[0,.2,.11,.11]]){ const p=new THREE.Mesh(sph(r,18,14),m('chef')); p.position.set(x,y,z); outline(p,.012); h.add(p); } return h; }
  if(id==='wizard'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.31,.33,.03,28),m('wizard')); outline(brim,.012); h.add(brim);
    // a tall cone whose tip flops over to one side: the bend grows with height, so the base stays round on the band
    const H=.54, bend=t=>[.15*t*t*t,-.035*t*t*t, -.06*t*t*t], cg=new THREE.ConeGeometry(.19,H,26,10), cp=cg.attributes.position;
    for(let k=0;k<cp.count;k++){ const t=cp.getY(k)/H+.5, b=bend(t); cp.setXYZ(k,cp.getX(k)+b[0],cp.getY(k)+b[1],cp.getZ(k)+b[2]); }
    cg.computeVertexNormals(); const cone=new THREE.Mesh(cg,m('wizard')); cone.position.y=H/2+.01; outline(cone,.012); h.add(cone);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.186,.192,.055,26),m('crown')); band.position.y=.04; outline(band,.008); h.add(band);
    // little gold stars stuck on the cone, facing out
    const sg=new THREE.ExtrudeGeometry(SHAPE_STAR(),{depth:.25,bevelEnabled:false}); sg.translate(0,0,-.125);
    for(const [t,a,s] of [[.3,.35,.05],[.55,-.5,.04],[.16,-.95,.035],[.42,1.25,.035]]){ const r=.19*(1-t), b=bend(t), nx=Math.sin(a), nz=Math.cos(a);
      const st=new THREE.Mesh(sg,m('crown')); st.position.set(nx*r+b[0],.01+t*H+b[1],nz*r+b[2]); st.lookAt(st.position.x+nx,st.position.y+.33,st.position.z+nz); st.scale.setScalar(s); outline(st,.005); h.add(st); }
    return h; }
  if(id==='cowboy'){ // a wide brim curling up at the sides, a pinched crown with a crease on top
    const prof=[[.15,.016],[.15,-.016],[.36,-.016],[.386,0],[.36,.016],[.15,.016]].map(([x,y])=>new THREE.Vector2(x,y)), bg=new THREE.LatheGeometry(prof,40), bp=bg.attributes.position;
    for(let k=0;k<bp.count;k++){ const x=bp.getX(k), z=bp.getZ(k)*.84, sx=Math.max(0,Math.abs(x)-.17), sz=Math.max(0,Math.abs(z)-.2); bp.setXYZ(k,x,bp.getY(k)+2.6*sx*sx-.6*sz*sz,z); }
    bg.computeVertexNormals(); const brim=new THREE.Mesh(bg,m('cowboy')); outline(brim,.01); h.add(brim);
    const tg=new THREE.CylinderGeometry(.155,.195,.21,24,2), tp=tg.attributes.position;
    for(let k=0;k<tp.count;k++){ let x=tp.getX(k), y=tp.getY(k), z=tp.getZ(k); const t=y/.21+.5;
      if(t>.99){ y-=.045*Math.max(0,1-(x/.16)*(x/.16)); } x*=1-.22*t*Math.max(0,z/.17); tp.setXYZ(k,x,y,z); }
    tg.computeVertexNormals(); const top=new THREE.Mesh(tg,m('cowboy')); top.position.y=.115; outline(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.196,.045,24),m('cowboyBand')); band.position.y=.04; h.add(band); return h; }
  if(id==='phones'){ const arc=new THREE.Mesh(new THREE.TorusGeometry(.36,.035,10,30,Math.PI),m('phonesBand')); arc.position.y=-.22; outline(arc,.01); h.add(arc);
    for(const sx of [-1,1]){ const cup=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.09,22),m('phones')); cup.rotation.z=Math.PI/2; cup.position.set(sx*.37,-.24,0); outline(cup,.012); h.add(cup);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.03,18),m('phonesBand')); pad.rotation.z=Math.PI/2; pad.position.set(sx*.43,-.24,0); h.add(pad); } return h; }
  if(id==='crown'){ const ring=new THREE.Mesh(new THREE.TorusGeometry(.21,.04,8,28),m('leaf')); ring.rotation.x=Math.PI/2; ring.position.y=.05; outline(ring,.01); h.add(ring);
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2, f=new THREE.Group(); f.position.set(Math.cos(a)*.21,.1,Math.sin(a)*.21); f.rotation.z=Math.cos(a)*.5; f.rotation.x=-Math.sin(a)*.5; h.add(f); const col=i%2?m('petalB'):m('partyB');
      for(let k=0;k<5;k++){ const pt=new THREE.Mesh(sph(.045,8,6),col); const b=k/5*Math.PI*2; pt.position.set(Math.cos(b)*.05,0,Math.sin(b)*.05); pt.scale.y=.55; f.add(pt); }
      const c=new THREE.Mesh(sph(.03,8,6),m('key')); c.position.y=.015; f.add(c); } }
  else if(id==='straw'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.34,.36,.03,28),m('straw')); outline(brim,.012); h.add(brim);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.16,22),m('straw')); top.position.y=.09; outline(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.195,.195,.045,22),m('petalB')); band.position.y=.04; h.add(band);
    const fl=new THREE.Mesh(sph(.04,10,8),m('partyB')); fl.position.set(.17,.06,.08); h.add(fl); }
  else if(id==='leaf'){ // a big pointed leaf laid over the head: it bends down the sides, its tip curls up, a stalk curls at the back
    const L=.39, W=.23, R=.48, cy=.098-R, lg=new THREE.SphereGeometry(1,32,10), lp=lg.attributes.position;
    // a point on the bent leaf: x along it, z across it, lifted by d off the middle sheet
    const leafAt=(x,z,d)=>{ const ax=x/R, az=z/R, n=new THREE.Vector3(Math.sin(ax)*Math.cos(az),Math.cos(ax)*Math.cos(az),Math.sin(az));
      return n.multiplyScalar(R+d).add(new THREE.Vector3(0,cy+.06*Math.pow(Math.max(0,x/L),3),0)); };
    for(let k=0;k<lp.count;k++){ const u=lp.getX(k), v=lp.getZ(k), p=leafAt(u*L,v*W*Math.pow(Math.max(0,1-u*u),.4),lp.getY(k)*.022); lp.setXYZ(k,p.x,p.y,p.z); }
    lg.computeVertexNormals(); const lf=new THREE.Mesh(lg,m('leafBig')); outline(lf,.01,.4); h.add(lf);
    const rib=[], st=[]; for(let k=0;k<=10;k++){ const x=-L*.92+k/10*L*1.75; rib.push(leafAt(x,0,.02)); }
    const vein=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib),16,.009,5,false),m('leafVein')); h.add(vein);
    for(const sd of [-1,1]) for(const x0 of [-.16,0,.15]){ const pts=[]; for(let k=0;k<=3;k++){ const t=k/3; pts.push(leafAt(x0+t*.09,sd*t*W*.55*(1-Math.abs(x0)/L*.6),.016)); }
      h.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),4,.006,4,false),m('leafVein'))); }
    const s0=leafAt(-L*.95,0,0); for(let k=0;k<=5;k++){ const t=k/5; st.push(new THREE.Vector3(s0.x-.07*t-.02*Math.sin(t*3),s0.y-.01+.09*t*t,s0.z)); }
    const stalk=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(st),8,.016,6,false),m('stem')); h.add(stalk);
    h.rotation.y=-.5; }
  else if(id==='acorn'){ const cap=new THREE.Mesh(new THREE.SphereGeometry(.24,22,12,0,Math.PI*2,0,Math.PI/2),m('acornCap')); cap.scale.y=.7; outline(cap,.012); h.add(cap);
    for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; const d=new THREE.Mesh(sph(.025,6,5),m('acornNut')); d.position.set(Math.cos(a)*.17,.1,Math.sin(a)*.17); h.add(d); }
    const nub=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.08,8),m('acornCap')); nub.position.y=.2; h.add(nub); }
  else if(id==='party'){ const cone=new THREE.Mesh(new THREE.ConeGeometry(.17,.44,22),m('partyA')); cone.position.y=.24; outline(cone,.012); h.add(cone);
    for(const y of [.1,.26]){ const st=new THREE.Mesh(new THREE.TorusGeometry(.17*(1-(y-.02)/.44),.02,6,22),m('partyB')); st.rotation.x=Math.PI/2; st.position.y=y; h.add(st); }
    const pom=new THREE.Mesh(sph(.06,12,10),m('petalB')); pom.position.y=.47; h.add(pom); }
  else if(id==='beret'){ const b=new THREE.Mesh(sph(.24,22,14),m('beret')); b.scale.set(1,.32,1); b.position.set(.03,.03,0); b.rotation.z=-.2; outline(b,.012); h.add(b);
    const nub=new THREE.Mesh(sph(.035,10,8),m('beret')); nub.position.set(.05,.11,0); h.add(nub);
    const dew=new THREE.Mesh(sph(.04,10,8),m('dew')); dew.position.set(-.13,.07,.12); h.add(dew); }
  else if(id==='mush'){ const cap=new THREE.Mesh(new THREE.SphereGeometry(.26,24,12,0,Math.PI*2,0,Math.PI/2),m('mushRed')); cap.scale.y=.75; outline(cap,.012); h.add(cap);
    const gills=new THREE.Mesh(new THREE.TorusGeometry(.235,.028,8,28),m('stem')); gills.rotation.x=Math.PI/2; gills.scale.z=.6; gills.position.y=.002; h.add(gills);
    [[0,.17,.06],[.13,.1,.15],[-.12,.11,.14],[.02,.08,.22],[-.2,.06,.04],[.2,.06,.02]].forEach(p=>{ const d=new THREE.Mesh(sph(.035,8,6),m('stem')); d.position.set(...p); d.scale.y=.4; d.lookAt(p[0]*3,p[1]*3,p[2]*3); h.add(d); }); }
  else if(id==='tophat'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.03,26),m('topHat')); outline(brim,.012); h.add(brim);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.3,24),m('topHat')); top.position.y=.16; outline(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.175,.175,.06,24),m('petalB')); band.position.y=.05; h.add(band); }
  else if(id==='rainhat'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.3,.36,.06,26),m('rainHat')); brim.position.y=-.01; brim.rotation.x=.12; outline(brim,.012); h.add(brim);
    const top=new THREE.Mesh(new THREE.SphereGeometry(.2,22,12,0,Math.PI*2,0,Math.PI/2),m('rainHat')); top.scale.y=.85; outline(top,.012); h.add(top); }
  else if(id==='bee'){ // a headband hugging the head from side to side (the head's centre is .27 below the hat slot), antennae springing from it
    const band=new THREE.Mesh(new THREE.TorusGeometry(.355,.025,8,30,Math.PI-.7),m('pupil')); band.rotation.z=.35; band.position.y=-.27; h.add(band);
    for(const sd of [-1,1]){ const st=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.26,6),m('pupil')); st.position.set(sd*.216,.164,0); st.rotation.z=-sd*.357; h.add(st);
      const ball=new THREE.Mesh(sph(.05,12,10),m('crown')); ball.position.set(sd*.27,.315,0); outline(ball,.01); h.add(ball); } }
  else if(id==='brolly'){ h.rotation.set(.22,0,-.18); const stick=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.36,6),m('pole')); stick.position.y=.16; h.add(stick);
    const cg=new THREE.ConeGeometry(.3,.14,8,1,true), can=new THREE.Mesh(cg,m('brolly')); can.position.y=.38; outline(can,.012); h.add(can);
    // seen from below (the home worm looks up at it) the canopy is hollow: a pale lining with spokes
    const lining=new THREE.Mesh(cg,MC.brollyIn||(MC.brollyIn=toon(0xE4F4FC,{side:THREE.BackSide}))); can.add(lining);
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2, x=Math.sin(a)*.27, z=Math.cos(a)*.27, sp=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.3,4),m('pole'));
      sp.position.set(x/2,.365,z/2); sp.lookAt(x,.315,z); sp.rotateX(Math.PI/2); h.add(sp); }
    const tip=new THREE.Mesh(sph(.02,8,6),m('pole')); tip.position.y=.46; h.add(tip); }
  else if(id==='bow'){ // a ribbon bow perched on the top of the head, off to one side, in a deeper pink than any worm
    const g=new THREE.Group(); g.position.set(.17,.065,.03); g.rotation.set(-.15,-.3,-.5); h.add(g);
    for(const sd of [-1,1]){ const loop=new THREE.Mesh(sph(.1,16,12),m('bowDark')); loop.scale.set(1.25,.85,.55); loop.position.x=sd*.105; loop.rotation.z=-sd*.25; outline(loop,.01); g.add(loop);
      const tail=new THREE.Mesh(sph(.05,10,8),m('bowDark')); tail.scale.set(.55,1.3,.35); tail.position.set(sd*.04,-.085,.015); tail.rotation.z=sd*.45; outline(tail,.008); g.add(tail); }
    const knot=new THREE.Mesh(sph(.05,12,10),m('bowKnot')); knot.scale.set(1,1,.75); knot.position.z=.02; outline(knot,.008); g.add(knot); }
  else if(id==='gold'){ // an open ring, so both of its sides are drawn: the back of the band shows through the top
    const gm2=MC.crownBand||(MC.crownBand=toon(C.crown,{side:THREE.DoubleSide}));
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.2,.09,24,1,true),gm2); band.position.y=.04; outline(band,.01); h.add(band);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const sp=new THREE.Mesh(new THREE.ConeGeometry(.045,.11,8),m('crown')); sp.position.set(Math.cos(a)*.19,.13,Math.sin(a)*.19); outline(sp,.008); h.add(sp);
      const gm=new THREE.Mesh(sph(.025,8,6),i%2?m('petalB'):m('partyA')); gm.position.set(Math.cos(a)*.2,.04,Math.sin(a)*.2); h.add(gm); } }
  else if(id==='beanie'){ // a knitted dome with a ribbed turn-up and a fluffy pompom
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.25,22,12,0,Math.PI*2,0,Math.PI/2),m('beanie')); dome.scale.y=.9; dome.position.y=-.02; outline(dome,.012); h.add(dome);
    const rib=new THREE.Mesh(new THREE.TorusGeometry(.245,.05,8,28),m('beanieRib')); rib.rotation.x=Math.PI/2; rib.position.y=-.01; outline(rib,.01); h.add(rib);
    for(let i=0;i<14;i++){ const a=i/14*Math.PI*2, k=new THREE.Mesh(new THREE.BoxGeometry(.012,.07,.02),m('beanie')); k.position.set(Math.cos(a)*.29,-.01,Math.sin(a)*.29); k.rotation.y=-a; h.add(k); }
    const pom=new THREE.Mesh(sph(.075,14,10),m('dew')); pom.position.y=.25; outline(pom,.01); h.add(pom); }
  else if(id==='sunflower'){ // one big bloom tucked on top, tipped toward the front, two leaves peeking out from under it
    const g=new THREE.Group(); g.position.set(.04,.08,.01); g.rotation.set(.3,0,-.15); g.scale.setScalar(1.12); h.add(g);
    for(const a of [2.2,3.9]){ const lf=new THREE.Mesh(sph(.07,12,8),m('leaf')); lf.scale.set(.55,.16,1.35); lf.position.set(Math.sin(a)*.2,-.025,Math.cos(a)*.2); lf.rotation.y=a; outline(lf,.008); g.add(lf); }
    for(let i=0;i<12;i++){ const a=i/12*Math.PI*2, pt=new THREE.Mesh(sph(.06,10,8),m('sunPetal')); pt.scale.set(.55,.22,1.25); pt.position.set(Math.sin(a)*.13,0,Math.cos(a)*.13); pt.rotation.y=a; outline(pt,.008); g.add(pt); }
    const core=new THREE.Mesh(sph(.085,16,10),m('sunCore')); core.scale.y=.45; core.position.y=.015; outline(core,.008); g.add(core);
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2, d=new THREE.Mesh(sph(.012,6,4),m('acornNut')); d.position.set(Math.sin(a)*.045,.05,Math.cos(a)*.045); g.add(d); } }
  else if(id==='shell'){ // the snails' lilac shell, worn like a cap and turned so its spiral faces the front
    const sh=new THREE.Mesh(sph(.23,24,18),m('shellHat')); sh.scale.set(1,.92,.8); sh.position.set(0,.1,-.03); outline(sh,.012); h.add(sh);
    const pts=[]; for(let k=0;k<=40;k++){ const t=k/40, a=t*Math.PI*3.4, r=.17*(1-t*.82); pts.push(new THREE.Vector3(Math.cos(a)*r,.1+Math.sin(a)*r,.155+.03*t)); }
    const sp=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.018,6,false),m('shellSpiral')); h.add(sp); }
  else if(id==='pumpkin'){ // a little pumpkin: ribs round a squat core, a stubby stem and one curly leaf
    const p=new THREE.Group(); p.position.y=.08; h.add(p);
    const core=new THREE.Mesh(sph(.2,22,14),m('pumpkin')); core.scale.y=.68; outline(core,.012); p.add(core);
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2, r=new THREE.Mesh(sph(.11,14,10),m(i%2?'pumpkin':'pumpkinRib')); r.scale.set(.75,1.15,1); r.position.set(Math.cos(a)*.13,0,Math.sin(a)*.13); r.rotation.y=-a; outline(r,.008); p.add(r); }
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.09,8),m('acornCap')); stem.position.y=.15; stem.rotation.z=-.25; p.add(stem);
    const lf=new THREE.Mesh(sph(.06,12,8),m('leaf')); lf.scale.set(1.3,.18,.7); lf.position.set(-.08,.14,.05); lf.rotation.set(.2,.5,.35); outline(lf,.008); p.add(lf); }
  else if(id==='bonnet'){ // a soft cap of overlapping petals, like an upside-down bloom, with a pollen bud on top
    for(const [ring,n,r,y,tilt,mat] of [[0,9,.21,.03,.95,'petalB'],[1,7,.12,.12,.55,'bowDark']]) for(let i=0;i<n;i++){ const a=(i+ring*.5)/n*Math.PI*2, pv=new THREE.Group(); pv.rotation.y=-a; h.add(pv);
      const pt=new THREE.Mesh(sph(.12,16,12),m(mat)); pt.scale.set(1.4,.32,.95); pt.position.set(r,y,0); pt.rotation.z=tilt; outline(pt,.01); pv.add(pt); }
    const bud=new THREE.Mesh(sph(.07,14,10),polMat('Y','light')); bud.position.y=.2; outline(bud,.01); h.add(bud);
    for(let i=0;i<5;i++){ const a=i*1.26, d=new THREE.Mesh(sph(.018,8,6),polMat('Y','dark')); d.position.set(Math.cos(a)*.035,.255,Math.sin(a)*.035); h.add(d); } }
  else if(id==='miner'){ // a round hard hat with a little lamp, for a worm who digs
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.25,24,12,0,Math.PI*2,0,Math.PI/2),m('miner')); dome.scale.y=.82; outline(dome,.012); h.add(dome);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.035,28),m('minerDark')); brim.position.y=.005; outline(brim,.01); h.add(brim);
    const ridge=new THREE.Mesh(new THREE.TorusGeometry(.2,.022,8,24,Math.PI),m('minerDark')); ridge.rotation.y=Math.PI/2; ridge.position.y=.0; h.add(ridge);
    const lamp=new THREE.Group(); lamp.position.set(0,.13,.2); lamp.rotation.x=.35; h.add(lamp);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.08,18),m('pole')); body.rotation.x=Math.PI/2; outline(body,.008); lamp.add(body);
    const glass=new THREE.Mesh(new THREE.CircleGeometry(.055,18),new THREE.MeshBasicMaterial({color:C.lamp})); glass.position.z=.042; lamp.add(glass);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(.09,18),new THREE.MeshBasicMaterial({color:C.lamp,transparent:true,opacity:.35,depthWrite:false})); glow.position.z=.046; lamp.add(glow); }
  else if(id==='sprout'){ // a seedling growing out of the top of the head: a stem and two round leaves
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.024,.2,8),m('leaf')); stem.position.y=.07; stem.rotation.z=.12; outline(stem,.008); h.add(stem);
    for(const sd of [-1,1]){ const lf=new THREE.Mesh(sph(.09,14,10),m('leaf')); lf.scale.set(1.15,.22,.7); lf.position.set(sd*.085-.015,.18+(sd>0?.02:0),0); lf.rotation.z=-sd*.45; outline(lf,.008); h.add(lf);
      const v=new THREE.Mesh(new THREE.BoxGeometry(.11,.006,.012),m('leafVein')); v.position.set(sd*.085-.015,.2+(sd>0?.02:0),0); v.rotation.z=-sd*.45; h.add(v); }
    h.position.y=-.03; }
  else if(id==='teacup'){ // a teacup on its saucer, a little tea inside and a curl of steam
    const sau=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.035,28),m('chef')); outline(sau,.01); h.add(sau);
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.15,.1,.17,26,1,true),m('teacup')); cup.position.y=.1; outline(cup,.01); h.add(cup);
    const bot=new THREE.Mesh(new THREE.CircleGeometry(.1,20),m('teacup')); bot.rotation.x=-Math.PI/2; bot.position.y=.018; h.add(bot);
    const tea=new THREE.Mesh(new THREE.CircleGeometry(.135,24),m('tea')); tea.rotation.x=-Math.PI/2; tea.position.y=.165; h.add(tea);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.05,.016,8,16,Math.PI*1.3),m('teacup')); handle.position.set(.15,.1,0); handle.rotation.z=-Math.PI*.65; outline(handle,.006); h.add(handle);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+.3, d=new THREE.Mesh(sph(.018,8,6),m('teacupDot')); d.position.set(Math.cos(a)*.128,.11,Math.sin(a)*.128); d.scale.set(1,1,.4); d.lookAt(Math.cos(a),.11,Math.sin(a)); h.add(d); }
    const st=[]; for(let k=0;k<=6;k++){ const t=k/6; st.push(new THREE.Vector3(Math.sin(t*5)*.03,.2+t*.16,0)); }
    const steam=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(st),16,.012,6,false),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75})); h.add(steam); }
  else if(id==='nest'){ // a nest woven from thin twig rings in two browns, a few loose ends curving round it, two speckled eggs
    const bowl=new THREE.Mesh(new THREE.SphereGeometry(.17,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),m('acornCap')); bowl.scale.y=.45; bowl.position.y=.07; h.add(bowl);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.17,.055,10,28),m('twig')); rim.rotation.x=Math.PI/2; rim.scale.z=.75; rim.position.y=.055; outline(rim,.01); h.add(rim);
    for(let i=0;i<9;i++){ const tw=new THREE.Mesh(new THREE.TorusGeometry(.175+(i%3)*.012,.011,5,30,Math.PI*(1.1+(i%4)*.25)),i%2?m('acornNut'):m('twig'));
      tw.rotation.set(Math.PI/2+((i*37)%7-3)*.06,((i*53)%9-4)*.05,i*.83); tw.position.y=.04+(i%4)*.022; h.add(tw); }
    for(let i=0;i<5;i++){ const a=i*1.31+.4, pts=[]; for(let k=0;k<=4;k++){ const t=a+k*.16; pts.push(new THREE.Vector3(Math.cos(t)*(.2+k*.012),.07+(i%2?.03:-.01)+k*.008,Math.sin(t)*(.2+k*.012))); }
      h.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,.008,4,false),m('acornNut'))); }
    for(const [x,z,r] of [[-.05,.02,.2],[.05,-.02,-.3]]){ const e=new THREE.Mesh(sph(.06,16,12),m('egg')); e.scale.set(.85,1.1,.85); e.position.set(x,.1,z); e.rotation.z=r; outline(e,.008); h.add(e);
      for(let k=0;k<4;k++){ const d=new THREE.Mesh(sph(.009,6,4),m('eggDot')); const a=k*1.7+x*20, el=.6+k*.3; d.position.set(x+Math.cos(a)*Math.sin(el)*.05,.1+Math.cos(el)*.064,z+Math.sin(a)*Math.sin(el)*.05); h.add(d); } } }
  else if(id==='cloud'){ // a little rain cloud hovering over the head, a few drops falling from it
    const c=new THREE.Group(); c.position.y=.22; h.add(c);
    [[0,0,0,.11],[-.1,-.02,0,.08],[.1,-.02,0,.08],[.05,.05,0,.08],[-.05,.05,0,.075]].forEach(p=>{ const s=new THREE.Mesh(sph(p[3],16,12),m('cloud')); s.position.set(p[0],p[1],p[2]); outline(s,.01); c.add(s); });
    const face=new THREE.Group(); face.position.set(0,0,.105); c.add(face);
    for(const sd of [-1,1]){ const e=new THREE.Mesh(new THREE.TorusGeometry(.016,.006,6,10,Math.PI),m('pupil')); e.position.set(sd*.035,.01,0); e.rotation.z=Math.PI; face.add(e); }
    for(const [x,y] of [[-.07,-.12],[.02,-.15],[.08,-.1]]){ const d=new THREE.Mesh(sph(.018,8,6),m('water')); d.scale.y=1.5; d.position.set(x,y,.02); c.add(d); } }
  else if(id==='explorer'){ // a pith helmet for the long trek: a tall khaki dome on a wide brim, a leather band and a feather
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.33,.35,.03,30),m('explorer')); brim.rotation.x=.08; outline(brim,.012); h.add(brim);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.22,26,12,0,Math.PI*2,0,Math.PI/2),m('explorer')); dome.scale.y=1.05; dome.position.y=.01; outline(dome,.012); h.add(dome);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.222,.222,.055,26,1,true),m('explorerBand')); band.position.y=.04; h.add(band);
    const nub=new THREE.Mesh(sph(.03,10,8),m('explorer')); nub.position.y=.24; outline(nub,.008); h.add(nub);
    const fe=new THREE.Mesh(sph(.06,12,8),m('leaf')); fe.scale.set(.35,1.6,.5); fe.position.set(-.2,.13,-.04); fe.rotation.z=.5; outline(fe,.008); h.add(fe); }
  else if(id==='gnome'){ // a tall red gnome hat, tip flopping forward, on a fluffy white band
    const H=.5, cg=new THREE.ConeGeometry(.2,H,26,10), cp=cg.attributes.position;
    for(let k=0;k<cp.count;k++){ const t=cp.getY(k)/H+.5; cp.setXYZ(k,cp.getX(k),cp.getY(k)-.05*t*t*t,cp.getZ(k)+.17*t*t*t); }
    cg.computeVertexNormals(); const cone=new THREE.Mesh(cg,m('gnome')); cone.position.y=H/2+.02; outline(cone,.012); h.add(cone);
    const band=new THREE.Mesh(new THREE.TorusGeometry(.2,.05,10,28),m('chef')); band.rotation.x=Math.PI/2; band.position.y=.03; outline(band,.01); h.add(band);
    const tip=new THREE.Mesh(sph(.045,12,10),m('chef')); tip.position.set(0,H+.02-.05,.17); outline(tip,.008); h.add(tip); }
  else if(id==='horn'){ // a headband hugging the head side to side, with a curved beetle horn on top
    const band=new THREE.Mesh(new THREE.TorusGeometry(.355,.03,8,30,Math.PI-.7),m('beetleDark')); band.rotation.z=.35; band.position.y=-.27; h.add(band);
    const pts=[]; for(let k=0;k<=8;k++){ const t=k/8, a=t*1.4; pts.push(new THREE.Vector3(0,.06+Math.sin(a)*.2,-.06+(1-Math.cos(a))*.2)); }
    const path=new THREE.CatmullRomCurve3(pts), g=new THREE.TubeGeometry(path,12,.06,12,false), hp=g.attributes.position;
    for(let k=0;k<hp.count;k++){ const t=Math.floor(k/13)/12, c=path.getPointAt(Math.min(1,t)), f=1-t*.7; hp.setXYZ(k,c.x+(hp.getX(k)-c.x)*f,c.y+(hp.getY(k)-c.y)*f,c.z+(hp.getZ(k)-c.z)*f); }
    g.computeVertexNormals(); g.computeBoundingSphere(); const c0=g.boundingSphere.center.clone(); g.translate(-c0.x,-c0.y,-c0.z);
    const horn=new THREE.Mesh(g,m('beetle')); horn.position.copy(c0); outline(horn,.01); h.add(horn);
    const base=new THREE.Mesh(sph(.075,14,10),m('beetleDark')); base.position.set(0,.05,-.06); base.scale.y=.6; outline(base,.01); h.add(base);
    const tip=new THREE.Mesh(sph(.024,8,6),m('beetleSpot')); tip.position.copy(pts[8]); h.add(tip);
    for(const [x,y,z] of [[.03,.16,-.02],[-.02,.22,.04]]){ const sp=new THREE.Mesh(sph(.018,8,6),m('beetleSpot')); sp.position.set(x,y,z); h.add(sp); } }
  h.traverse(o=>{ if(o.isMesh&&o.material!==lineMat) o.castShadow=true; });
  return h; }
let hatId=store.get('squirm-hat')||'none';
const chapterCleared=k=>{ const ch=CHAPTERS[k]; if(!ch) return false; for(let i=ch.from;i<=ch.to;i++) if(!isCleared(i)) return false; return true; };
const hatUnlocked=h=>h[4]?h[4]():h[2]<0||chapterCleared(h[2]);
function dressHat(g){ const slot=g&&g.userData.hatSlot; if(!slot) return; slot.clear();
  const h=HATS.find(x=>x[0]===hatId); if(!h||h[0]==='none'||!hatUnlocked(h)) return;
  const k=hatId+'|'+tintOf(hatId); if(!hatProto[k]) hatProto[k]=tinted(hatId,buildHat(hatId)); slot.add(hatProto[k].clone()); }
const WORM_COLS=[['Blossom',0xFFB3C8,0xFFB3C8,0,0xEF6A8F],['Mint',0x7FD9B0,0x7FD9B0,15,0xFF6B99],['Butter',0xFFE58F,0xFFE58F,45,0xFF827C],['Lavender',0xCDB8F5,0xCDB8F5,90,0xF979A6],['Sky',0xA9D8F5,0xA9D8F5,150,0xFF6B91],
  ['Peach',0xFFC29A,0xFFC29A,210,0xF87569],['Teal',0x74CCD2,0x74CCD2,270,0xFF718B],['Cocoa',0xD6AE8C,0xD6AE8C,330,0xD66161],['Twilight',0xA4A6E4,0xA4A6E4,400,0xFD75AE],['Golden',0xF7BE4F,0xF7BE4F,480,0xFB776D],['Moonlight',0xD7DDF0,0xD7DDF0,520,0xF27FA8],['Sprout',0xBCE38A,0xBCE38A,600,0xFF7F8F],['Sage',0xB4CBB0,0xB4CBB0,640,0xF27E93]];
const starTotal=()=>LEVELS.reduce((a,l)=>a+(progress.stars[l.name]||0),0);
const coloursUnlocked=()=>WORM_COLS.filter(c=>starTotal()>=c[3]).length;
let wormCol=Math.max(0,Math.min(WORM_COLS.length-1,parseInt(store.get('squirm-colour')||'0',10)||0));
// worm patterns, earned with milestones: [id, name, how to earn, test]. Drawn by colorAt and tubeMat's shader
const PATTERNS=[['plain','Plain','',()=>true],
  ['stripes','Stripes','Earn 5 badges',()=>Object.keys(progress.badges).length>=5],
  ['spots','Spots','3 day daily streak',()=>progress.daily.best>=3],
  ['fade','Soft fade','Clear 5 meadow patches',()=>['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0)>=5],
  ['rainbow','Rainbow tail','Finish 8 chapters',()=>CHAPTERS.filter((ch,k)=>chapterCleared(k)).length>=8],
  ['bands','Bands','Crawl 2,000 moves',()=>(progress.stats.moves||0)>=2000],
  ['sunset','Sunset','Finish 10 chapters',()=>CHAPTERS.filter((ch,k)=>chapterCleared(k)).length>=10],
  ['glitter','Glitter','Earn 25 badges',()=>Object.keys(progress.badges).length>=25]];
const patternsUnlocked=()=>PATTERNS.filter(p=>p[3]()).map(p=>p[0]);
let wormPat=store.get('squirm-pattern')||'plain';
const patOn=()=>PATTERNS.some(p=>p[0]===wormPat&&p[3]())?wormPat:'plain';
function applyWormColour(){ curPat=patOn(); patU.value=PAT_ID[curPat]||0; if(wormCol>=coloursUnlocked()) wormCol=0; const c=WORM_COLS[wormCol]; COL_A.setHex(c[1]); m('head').color.setHex(c[2]); cheekMat.color.setHex(c[4]); buildHomeBody(); }
const tubePool=[], capPool=[];
function tubeGeo(geo,pts,rads,cols,extra,gs){
  const S=pts.length, RS=20, verts=S*RS;
  let pos=geo.getAttribute('position');
  if(!pos||pos.count!==verts){
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('pg',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    const idx=[]; for(let j=0;j<S-1;j++) for(let r=0;r<RS;r++){ const a=j*RS+r, b=j*RS+(r+1)%RS, c=(j+1)*RS+r, d=(j+1)*RS+(r+1)%RS; idx.push(a,c,b, b,c,d); }
    geo.setIndex(idx); pos=geo.getAttribute('position');
  }
  const nor=geo.getAttribute('normal'), col=geo.getAttribute('color'), pg=geo.getAttribute('pg');
  const up=new THREE.Vector3(0,1,0), T=new THREE.Vector3(), side=new THREE.Vector3(), prev=new THREE.Vector3(1,0,0), U=new THREE.Vector3();
  for(let j=0;j<S;j++){
    const p=pts[j]; if(j<S-1) T.subVectors(pts[j+1],p); else T.subVectors(p,pts[j-1]); T.normalize();
    side.crossVectors(T,up); if(side.lengthSq()<1e-4) side.copy(prev); side.normalize(); prev.copy(side); U.crossVectors(side,T).normalize();
    const r=rads[j]+extra;
    for(let k=0;k<RS;k++){ const an=k/RS*Math.PI*2, ca=Math.cos(an), sa=Math.sin(an); const i=(j*RS+k)*3;
      const nx=side.x*ca+U.x*sa, ny=side.y*ca+U.y*sa, nz=side.z*ca+U.z*sa;
      pos.array[i]=p.x+nx*r; pos.array[i+1]=p.y+ny*r; pos.array[i+2]=p.z+nz*r;
      nor.array[i]=nx; nor.array[i+1]=ny; nor.array[i+2]=nz;
      if(cols){ col.array[i]=cols[j].r; col.array[i+1]=cols[j].g; col.array[i+2]=cols[j].b; }
      if(gs){ pg.array[i]=gs[j]; pg.array[i+1]=ca*r; pg.array[i+2]=sa*r; } }
  }
  pos.needsUpdate=true; nor.needsUpdate=true; col.needsUpdate=true; if(gs) pg.needsUpdate=true; geo.computeBoundingSphere();
}
function getTube(i){ if(!tubePool[i]){ const body=new THREE.Mesh(new THREE.BufferGeometry(),tubeMat), line=new THREE.Mesh(new THREE.BufferGeometry(),lineMat);
    body.castShadow=true; body.frustumCulled=false; line.frustumCulled=false; wormG.add(body,line); tubePool[i]={body,line}; } return tubePool[i]; }
function getCap(i){ if(!capPool[i]){ const c=new THREE.Mesh(sph(1,24,16),capMat.clone()); c.castShadow=true; const o=new THREE.Mesh(c.geometry,lineMat); c.add(o); c.userData.o=o; wormG.add(c); capPool[i]=c; } return capPool[i]; }
const WHITE=new THREE.Color(0xffffff), SUNSET=new THREE.Color(0xFF9A7A), SUNROSE=new THREE.Color(0xFF8FA8), RAINBOW=[0xFFB3C8,0xFFE08A,0x7FD9B0,0xA9D8F5,0xCDB8F5].map(c=>new THREE.Color(c));
let curPat='plain';
// a tint that turns round the colour wheel the short way, so Sunset on Mint or Sky glows instead of going muddy;
// a little paler and softer on the way, so the colours in between stay pastel. hk: how far the hue turns
const hsA={}, hsB={};
function hueMix(c,to,k,hk=k){ c.getHSL(hsA); to.getHSL(hsB); let dh=hsB.h-hsA.h; dh-=Math.round(dh); const w=Math.sin(Math.PI*hk)*Math.min(1,Math.abs(dh)*4);
  return c.setHSL((hsA.h+dh*hk+1)%1,(hsA.s+(hsB.s-hsA.s)*k)*(1-.45*w),hsA.l+(hsB.l-hsA.l)*k+.05*w); }
// the rainbow starts at the band nearest the body colour, so it grows out of the body without a grey blend
function rainbowFrom(base){ let b=0, bd=9; RAINBOW.forEach((c,i)=>{ const d=(c.r-base.r)**2+(c.g-base.g)**2+(c.b-base.b)**2; if(d<bd){ bd=d; b=i; } }); return b; }
// sunset ends in coral, or in rose on a body that is already coral-ish (Peach, Cocoa) so it still shows
function sunsetTo(base){ base.getHSL(hsA); SUNSET.getHSL(hsB); const dh=Math.abs(hsA.h-hsB.h); return Math.min(dh,1-dh)<.05?SUNROSE:SUNSET; }
// body colour at place g (0 head, n-1 tail tip) as vertex colours: the tints that run along the body. Edges
// (rings, stripes, bands, spots, glitter) are drawn per pixel by tubeMat
function colorAt(g,n,pat=curPat,base=COL_A){ const c=base.clone(); if(n<=1) return c; const t=Math.min(1,Math.max(0,g/(n-1)));
  if(pat==='fade') c.lerp(WHITE,.6*t);
  else if(pat==='sunset') hueMix(c,sunsetTo(base),.75*t,t);
  else if(pat==='rainbow'){ const g0=(n-1)*.4; if(g>g0){ const u=(g-g0)*2, k=rainbowFrom(base)+Math.floor(u);
    c.lerp(tmpC.copy(RAINBOW[k%5]).lerp(RAINBOW[(k+1)%5],u%1),Math.min(1,(g-g0)*1.5)); } }
  return c; }
let crawlK=-1;
function radAt(g,n,anchors){ const i=Math.min(Math.floor(g),anchors.length-2), f=g-i;
  const sc=anchors[Math.max(0,i)].scale.x*(1-f)+anchors[Math.min(i+1,anchors.length-1)].scale.x*f;
  let r=(i===0? segR(0,n)+(segR(1,n)-segR(0,n))*f*f*(3-2*f) : segR(i,n)*(1-f)+segR(i+1,n)*f);
  if(g>.4) r*=1+.04*Math.cos(g*4*Math.PI);
  if(crawlK>=0 && n>1){ const pos=(1-crawlK)*(n-1); r*=1+.15*Math.sin(Math.PI*crawlK)*Math.exp(-((g-pos)*(g-pos))/.35); }
  return r*sc; }
const CORNER=.25, TIP_LEN=.17, TIP_K=.55;
function portalAt(p){ const c=tileAt(state,p[0],p[1]); return c>='1'&&c<='9'; }
function updateWorm(){
  const anchors=segMeshes.concat(tailExtras); const n=anchors.length; let ti=0, ci=0;
  if(wormG.visible && n){
    const idle = !animating && state.status==='play' && !reduceMotion;
    // under soft soil the body (never the head) sinks out of sight, and the heap on the tile hides it
    const P=anchors.map((a,i)=>{ const v=a.position.clone(); if(idle) v.y+=Math.sin(idleT*3-i*.8)*.02; if(i) v.y-=soilDepth(v)*.5; return v; });
    // the length the tints are spread over follows a growing or shrinking tail, so fade, sunset and rainbow glide
    const nP=anchors.reduce((a,s,i)=>a+(i?Math.min(1,s.scale.x):1),0);
    let chains=[], cur=[0];
    for(let i=1;i<n;i++){ if(P[i].distanceTo(P[i-1])>1.3){ chains.push(cur); cur=[i]; } else cur.push(i); }
    chains.push(cur);
    const segs=state.segs;
    for(const ch of chains){
      // control points with their position along the worm (G for the radius, Gp for the pattern, which keeps
      // running through a dive and down the tail tip so spots and glitter never stretch); ends next to a portal dive into it
      let pts=ch.map(i=>P[i]), G=ch.map(i=>i), Gp=G.slice(), diveFront=false, diveBack=false;
      const f=ch[0], l=ch[ch.length-1];
      // round the bends: each inner anchor is pulled a little toward its neighbours, so a corner or a U-turn
      // curves wider than the body is thick instead of pinching into a crease on its inside
      if(pts.length>=3) pts=pts.map((p,j)=>{ if(j===0||j===pts.length-1) return p; const a=pts[j-1], b=pts[j+1];
        return p.clone().set(p.x+((a.x+b.x)/2-p.x)*CORNER,p.y,p.z+((a.z+b.z)/2-p.z)*CORNER); });
      if(f>0 && f<segs.length && portalAt(segs[f-1])){ const q=partner(state,segs[f-1][0],segs[f-1][1]);
        if(q && Math.abs(q[0]-segs[f][0])+Math.abs(q[1]-segs[f][1])===1){ pts=[wp(q[0],q[1],-.3),wp(q[0],q[1],.12),...pts]; G=[f,f,...G]; Gp=[f-.9,f-.6,...Gp]; diveFront=true; } }
      if(l>0 && l<segs.length-1 && l+1<n && portalAt(segs[l]) && P[l+1].distanceTo(P[l])>1.3){ pts=[...pts,wp(segs[l][0],segs[l][1],-.3)]; G=[...G,l]; Gp=[...Gp,l+.4]; diveBack=true; }
      // out of a tunnel, one tile on and straight back into the same tunnel: a hairpin, the strand coming up
      // beside the one going down, instead of one tube folding back on itself
      // (the tail end too, when the tail is the bit still coming out of that tunnel)
      if(diveFront && ch.length===2 && l<segs.length){ const q=partner(state,segs[f-1][0],segs[f-1][1]);
        if(q && q[0]===segs[l][0] && q[1]===segs[l][1]){ diveBack=true; const a=P[l], b=P[f], dx=b.x-a.x, dz=b.z-a.z, dl=Math.hypot(dx,dz)||1, ux=dx/dl, uz=dz/dl, w=.16;
          const v=(o,y,sd,k)=>new THREE.Vector3(o.x-uz*w*sd+ux*k,y,o.z+ux*w*sd+uz*k);
          pts=[v(a,-.3,1,0),v(a,.12,1,0),v(b,b.y,.85,-.06),v(b,b.y,0,.13),v(b,b.y,-.85,-.06),v(a,a.y,-1,0),v(a,-.3,-1,0)];
          G=[f,f,f,f+.3,f+.6,l,l]; Gp=[f-.9,f-.6,f-.2,f+.1,f+.4,l,l+.4]; } }
      // the tail tapers to a soft point a little past the last anchor, resting on the ground
      let tipP=null, tipR=0; const tip=l===n-1 && !diveBack && ch.length>=2;
      if(tip){ const a=P[l], b=P[l-1], dx=a.x-b.x, dz=a.z-b.z, dl=Math.hypot(dx,dz)||1, rl=radAt(l,n,anchors);
        tipR=rl*TIP_K; tipP=new THREE.Vector3(a.x+dx/dl*TIP_LEN*anchors[l].scale.x,a.y-(rl-tipR),a.z+dz/dl*TIP_LEN*anchors[l].scale.x); pts=[...pts,tipP]; G=[...G,l]; Gp=[...Gp,l+tipP.distanceTo(a)]; }
      if(pts.length>=2){
        // the neck starts low inside the head: its top stays under a hat's brim and its sides behind the cheeks
        if(ch[0]===0 && !diveFront) pts[0]=pts[0].clone().setY(pts[0].y-.08);
        const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
        const S=(pts.length-1)*9+1, sp=[], rr=[], cc=[], gs=[];
        for(let j=0;j<S;j++){ const u=j/(S-1); sp.push(curve.getPoint(u)); const fi=u*(pts.length-1), i0=Math.floor(Math.min(fi,pts.length-1.0001)), t=fi-i0;
          const gg=G[i0]*(1-t)+G[i0+1]*t, gp=Gp[i0]*(1-t)+Gp[i0+1]*t; rr.push(radAt(gg,n,anchors)*(tip&&i0===pts.length-2?1-(1-TIP_K)*t*t:1)); cc.push(dusty(colorAt(gp,nP))); gs.push(gp); }
        const tb=getTube(ti++); tb.body.visible=tb.line.visible=true; tubeGeo(tb.body.geometry,sp,rr,cc,0,gs); tubeGeo(tb.line.geometry,sp,rr.map(r=>r+.03*Math.min(1,r/.15)),null,0);
      }
      const ends=[]; if(!diveFront && f!==0) ends.push(f); if(!diveBack && (l!==f || ch.length===1) && l!==0) ends.push(l);
      for(const end of ends){ const c=getCap(ci++); const atTip=tip&&end===l, r=atTip?Math.max(.001,tipR):Math.max(.001,radAt(Math.min(end,n-1),n,anchors));
        c.visible=true; c.position.copy(atTip?tipP:P[end]); c.scale.setScalar(r); c.userData.o.scale.setScalar(1+.03*Math.min(1,r/.15)/r); c.material.color.copy(dusty(colorAt(atTip?Gp[Gp.length-1]:end,nP))); }
    }
  }
  for(let i=ti;i<tubePool.length;i++){ tubePool[i].body.visible=tubePool[i].line.visible=false; }
  for(let i=ci;i<capPool.length;i++) capPool[i].visible=false;
}
// head: faces where it's going, then turns to look at you when resting
const angLerp=(a,b,t)=>{ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; };
let blinkT=1.5, lookPhase='off', phaseT=0, lastExpr='smile';
const LOOK_DELAY=2.6, LOOK_TIME=4.2, AWAY_TIME=3.8;
// idle acts: small things the worm does by itself while the player thinks
let act=null, yawned=false;
const ACT_TIME={butterfly:3.4,stretch:1.7,wiggle:1.3,yawn:2.2};
function startAct(h,k){ act={k,t:0}; applyExpr(h,{butterfly:'wow',stretch:'joy',wiggle:'grin',yawn:'yawn'}[k]); if(k==='yawn') sfx('yawn'); }
function endAct(h){ if(!act) return; act=null; const b=h.userData.body; b.scale.set(1,1,1); h.rotation.z=0; h.userData.face.mouths.o.scale.set(1,1,1); }
let glanceT=0;
function burrowPos(){ for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++) if(state.grid[y][x]==='E') return wp(x,y); return null; }
function updateHead(dt){
  const h=segMeshes[0]; if(!h||!h.userData.body) return;
  const asleep=!animating && state.status==='play' && idleT-lastMoveT>25 && reactT<=0;
  if(asleep){ endAct(h); if(h.userData.expr!=='sleepy'){ applyExpr(h,'sleepy'); bumpStat('naps'); checkBadges(null); save(); } lookPhase='sleep';
    h.rotation.y=angLerp(h.rotation.y,Math.atan2(headDir[0],headDir[1]),1-Math.exp(-dt/1000*3)); h.userData.body.rotation.x+=(.25-h.userData.body.rotation.x)*(1-Math.exp(-dt/1000*3));
    h.userData.face.eyes.forEach(e=>e.scale.set(1,.22,1)); zT-=dt/1000; if(zT<0&&!reduceMotion){ zT=1.3; snore(h); } return; }
  if(lookPhase==='sleep'){ lookPhase='off'; applyExpr(h,'smile'); }
  if(reactT>0){ reactT-=dt/1000; if(reactT<=0 && lookPhase!=='look') applyExpr(h,'smile'); }
  if(photoOn){ const k=1-Math.exp(-dt/1000*5); endAct(h);
    h.rotation.y=angLerp(h.rotation.y,Math.atan2(camera.position.x-h.position.x,camera.position.z-h.position.z),k);
    h.userData.body.rotation.x+=(-.4-h.userData.body.rotation.x)*k; blinkEyes(h,dt); return; }
  const idleNow=!animating && state.status==='play' && idleT-lastMoveT>LOOK_DELAY && reactT<=0;
  if(!idleNow){ if(lookPhase==='look'||act) applyExpr(h,'smile'); endAct(h); lookPhase='off'; phaseT=0; if(idleT-lastMoveT<1) yawned=false; }
  else { phaseT+=dt/1000;
    if(lookPhase==='off'){ lookPhase='look'; phaseT=0; newExpression(h); }
    else if(lookPhase==='look' && phaseT>LOOK_TIME){ lookPhase='away'; phaseT=0; applyExpr(h,'smile');
      if(!reduceMotion&&Math.random()<.6){ const ks=['stretch','wiggle']; if(flyers.children.length) ks.push('butterfly','butterfly'); startAct(h,ks[Math.floor(Math.random()*ks.length)]); } }
    // a big yawn a few seconds before dozing off
    if(!yawned && !act && idleT-lastMoveT>21 && !reduceMotion){ yawned=true; lookPhase='away'; phaseT=0; startAct(h,'yawn'); }
    else if(lookPhase==='away' && phaseT>AWAY_TIME){ lookPhase='look'; phaseT=0; newExpression(h); } }
  const looking=lookPhase==='look';
  let moveYaw=Math.atan2(headDir[0],headDir[1]);
  if(glanceT>0){ glanceT-=dt/1000; const ex=burrowPos(); if(ex) moveYaw=Math.atan2(ex.x-h.position.x,ex.z-h.position.z); }
  const camYawR=Math.atan2(camera.position.x-h.position.x,camera.position.z-h.position.z);
  const k=1-Math.exp(-dt/1000*(looking?4:lookPhase==='away'?3.5:16));
  h.rotation.y=angLerp(h.rotation.y,looking?camYawR:moveYaw,k);
  let tilt=looking?-.45:0;
  if(act){ act.t+=dt/1000; const p=Math.min(1,act.t/ACT_TIME[act.k]), bell=Math.sin(p*Math.PI), b=h.userData.body;
    if(act.k==='butterfly'){ // follow the nearest butterfly with a look of wonder
      let best=null, bd=1e9; flyers.children.forEach(f=>{ const d=f.position.distanceToSquared(h.position); if(d<bd){ bd=d; best=f; } });
      if(best){ h.rotation.y=angLerp(h.rotation.y,Math.atan2(best.position.x-h.position.x,best.position.z-h.position.z),1-Math.exp(-dt/1000*5)); tilt=-.55; }
      if(p>.6&&h.userData.expr==='wow') applyExpr(h,'grin'); }
    if(act.k==='stretch'){ b.scale.set(1-.08*bell,1+.2*bell,1-.08*bell); tilt=-.35*bell; }
    if(act.k==='wiggle') h.rotation.z=Math.sin(act.t*20)*.13*(1-p);
    if(act.k==='yawn'){ tilt=-.42*bell; h.userData.face.mouths.o.scale.set(1+.4*bell,1+1.1*bell,1); }
    if(p>=1){ endAct(h); applyExpr(h,'smile'); } }
  h.userData.body.rotation.x+=(tilt-h.userData.body.rotation.x)*(act?1-Math.exp(-dt/1000*6):k);
  blinkEyes(h,dt);
}
function blinkEyes(h,dt){ blinkT-=dt/1000; let bl=1; if(blinkT<0){ bl=Math.max(.08,Math.abs(blinkT+.07)/.07); if(blinkT<-.14){ blinkT = Math.random()<.25 ? .18 : 1.8+Math.random()*2.5; } }
  h.userData.face.eyes.forEach(e=>{ const s=e.userData.baseS||1; e.scale.set(s,s*(e.userData.baseY||1)*bl,s); }); }
function newExpression(h){ let e; do{ e=EXPRS[Math.floor(Math.random()*EXPRS.length)]; }while(e===lastExpr); lastExpr=e; applyExpr(h,e);
  const b=h.userData.body; tween(320,(x,k)=>{ const s=1+Math.sin(k*Math.PI)*.08; b.scale.set(s,1/s,s); },()=>b.scale.set(1,1,1)); }

// ---------- tweens ----------
const tweens=[]; const dying=new Set();
function kill(o){ dying.add(o); return ()=>{ dying.delete(o); removeObj(o); }; }
function clearDying(){ dying.forEach(removeObj); dying.clear(); }
function tween(dur,fn,done){ if(reduceMotion) dur=Math.min(dur,90); tweens.push({t:0,dur,fn,done}); }
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;

// ---------- moves ----------
function canMove(){ return ['N','S','W','E'].some(d=>!step(state,d).blocked); }
function tryMove(dir){
  if(!dir||anyOverlay()||photoOn) return;
  if(animating){ if(queue.length<6) queue.push(dir); return; }
  const r=step(state,dir);
  if(r.blocked){ if(r.blocked==='over') return; queue.length=0; sfx('bump'); lastMoveT=idleT; react('oops',650);
    if(r.blocked==='locked') toast('This gate is locked. Find a key first.');
    if(r.blocked==='snail') toast('A snail is in the way. It will slide along soon.');
    if(r.blocked==='beetle'){ const h=state.segs[0], dd=DIRS[dir], bi=beetleAt(state,h[0]+dd[0],h[1]+dd[1]); beetleNope(bi); toast('The beetle can\'t budge that way. Something is behind it.'); }
    if(r.blocked==='water') toast('Too wet to cross here. Look for a bridge.');
    if(r.blocked==='bridge') toast('Bridges only go along their planks.');
    if(r.blocked==='flooded') toast('That puddle is full of water. Wait for the sun.');
    if(r.blocked==='sprout') toast('Just a seedling. It needs rain to grow into a leaf.');
    if(r.blocked==='hedge') toast('The hedge only opens while part of you rests on a flower.');
    if(r.blocked==='petals'){ const h=state.segs[0], dd=DIRS[dir], gx=h[0]+dd[0], gy=h[1]+dd[1], P=POLL[tileAt(state,gx,gy).toUpperCase()]; petalsNope(gx,gy);
      toast(`These petals only open for ${P.n} pollen. Find a ${P.n} flower first.`); }
    if(r.blocked==='body'&&tileAt(state,state.segs[0][0]+DIRS[dir][0],state.segs[0][1]+DIRS[dir][1])===SOFT&&state.segs.length>2) toast('Soft soil lets you burrow past your body, but not fold back on yourself.');
    nudge(dir); return; }
  history.push(state); const prev=state; state=r.state; lastMoveT=idleT; clearHint(); saveResume(); bumpStat('moves'); dismissTutorial();
  if(r.ev.slide){ progress.stats.slideMax=Math.max(progress.stats.slideMax||0,r.ev.slide.length); slideSteps=r.ev.slide.slice(1).map(x=>({state:x.state,ev:x.ev})).concat([{state:r.state,ev:r.ev}]); state=r.ev.slide[0].state; animateMove(prev,r.ev.slide[0].ev,dir); return; }
  animateMove(prev,r.ev,dir);
}
function nudge(dir){ // the head leans toward the blocked spot and springs back
  const h=segMeshes[0]; if(!h) return; const base=h.position.clone(); const d=DIRS[dir]; animating++;
  const look=Math.atan2(d[0],d[1]); h.rotation.y=angLerp(h.rotation.y,look,.6);
  tween(260,(e,k)=>{ const s=Math.sin(k*Math.PI)*.13*(1-k*.3); h.position.set(base.x+d[0]*s,base.y,base.z+d[1]*s); },()=>{ h.position.copy(base); animating--; if(queue.length) tryMove(queue.shift()); });
}
let slideSteps=[];
function animateMove(prev,ev,dir,sliding){
  animating++;
  const d=DIRS[dir]; headDir=[d[0],d[1]];
  sfx(ev.portal?'portal':sliding?'slide':'move',state.moves);
  if(sliding) bumpStat('slides'); if(ev.eaten==='+'||ev.eaten==='-') bumpStat('fruit');
  { const t=ev.eaten&&sayFor(ev.eaten); if(t&&!sliding) wormSays(t,1400); }
  if(ev.eaten==='C') bumpStat('flags'); if(ev.eaten==='G') bumpStat('gates'); if(ev.portal) bumpStat('tunnels'); if(ev.rain===true) bumpStat('rains');
  if(ev.swung&&ev.swung.length) bumpStat('swings'); if(ev.crumbled&&ev.crumbled.length) bumpStat('crumbles',ev.crumbled.length);
  syncBoard(true); syncWeather(true); syncHedges(true); if(ev.snails) syncSnails(true,ev);
  if(ev.pushed){ pushBeetle(ev.pushed,sliding?95:queue.length?110:170); bumpStat('pushes'); const bb=state.beetles[ev.pushed.i]; if(bb&&tileAt(state,bb.x,bb.y)==='B') bumpStat('beetleFlower'); }
  if(ev.swung){ sfx('creak'); const it=cells[state.segs[0][1]][state.segs[0][0]].item; if(it&&it.userData.wheel){ const w=it.userData.wheel, z0=w.rotation.z; tween(600,(e)=>{ w.rotation.z=z0-e*Math.PI*1.5; }); }
    if(!ev.swung.length) toast('Nothing turned. Bridges with you on them stay put.',2400); }
  if(ev.pollen){ pollensHere.add(ev.pollen); if(pollensHere.size===3&&!progress.stats.allPollen) bumpStat('allPollen'); const h=state.segs[0]; pollenPuff(wp(h[0],h[1],.25),ev.pollen); sfx('pollen'); bumpStat('dusts'); react('wow',700);
    if(!sliding){ const t=sayFor('pollen'); if(t) wormSays(t,1400); } }
  if(ev.cross){ dustPuff(wp(ev.cross[0],ev.cross[1],.05),C.softSoil); sfx('dig'); bumpStat('burrows'); }
  if(ev.rain!==undefined){ sfx(ev.rain?'rainOn':'rainOff'); toast(ev.rain?'Rain is falling. Leaves grow, puddles fill.':'The sun is back. Puddles dry, leaves fold away.',2400); }
  const n=state.segs.length, on=prev.segs.length;
  while(segMeshes.length<n){ const t=prev.segs[on-1]; const s=makeSeg(segMeshes.length); s.position.copy(wp(t[0],t[1],.25)); s.scale.setScalar(.2); segMeshes.push(s); }
  const extras=segMeshes.splice(n); tailExtras=extras;
  const starts=segMeshes.map(s=>s.position.clone()), sc0=segMeshes.map(s=>s.scale.x);
  const targets=state.segs.map((p,i)=>wp(p[0],p[1],segY(i,n)));
  const viaP = ev.portal? wp(ev.via[0],ev.via[1],.3):null;
  const tele=segMeshes.map((s,i)=>{ if(i===0||starts[i].distanceTo(targets[i])<1.3) return null; const q=state.segs[i]; const pp=partner(state,q[0],q[1]);
    return pp ? {down:wp(pp[0],pp[1],-.3), up:wp(q[0],q[1],-.3)} : {down:starts[i].clone().setY(-.3), up:targets[i].clone().setY(-.3)}; });
  const ex0=extras.map(s=>s.position.clone()); const exT=extras.map((s,j)=>j===0?starts[n-1]:ex0[j-1]);
  const dur=sliding?95:queue.length?110:170;
  tween(dur,(e,k)=>{ crawlK=k;
    segMeshes.forEach((s,i)=>{
      const sc=sc0[i]+(1-sc0[i])*e;
      // the head crawls over the tunnel and sinks into it (the turf hides it), then pops up out of the partner
      if(i===0 && viaP){ if(k<.5){ const a=Math.min(1,k*3.2), b=Math.max(0,(k-.28)/.22); s.position.lerpVectors(starts[0],viaP,1-(1-a)*(1-a)); s.position.y-=b*b*.58; s.scale.setScalar(1-.4*b); }
        else { const a=(k-.5)*2, u=1-(1-a)*(1-a); s.position.copy(targets[0]); s.position.y=-.28+(targets[0].y+.28)*u+Math.sin(a*Math.PI)*.06; s.scale.setScalar(.6+.4*u); } return; }
      if(tele[i]){ const t=tele[i]; if(k<.5) s.position.lerpVectors(starts[i],t.down,k*2); else s.position.lerpVectors(t.up,targets[i],(k-.5)*2); s.scale.setScalar(sc); return; }
      s.position.lerpVectors(starts[i],targets[i],e);
      if(i===0){ const sq=Math.sin(Math.PI*k)*.14; s.position.y+=Math.sin(Math.PI*k)*.08; s.scale.set(sc*(1+sq*.5),sc*(1-sq),sc*(1+sq*.5)); }
      else { s.scale.setScalar(sc); s.position.y+=Math.sin(Math.PI*k)*(i%2?.07:.02); }
    });
    extras.forEach((s,j)=>{ if(ex0[j].distanceTo(exT[j])<1.3) s.position.lerpVectors(ex0[j],exT[j],e); else s.position.y=ex0[j].y-e*.4; s.scale.setScalar(Math.max(.01,(1-e)*.7)); });
  },()=>{
    crawlK=-1; extras.forEach(removeObj); tailExtras=[]; squishTile(state.segs[0]);
    segMeshes.forEach(s=>s.scale.setScalar(1));
    if(ev.portal) burst(wp(ev.via[0],ev.via[1],.3),C.portal[tileAt(state,ev.via[0],ev.via[1])]||0xffffff);
    animating--; lastMoveT=idleT;
    if(slideSteps.length){ const p=state, nx=slideSteps.shift(); state=nx.state; animateMove(p,nx.ev,dir,true); return; }
    updateHUD(); if(state.status!=='won'&&checkBadges(null).length===0) save();
    if(state.status==='won') return winSeq();
    if(ev.exitNote) toast(ev.exitNote==='flags'?'The burrow opens once every flag is touched.':`This burrow fits a length of ${state.exitLen}. You're ${state.segs.length}.`);
    else if(!canMove()){ queue.length=0; sfx('stuck'); pulse($('undoBtn')); toast('No way forward from here. Undo, or hold Undo to start over.',3600); }
    if(queue.length) tryMove(queue.shift());
  });
}
function squishTile(p){ if(reduceMotion) return; const c=cells[p[1]]&&cells[p[1]][p[0]]; if(!c||!c.tile) return; const t=c.tile, y0=0;
  tween(260,(e,k)=>{ t.position.y=y0-Math.sin(k*Math.PI)*.045; },()=>{ t.position.y=y0; }); }
function winSeq(){
  animating++; queue.length=0; sfx('win'); react('joy',5000); const ex=state.segs[0]; const target=wp(ex[0],ex[1],0);
  const n=segMeshes.length; const cell=cells[ex[1]][ex[0]]; if(cell.item&&cell.item.userData.sprite) cell.item.userData.sprite.visible=false;
  burst(wp(ex[0],ex[1],.4),C.ready); burst(wp(ex[0],ex[1],.6),C.flag);
  if(!reduceMotion){ const c=wp(ex[0],ex[1],0); for(let i=0;i<8;i++){ const f=bloom(.01); const a=i/8*Math.PI*2; f.position.set(c.x+Math.cos(a)*.62,.0,c.z+Math.sin(a)*.62); fx.add(f);
      const d=i*70; tween(500+d,(e,k)=>{ const t=Math.max(0,(k*(500+d)-d)/500); f.scale.setScalar(Math.max(.01,1.1*t*(1+Math.sin(t*Math.PI)*.35))); }); } }
  const total=500+n*90;
  tween(total,(e,k)=>{ segMeshes.forEach((s,i)=>{ const st=i*90/total; const kk=Math.max(0,Math.min(1,(k-st)/(1-st)));
    const path=state.segs.slice(0,i+1).reverse().map(p=>wp(p[0],p[1],segY(i,n))); path.push(target.clone().setY(-.3));
    const f=kk*(path.length-1); const a=Math.floor(Math.min(f,path.length-1.001)); const t=f-a;
    s.position.lerpVectors(path[a],path[a+1],t);
    s.scale.setScalar(a>=path.length-2?Math.max(.02,1-t*.98):1); }); },
    ()=>{ animating--; wormG.visible=false; onWin(); });
}
function petals(){ if(reduceMotion) return; const box=$('petals'); box.innerHTML=''; const cols=['var(--petal)','var(--honey)','var(--lilac)','var(--berry)','var(--leaf)'];
  for(let i=0;i<36;i++){ const p=document.createElement('i'); p.style.left=Math.random()*100+'%'; p.style.background=cols[i%cols.length];
    p.style.animationDelay=(Math.random()*.9)+'s'; p.style.animationDuration=(2+Math.random()*1.5)+'s'; box.appendChild(p); }
  setTimeout(()=>box.innerHTML='',4200); }
function starsFor(mv,par,hinted){ let s = mv<=par?3 : mv<=Math.ceil(par*1.3)?2 : 1; if(hinted) s=Math.min(s,2); return s; }
const STAR=(on,i)=>`<svg class="star ${on?'on':''}" style="animation-delay:${.15+i*.18}s" width="44" height="44" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" style="fill:${on?'var(--honey)':'var(--edge)'}" stroke="#5B4436" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
let shareText='', newBest=false, chapterDone=null;
const shareLine=(what,mv,par,st)=>`Squirm, ${what}: ${mv} moves (par ${par}) ${'★'.repeat(st)}${'☆'.repeat(3-st)}`+(GAME_URL?'\n'+GAME_URL:'');
let winHats=[];
function onWin(){ shareText=''; newBest=false; chapterDone=null; const coloursBefore=coloursUnlocked(), patsBefore=patternsUnlocked(); winHats=HATS.filter(hatUnlocked).map(h=>h[0]);
  const par=curPar(), mv=state.moves; const st=starsFor(mv,par,hintsUsed>0); clearResume();
  const titles=['Snug as a bug!','Home sweet burrow!','Wiggle well done!','Cozy and curled up!'];
  const gifts=[], gift=(ico,t,sub,hot)=>gifts.push({ico,t,sub,hot});
  if(mode==='garden'){
    const nm=LEVELS[li].name, best=progress.best[nm]; if(best==null) stat('clear/'+pad3(li+1)); if(best!=null&&mv<best) newBest=true; if(best==null||mv<best) progress.best[nm]=mv;
    const ch=CHAPTERS.find(c=>li>=c.from&&li<=c.to); const wasDone=ch&&best!=null; if(ch && best==null){ let all=true; for(let i=ch.from;i<=ch.to;i++) if(i!==li&&!isCleared(i)) all=false; if(all) chapterDone=ch.name; }
    progress.stars[nm]=Math.max(progress.stars[nm]||0,st);
    const last=li===LEVELS.length-1;
    $('winTitle').textContent = last ? 'The whole garden!' : chapterDone ? 'Chapter complete!' : titles[li%titles.length];
    if(chapterDone){ stat('chapter/'+String(CHAPTERS.indexOf(ch)+1).padStart(2,'0')); const h=HATS.find(x=>x[2]===CHAPTERS.indexOf(ch)); gift(h?hatArt(h[0],28):art('book',26),`${chapterDone} finished`,'The whole chapter is grown',true); }
    if(!chapterDone && ch){ let left=0; for(let i=ch.from;i<=ch.to;i++) if(i!==li&&!isCleared(i)) left++; if(left) gift(art('sprout',26),`${left} more in ${ch.name}`,`Patch ${li-ch.from+1} of ${ch.to-ch.from+1} grown`); }
    // 5. say so when the next patch opens a new chapter
    const nextCh=!last&&CHAPTERS.find(c=>c.from===li+1);
    $('winNext').textContent = last&&allCleared() ? "What's next?" : last ? 'Back to patch 1' : nextCh ? 'Next chapter' : 'Next patch';
    if(nextCh) gift(art('flag',26),`Next up: ${nextCh.name}`,'A new chapter opens');
    shareText=shareLine(`patch ${li+1} (${nm})`,mv,par,st);
  } else if(L.daily){
    const D=progress.daily, k=L.daily, prev=D.results[k];
    if(!prev){ bumpStat('dailies'); stat('daily'); const y=new Date(); y.setDate(y.getDate()-1); const yk=dateKey(y);
      D.streak = D.last===yk ? D.streak+1 : 1; D.best=Math.max(D.best,D.streak); D.last=k; }
    if(!prev||mv<prev.moves) D.results[k]={moves:mv,stars:Math.max(st,prev?prev.stars:0)};
    const old=new Date(); old.setDate(old.getDate()-90); const ok=dateKey(old); for(const d in D.results) if(d<ok) delete D.results[d];
    $('winTitle').textContent="Today's patch, done!"; $('winNext').textContent='Back home'; shareRemindState();
    gift(art('flame',26),`${D.streak} day streak`,`Your best is ${D.best}. See you tomorrow!`,D.streak>1);
    shareText=shareLine(`daily patch ${k}`,mv,par,st);
  } else {
    const e=progress.endless[endlessDiff]; e.cleared++; stat('meadow/'+endlessDiff); e.streak++; e.best=Math.max(e.best,e.streak); e.stars+=st;
    $('winTitle').textContent = titles[e.cleared%titles.length];
    $('winNext').textContent = 'Grow another'; setTimeout(startPrefetch,900);
    shareText=shareLine(`${DIFF_NAME[endlessDiff].toLowerCase()} endless patch, streak ${e.streak}`,mv,par,st);
    gift(art(DIFF_ICON_KEY[endlessDiff],26),`${DIFF_NAME[endlessDiff]} streak ${e.streak}`,`${e.cleared} cleared, best streak ${e.best}`,e.streak>1&&e.streak===e.best);
  }
  { const hr=new Date().getHours(); if(hr>=15&&hr<17) bumpStat('teatime'); }
  if(mode==='garden'&&!hintsUsed) progress.clean[LEVELS[li].name]=true;
  save(); askPersist();
  const hatsBefore=winHats;
  const earned=checkBadges({won:true,mv,par,secs:playT,hour:new Date().getHours(),undos:undosHere,hinted:hintsUsed>0});
  earned.forEach(b=>gift(art(b[1],26),b[2],'New badge',true));
  const newHat=HATS.find(h=>h[0]!=='none'&&hatUnlocked(h)&&!hatsBefore.includes(h[0]));
  if(newHat) gift(hatArt(newHat[0],28),newHat[1],'New hat for your wardrobe',true);
  const newPat=patternsUnlocked().find(x=>!patsBefore.includes(x)); if(newPat){ const p=PATTERNS.find(x=>x[0]===newPat); gift(patArt(p[0],30),p[1],'New worm pattern',true); }
  if(coloursUnlocked()>coloursBefore){ const ci=coloursUnlocked()-1; gift(patArt(patOn(),30,ci),WORM_COLS[ci][0],'New worm colour',true); }
  $('winStars').innerHTML=[0,1,2].map(i=>STAR(i<st,i)).join('');
  $('winSub').textContent = hintsUsed ? `You used ${hintsUsed} ${hintsUsed===1?'hint':'hints'}. Solve it on your own for 3 stars.` : mv<=par ? 'Right on par. Lovely crawling!' : `There's a shorter way, in ${par} moves.`;
  $('winStats').innerHTML=`<span class="${mv<=par?'good':''}">${mv}<small>moves</small>${newBest?'<em>New best</em>':''}</span><span>${par}<small>par</small></span><span>${playTime()}<small>time</small></span>`;
  // the rewards first, then progress notes
  gifts.sort((a,b)=>(b.hot?1:0)-(a.hot?1:0));
  $('winGifts').innerHTML=gifts.map(g=>`<div class="gift ${g.hot?'hot':''}"><span class="gi" aria-hidden="true">${g.ico}</span><span><b>${g.t}</b><small>${g.sub}</small></span></div>`).join('');
  $('winGifts').scrollTop=0;
  for(let i=0;i<st;i++) setTimeout(()=>buzz(12),200+i*180);
  if(!reduceMotion) for(let i=0;i<st;i++) tone([784,988,1318][i],.25,{vol:.1,delay:.2+i*.18});
  photoInfo={title:mode==='garden'?`${li+1}. ${LEVELS[li].name}`:L.daily?"Today's patch":'A meadow patch',st};
  $('winShare').hidden=!shareText; petals(); show('winOv'); pushLayer('win');
  stagger([$('winStats'),...qa($('winGifts'),'.gift'),$('winNext'),document.querySelector('.win-acts')],'rise',380,70,8);
}
// ---------- photo mode ----------
// from the win dialog: the HUD steps aside, the worm pops its head out of the burrow and looks at you, and
// Snap saves (or shares) the garden with a little caption. Back returns to the win dialog.
let photoOn=false, photoInfo=null, photoFrom='win';
const photoFrame=()=>({top:Math.max(24,window.innerHeight*.06),bot:window.innerHeight-130});
function enterPhoto(){ if(photoOn) return; photoOn=true; orbit=null; ptrs.clear(); $('photoReset').hidden=true; setTimeout(()=>{ if(photoOn) toast(matchMedia('(pointer: coarse)').matches?'Drag to look around. Pinch to zoom, two fingers to move.':'Drag to look around. Right-drag to move, scroll to zoom.',3200); },700); photoFrom=isOpen('winOv')?'win':'game'; hide('winOv'); pushLayer('photo'); document.body.classList.add('photo'); $('photoBar').hidden=false; glideCamera(photoFrame());
  stagger(qa($('photoBar'),'button'),'rise',120,60);
  if(photoFrom==='game'){ const h=segMeshes[0]; if(h){ applyExpr(h,'joy'); reactT=1e6; } return; }
  const ex=state.segs[0], at=wp(ex[0],ex[1],0), h=segMeshes[0]; wormG.visible=true;
  segMeshes.forEach((sg,i)=>{ sg.position.copy(at).setY(-.3-i*.05); sg.scale.setScalar(i<3?1:.02); });
  if(h){ h.scale.setScalar(1); applyExpr(h,'joy'); reactT=1e6; tween(650,(e,k)=>{ const b=1-Math.pow(1-k,3); h.position.y=-.3+(.5+Math.sin(k*Math.PI)*.08)*b; }); } }
function exitPhoto(){ if(!photoOn) return; photoOn=false; orbit=null; ptrs.clear(); document.body.classList.remove('photo'); $('photoBar').hidden=true; reactT=0; glideCamera(); if(photoFrom==='win') show('winOv'); else { const h=segMeshes[0]; if(h) applyExpr(h,'smile'); lastMoveT=idleT; } }
function posePhoto(){ const h=segMeshes[0]; if(!h) return; newExpression(h); reactT=1e6; }
async function snapPhoto(){ renderer.render(scene,camera); const src=renderer.domElement, W=src.width, H=src.height;
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.drawImage(src,0,0);
  // caption: a cream plaque with the patch and its stars, and the game's name
  const css=getComputedStyle(document.documentElement), tok=k=>css.getPropertyValue(k).trim()||'#000', u=Math.min(W,H)/390;
  const title=photoInfo?photoInfo.title:'Squirm', st=photoInfo?photoInfo.st:0; if(!g.roundRect) g.roundRect=g.rect;
  g.font=`800 ${Math.round(17*u)}px Grandstander, sans-serif`; const tw=g.measureText(title).width;
  const pw=Math.max(tw,64*u)+32*u, ph=64*u, px=16*u, py=H-ph-18*u, r=18*u;
  g.fillStyle='rgba(91,68,54,.22)'; g.beginPath(); g.roundRect(px,py+4*u,pw,ph,r); g.fill();
  g.fillStyle='#FFF8EA'; g.strokeStyle='#E7CFA8'; g.lineWidth=3*u; g.beginPath(); g.roundRect(px,py,pw,ph,r); g.fill(); g.stroke();
  g.fillStyle='#5B4436'; g.textBaseline='alphabetic'; g.fillText(title,px+16*u,py+27*u);
  const star=new Path2D('M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z');
  for(let i=0;i<3;i++){ g.save(); g.translate(px+14*u+i*21*u,py+33*u); g.scale(.85*u,.85*u); g.fillStyle=i<st?'#F5C14E':'#E7CFA8'; g.fill(star); g.lineWidth=1.6; g.strokeStyle='#5B4436'; g.stroke(star); g.restore(); }
  g.font=`800 ${Math.round(13*u)}px Grandstander, sans-serif`; g.textAlign='right'; g.fillStyle='rgba(255,248,234,.92)'; g.strokeStyle='rgba(91,68,54,.55)'; g.lineWidth=4*u;
  g.strokeText('Squirm',W-16*u,H-20*u); g.fillText('Squirm',W-16*u,H-20*u);
  sfx('shutter'); buzz(18); if(!reduceMotion) animOnce($('flash'),'go'); bumpStat('photos'); checkBadges(null); save();
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); if(!blob){ toast('That photo didn\'t work. Try again?'); return; }
  const file=new File([blob],`squirm-${title.replace(/^\d+\.\s*/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garden'}.png`,{type:'image/png'});
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file]}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000); toast('Photo saved to your downloads.'); }
// free camera. Touch: one finger orbits; two fingers pinch to zoom, move together to pan and twist to turn.
// Mouse: drag orbits, right-drag or Shift-drag pans, the wheel zooms. Keys: arrows pan. The point the camera
// looks at (orbit.t, mirrored in camLook) stays over the bed, and tilt and distance stay in range.
let orbit=null; const ptrs=new Map(), camLook=new THREE.Vector3();
function orbitStart(){ if(orbit) return; const p=basePos.clone().sub(camLook), d=p.length(); orbit={yaw:Math.atan2(p.x,p.z),pitch:Math.asin(p.y/d),d,d0:d,t:camLook.clone()}; }
function orbitApply(){ const o=orbit; o.pitch=Math.max(.42,Math.min(1.45,o.pitch)); o.d=Math.max(o.d0*.35,Math.min(o.d0*1.35,o.d));
  const lim=boardCorners().reduce((m,p)=>({x:Math.max(m.x,Math.abs(p.x)),z:Math.max(m.z,Math.abs(p.z))}),{x:0,z:0});
  o.t.x=Math.max(-lim.x,Math.min(lim.x,o.t.x)); o.t.z=Math.max(-lim.z,Math.min(lim.z,o.t.z)); o.t.y=0; camLook.copy(o.t);
  basePos.set(Math.sin(o.yaw)*Math.cos(o.pitch),Math.sin(o.pitch),Math.cos(o.yaw)*Math.cos(o.pitch)).multiplyScalar(o.d).add(o.t);
  camera.position.copy(basePos); camera.lookAt(o.t); for(const row of cells) for(const c of row) if(c.item) faceCamera(c.item); $('photoReset').hidden=false; }
// slide the look-at point so the ground under the finger follows it
function orbitPan(dx,dy){ const o=orbit, k=2*o.d*Math.tan(camera.fov*Math.PI/360)/window.innerHeight, sy=Math.sin(o.yaw), cy=Math.cos(o.yaw);
  o.t.x-=(cy*dx)*k; o.t.z-=(-sy*dx)*k; const f=k/Math.max(.5,Math.sin(o.pitch)); o.t.x+=(-sy*dy)*f; o.t.z+=(-cy*dy)*f; }
let panBtn=false;
stage.addEventListener('pointerdown',e=>{ if(!photoOn) return; e.preventDefault(); orbitStart(); panBtn=e.pointerType==='mouse'&&(e.button===2||e.shiftKey);
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); try{ stage.setPointerCapture(e.pointerId); }catch(x){} });
stage.addEventListener('pointermove',e=>{ if(!photoOn||!ptrs.has(e.pointerId)) return; const prev=ptrs.get(e.pointerId), now={x:e.clientX,y:e.clientY};
  if(ptrs.size===1){ const dx=now.x-prev.x, dy=now.y-prev.y; if(panBtn) orbitPan(dx,dy); else { orbit.yaw-=dx*.006; orbit.pitch+=dy*.004; } }
  else { const other=[...ptrs.entries()].find(([id])=>id!==e.pointerId)[1];
    const d0=Math.hypot(prev.x-other.x,prev.y-other.y), d1=Math.hypot(now.x-other.x,now.y-other.y); if(d0>4&&d1>4) orbit.d*=d0/d1;
    orbit.yaw-=Math.atan2(now.y-other.y,now.x-other.x)-Math.atan2(prev.y-other.y,prev.x-other.x);
    orbitPan((now.x-prev.x)/2,(now.y-prev.y)/2); }
  ptrs.set(e.pointerId,now); orbitApply(); });
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>stage.addEventListener(ev,e=>ptrs.delete(e.pointerId)));
stage.addEventListener('contextmenu',e=>{ if(photoOn) e.preventDefault(); });
stage.addEventListener('wheel',e=>{ if(!photoOn) return; e.preventDefault(); orbitStart(); orbit.d*=Math.exp(e.deltaY*(e.ctrlKey?.01:.0012)); orbitApply(); },{passive:false});
// Safari's own pinch gesture would zoom the page instead
document.addEventListener('gesturestart',e=>{ if(photoOn) e.preventDefault(); });
function photoKeyPan(code){ const d={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[code]; if(!d) return false; orbitStart(); orbitPan(d[0]*40,d[1]*40); orbitApply(); return true; }
function resetView(){ orbit=null; ptrs.clear(); $('photoReset').hidden=true; glideCamera(photoFrame()); }
$('photoReset').onclick=resetView;
$('photoBtn').onclick=()=>{ if(!state||state.status!=='play'||animating||anyOverlay()) return; clearHint();
  const st=mode==='garden'?(progress.stars[LEVELS[li].name]||0):0; photoInfo={title:mode==='garden'?`${li+1}. ${LEVELS[li].name}`:L.daily?"Today's patch":'A meadow patch',st}; enterPhoto(); };
$('winHome').onclick=()=>window.history.back();
$('photoBack').onclick=()=>window.history.back();
$('photoSnap').onclick=snapPhoto;
$('photoPose').onclick=posePhoto;
function undo(){
  if(!history.length) return; bumpStat('undos'); undosHere++; checkBadges(null); save(); tweens.length=0; animating=0; queue.length=0; slideSteps.length=0; sfx('undo'); lastMoveT=idleT;
  clearDying(); clearHint(); const cur=state; state=history.pop(); syncBoard(false); syncWeather(false); syncSnails(false); snapBeetles(); syncHedges(false); updateHUD(true); saveResume();
  if(reduceMotion||cur.segs.length!==state.segs.length||segMeshes.length!==state.segs.length){ snapWorm(); return; }
  const n=state.segs.length, starts=segMeshes.map(s=>s.position.clone()), targets=state.segs.map((p,i)=>wp(p[0],p[1],segY(i,n)));
  const a=state.segs[0], b=state.segs[1]; if(b&&Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1) headDir=[a[0]-b[0],a[1]-b[1]];
  animating++; tween(150,(e)=>{ segMeshes.forEach((s,i)=>{ if(starts[i].distanceTo(targets[i])>1.3){ s.position.copy(targets[i]); return; } s.position.lerpVectors(starts[i],targets[i],e); }); },()=>{ animating--; if(queue.length) tryMove(queue.shift()); });
}
function restart(){ if(!L) return; if(state&&state.moves>0) bumpStat('restarts'); clearHint(); tweens.length=0; clearDying(); animating=0; queue.length=0; slideSteps.length=0; hideAll(); sfx('undo');
  if(state.status==='play' && state.moves>0){ history=[]; state=initState(L); syncBoard(false); snapWorm(); syncSnails(false); snapBeetles(); syncWeather(false); syncHedges(false); updateHUD(true); saveResume(); lastMoveT=idleT;
    toast('Fresh start.',1800); return; }
  clearResume(); hintsUsed=0; undosHere=0; if(mode==='garden') loadLevel(li,false); else startLevel(L,false); }

// ---------- hints ----------
let hintsUsed=0, undosHere=0, hintMesh=null, hintBusy=false;
function solveFrom(s0,cap=350000,ms=2500){ const until=performance.now()+ms;
  const seen=new Set([stateKey(s0)]); let q=[[s0,null]];
  while(q.length){ const nq=[];
    for(const [s,first] of q){ for(const d of ['N','S','W','E']){ const r=step(s,d); if(r.blocked) continue; const f=first||d;
        if(r.state.status==='won') return f; const k=stateKey(r.state); if(seen.has(k)) continue; seen.add(k); if(seen.size>cap||((seen.size&1023)===0&&performance.now()>until)) return undefined; nq.push([r.state,f]); } }
    q=nq; }
  return null; }
function clearHint(){ if(hintMesh){ removeObj(hintMesh); hintMesh=null; } }
function showHint(){
  if(animating&&!hintBusy){ setTimeout(showHint,250); return; }
  if(hintBusy||anyOverlay()||state.status!=='play') return; hintBusy=true; $('hintBtn').classList.add('busy');
  wormSays('Hmm, let me think...',1600);
  setTimeout(()=>{ const d=solveFrom(state); hintBusy=false; $('hintBtn').classList.remove('busy');
    if(d===null){ sfx('stuck'); toast('No way to win from here. Undo a few moves and try again.',3600); pulse($('undoBtn')); return; }
    if(d===undefined){ sfx('stuck'); toast('This one is too tangled to work out from here. Hold Undo to start over.',3200); return; }
    hintsUsed++; saveResume(); clearHint(); const h=state.segs[0], dd=DIRS[d], tx=h[0]+dd[0], ty=h[1]+dd[1];
    hintMesh=new THREE.Group(); const am=m('key');
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.13,.26,20),am); cone.rotation.x=Math.PI; outline(cone,.02); hintMesh.add(cone);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,10,32),new THREE.MeshBasicMaterial({color:0xFFD866,transparent:true,opacity:.9})); ring.rotation.x=-Math.PI/2; ring.position.y=-.82; hintMesh.add(ring);
    hintMesh.position.copy(wp(tx,ty,.85)); fx.add(hintMesh);
    headDir=[dd[0],dd[1]]; lastMoveT=idleT; sfx('ready'); wormSays(`Let's try ${({N:'up',S:'down',W:'left',E:'right'})[screenWord(d)]}!`,2600);
  },60);
}
function screenWord(d){ const v=screenVec(DIRS[d]); return Math.abs(v.x)>Math.abs(v.y) ? (v.x>0?'E':'W') : (v.y>0?'S':'N'); }
// ---------- UI feedback: pops, shakes and staggered entrances ----------
// scroll fades: a .fade-scroll fades its content out at an edge only while there's more to scroll that way, and the
// fade grows with that distance, so nothing is cut off sharply and nothing fades at the very top or end.
// data-fade (px, default 24) sets the size, data-fade-top overrides the top (e.g. under sticky headers).
// Scrolling, resizing and new content update it on their own (el.fadeUpdate() forces it).
function fadeScroll(el){ if(el.fadeUpdate) return el.fadeUpdate;
  const top=+(el.dataset.fadeTop||el.dataset.fade||24), bot=+(el.dataset.fade||24);
  const x=el.classList.contains('x');
  const upd=el.fadeUpdate=()=>{ const t=x?el.scrollLeft:el.scrollTop, rest=(x?el.scrollWidth-el.clientWidth:el.scrollHeight-el.clientHeight)-t;
    el.style.setProperty('--fade-t',Math.max(0,Math.min(t,top))+'px'); el.style.setProperty('--fade-b',Math.max(0,Math.min(rest,bot))+'px'); };
  el.addEventListener('scroll',upd,{passive:true}); if(window.ResizeObserver) new ResizeObserver(upd).observe(el);
  new MutationObserver(()=>requestAnimationFrame(upd)).observe(el,{childList:true,subtree:true});
  // children that slide in stick out while they move, so measure again once they settle
  el.addEventListener('animationend',upd); el.addEventListener('transitionend',upd); upd(); return upd; }
function pulse(el){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function animOnce(el,cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); const end=e=>{ if(e.target!==el) return; el.classList.remove(cls); el.removeEventListener('animationend',end); }; el.addEventListener('animationend',end); }
// selection (seg buttons, difficulty, hats, colours, map stones): the newly chosen one pops into place; the press itself plays 'tap'
const settle=el=>{ if(el) animOnce(el,'pop'); };
// a blocked action (locked stone, hat or colour, a code that won't load, reminders that can't be set): one shake, one bump, one toast
function nope(el,msg,ms=2600){ if(el) animOnce(el,'nope'); sfx('bump'); if(msg) toast(msg,ms); }
// staggered entrance: 'enter' drops in from above, 'rise' comes up from below; long lists cap the delay
function stagger(els,cls='rise',d0=0,step=45,max=12){ if(reduceMotion) return;
  [...els].filter(el=>el&&!el.hidden).forEach((el,i)=>{ el.style.setProperty('--d',(d0+Math.min(i,max)*step)+'ms'); el.classList.remove('pop'); animOnce(el,cls); }); }
// a new patch: the HUD pieces drop in one after another, the buttons rise from below
function hudIntro(){ stagger([document.querySelector('.plaque'),$('muteBtn'),document.querySelector('.hud-stats'),...document.querySelectorAll('.hud-stats .stat')],'enter');
  stagger(document.querySelectorAll('nav .gbtn'),'enter',120,55); }
// what comes in, in order, when a home tab opens
function tabIntro(name){ const pg=$('tab'+name[0].toUpperCase()+name.slice(1));
  if(name==='play'){ stagger([$('slotPlay'),document.querySelector('.brand'),document.querySelector('.tagline'),$('homePlay'),$('dailyBtn'),$('meadowBtn'),$('goalCard')],'rise',0,60); return; }
  if(name==='garden'){ const panel=pg.querySelector('.panel'); stagger([panel],'rise'); stagger([$('lvPick')],'rise',220);
    // the list scrolls to the current patch first, then the rows in view come in
    setTimeout(()=>{ const box=$('lvGrid').getBoundingClientRect(); stagger(qa($('lvGrid'),'.ch-banner,.node,.peek').filter(r=>{ const b=r.getBoundingClientRect(); return b.bottom>box.top&&b.top<box.bottom; }),'rise',0,35); },40); return; }
  if(name==='meadow') { stagger([pg.querySelector('.panel'),$('mHero'),...qa(pg,'.diff')],'rise',0,40); stagger(qa(pg,'.mech'),'rise',260,22,10); stagger(qa(pg,'.m-go .btn'),'rise',420,60); return; }
  if(name==='me'){ stagger([$('slotMe'),pg.querySelector('.panel')],'rise',0,60); stagger(qa(pg,'#wardGrid button'),'rise',140,22,12); return; }
  if(name==='badges'){ stagger([pg.querySelector('.panel')],'rise'); stagger(qa(pg,'.b-tile'),'rise',90,30,12); stagger([$('badgeDetail')],'rise',260); } }

// ---------- resume an unfinished patch after reload ----------
function saveResume(){ store.set('squirm-resume-'+mode,JSON.stringify({li,name:mode==='garden'?LEVELS[li].name:null,diff:endlessDiff,def:mode==='endless'?L:null,hints:hintsUsed,states:history.concat([state]).slice(-120)})); }
function clearResume(){ store.del('squirm-resume-'+mode); }
function readResume(m){ return store.json('squirm-resume-'+m); }
function tryResume(){ try{ const r=readResume(mode); if(!r||!r.states||!r.states.length) return false; if(mode==='garden'&&r.name!==LEVELS[li].name) return false; if(mode==='endless'&&(!r.def||r.def.seed!==L.seed)) return false;
    const sts=r.states; const last=sts[sts.length-1]; if(last.status!=='play'||sts.length<2) return false;
    state=last; history=sts.slice(0,-1); hintsUsed=r.hints||0;
    syncBoard(false); snapWorm(); syncWeather(false); syncSnails(false); snapBeetles(); syncHedges(false); updateHUD(true); return true; }catch(e){ return false; } }

// ---------- sticker icons: one hand-drawn style for every picture in the UI ----------
// 24-unit grid, brown outline with round caps and joins, pastel fills from the garden palette.
// art(name,size) scales the outline so it looks the same weight at every size.
const ART={
  // settings and general
  sound:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#9FD2F2"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>',
  palette:'<path d="M12 3.5c-4.9 0-8.5 3.6-8.5 8.1 0 4.6 3.7 8.4 8.2 8.4 1.5 0 2.2-.9 2.2-1.9 0-1.6-1.6-2.1 0-3.1h2.3c2.6 0 4.3-1.8 4.3-4.3 0-4-3.7-7.2-8.5-7.2z" fill="#FFE6C2"/><circle cx="8" cy="10.2" r="1.6" fill="#F0859F"/><circle cx="11.6" cy="7.2" r="1.6" fill="#F5C14E"/><circle cx="15.7" cy="8.7" r="1.6" fill="#78B65C"/><circle cx="8.4" cy="14.6" r="1.6" fill="#9FD2F2"/>',
  bell:'<path d="M12 3.3v1.6"/><path d="M6.2 16.6V11a5.8 5.8 0 0 1 11.6 0v5.6l1.6 1.6H4.6z" fill="#F5C14E"/><path d="M10 20.2a2 2 0 0 0 4 0"/>',
  sprout:'<path d="M12 20.5v-8"/><path d="M12 12.5c-.4-4-3.4-6.2-8-6.2 0 4.5 3 7 8 6.2z" fill="#8CC673"/><path d="M12 10.7c.4-3.6 3-5.7 7.6-5.7 0 4-2.8 6.3-7.6 5.7z" fill="#78B65C"/><path d="M7.5 20.5h9"/>',
  info:'<circle cx="12" cy="12" r="8.6" fill="#9FD2F2"/><path d="M12 11v5.6"/><path d="M12 7.6v.1" stroke-width="2.6"/>',
  camera:'<path d="M8.4 7.4l1.5-2.6h4.2l1.5 2.6" fill="#F6E2B0"/><rect x="3" y="7.2" width="18" height="12.8" rx="3.4" fill="#A9D8F5"/><circle cx="12" cy="13.6" r="3.9" fill="#FFF8EA"/><circle cx="12" cy="13.6" r="1.6" fill="#5B4436" stroke="none"/><circle cx="17.6" cy="10.1" r=".85" fill="#F27DA2" stroke="none"/>',
  'hat-chef':'<path d="M7 15.4h10v4.3H7z" fill="#FFFBF2"/><path d="M7 15.4c-2.6-.4-3.8-2.6-3-4.6.8-2 3-2.6 4.5-1.8.4-2.4 2.3-3.9 3.5-3.9s3.1 1.5 3.5 3.9c1.5-.8 3.7-.2 4.5 1.8.8 2-.4 4.2-3 4.6z" fill="#FFFBF2"/>',
  'hat-wizard':'<path d="M3 19.5c2.5-1.6 15.5-1.6 18 0-2.5 1.3-15.5 1.3-18 0z" fill="#8E7BE0"/><path d="M6.8 18.6L12.6 3.2c1.4 1.2 2.3 3.1 2.6 5.2l2 10.2z" fill="#8E7BE0"/><path d="M12.40 11.30L12.99 12.79L14.59 12.89L13.35 13.91L13.75 15.46L12.40 14.60L11.05 15.46L11.45 13.91L10.21 12.89L11.81 12.79z" fill="#F5C14E" stroke-width="1"/>',
  'hat-cowboy':'<path d="M2.5 15c1.5 2.9 5.2 4.2 9.5 4.2s8-1.3 9.5-4.2c-2 .9-4.2 1.3-5.5 1.3H8c-1.3 0-3.5-.4-5.5-1.3z" fill="#C98E52"/><path d="M7.4 16.3l.8-7.2c.3-2.2 1.6-3.4 3.8-2.2 2.2-1.2 3.5 0 3.8 2.2l.8 7.2z" fill="#C98E52"/><path d="M7.7 13.8h8.6" stroke-width="2.2" stroke="#8A5A36"/>',
  'hat-phones':'<path d="M5 15.5V12a7 7 0 0 1 14 0v3.5" stroke="#6E5F86"/><rect x="2.8" y="12.6" width="4.6" height="7.2" rx="2.2" fill="#F7A8C4"/><rect x="16.6" y="12.6" width="4.6" height="7.2" rx="2.2" fill="#F7A8C4"/>',
  'extra-glasses':'<circle cx="7.4" cy="12.8" r="4.1" fill="#EAF8FF"/><circle cx="16.6" cy="12.8" r="4.1" fill="#EAF8FF"/><path d="M11.4 12.2q.6-.9 1.2 0M3.3 11.8L1.8 10.4M20.7 11.8l1.5-1.4"/><path d="M5.6 11.2l1.2-1" stroke="#fff" stroke-width="1"/>',
  'extra-shades':'<path d="M2.8 10.2h7.8c0 3.6-1.4 5.8-3.9 5.8S2.8 13.8 2.8 10.2zM13.4 10.2h7.8c0 3.6-1.4 5.8-3.9 5.8s-3.9-2.2-3.9-5.8z" fill="#3E3548"/><path d="M10.6 10.8h2.8"/><path d="M4.8 11.6l1.6-.1" stroke="#fff" stroke-width="1"/>',
  'extra-hearts':'<path d="M7.4 17.4l-3.9-3.9c-1.4-1.4-1.2-3.6.4-4.4 1.3-.7 2.7-.2 3.5.9.8-1.1 2.2-1.6 3.5-.9 1.6.8 1.8 3 .4 4.4z" fill="#F27DA2"/><path d="M16.6 17.4l-3.9-3.9c-1.4-1.4-1.2-3.6.4-4.4 1.3-.7 2.7-.2 3.5.9.8-1.1 2.2-1.6 3.5-.9 1.6.8 1.8 3 .4 4.4z" fill="#F27DA2"/><path d="M11.1 11.6h1.8"/>',
  'extra-stars':'<path d="M7.30 7.80L8.71 10.86L12.06 11.25L9.58 13.54L10.24 16.85L7.30 15.20L4.36 16.85L5.02 13.54L2.54 11.25L5.89 10.86z" fill="#F5C14E"/><path d="M16.70 7.80L18.11 10.86L21.46 11.25L18.98 13.54L19.64 16.85L16.70 15.20L13.76 16.85L14.42 13.54L11.94 11.25L15.29 10.86z" fill="#F5C14E"/>',
  'extra-monocle':'<circle cx="14.4" cy="10.8" r="5" fill="#EAF8FF"/><circle cx="14.4" cy="10.8" r="3.7" stroke="#E0B04A" stroke-width="1.2"/><path d="M14.4 15.8c0 2.6-1.6 4.2-4.4 4.8" stroke-dasharray="1.1 1.7"/>',
  'extra-walrus':'<path d="M12 9.4c-2.6-1-6.2-.9-7.9 1.1-1 1.2-1.3 3-1 4.7.5.8 1.4.6 1.8-.2.3.9 1.2 1.2 1.9.5.3.9 1.3 1.1 1.9.3.4.9 1.4.9 1.9 0 .4.8 1.4.8 1.4.1.4.7 1.4.7 1.8-.1.6.8 1.6.6 1.9-.3.7.7 1.6.4 1.9-.5.6.8 1.5.6 1.8-.2.3-1.7 0-3.5-1-4.7-1.7-2-5.3-2.1-7.9-1.1z" fill="#6B4A35"/><path d="M5.6 11.4c1.8-1 4-1.1 5.4-.5M13 10.9c1.4-.6 3.6-.5 5.4.5" stroke="#B08560" stroke-width="1.1"/>',
  'extra-freckles':'<circle cx="12" cy="12" r="8.6" fill="#FFB0C6"/><g fill="#6B4A35" stroke="none"><circle cx="7.4" cy="12.6" r=".9"/><circle cx="9.2" cy="14.2" r=".9"/><circle cx="6.8" cy="15" r=".8"/><circle cx="16.6" cy="12.6" r=".9"/><circle cx="14.8" cy="14.2" r=".9"/><circle cx="17.2" cy="15" r=".8"/></g>',
  'extra-nose':'<circle cx="12" cy="12" r="6.4" fill="#E36A8C"/><circle cx="10" cy="9.8" r="1.4" fill="#fff" stroke="none"/>',
  'extra-flower':'<g fill="#FFFBF2"><circle cx="12" cy="6.4" r="3.6"/><circle cx="17.4" cy="10.3" r="3.6"/><circle cx="15.3" cy="16.6" r="3.6"/><circle cx="8.7" cy="16.6" r="3.6"/><circle cx="6.6" cy="10.3" r="3.6"/></g><circle cx="12" cy="12" r="3" fill="#F5C14E"/>',
  'extra-bowtie':'<path d="M12 12L3.8 7.2v9.6zM12 12l8.2-4.8v9.6z" fill="#E36A8C"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx="1.6" fill="#F27DA2"/>',
  'extra-scarf':'<path d="M3.6 9.4c3 3.2 13.8 3.2 16.8 0l.6 3.4c-3.4 3.8-14.6 3.8-18 0z" fill="#F07A6A"/><path d="M7 11.6l-.5 3.3M12 12.4v3.4M17 11.6l.5 3.3" stroke="#FFF1A8" stroke-width="1.3"/><path d="M15.4 14.6l-1.6 5.6 2.8.9 1.2-5.8zM17.4 14.4l1.6 5.4 2.6-1.1-2-5.2z" fill="#F07A6A"/><circle cx="16.4" cy="14.4" r="2" fill="#F07A6A"/>',
  'extra-tash':'<path d="M12 11.6c-1.6-1.6-4.6-1.8-6.4-.2-1 .9-2.2 1-3 .2.2 2.6 2.6 4.4 5.4 4.1 1.8-.2 3.2-1.2 4-2.4.8 1.2 2.2 2.2 4 2.4 2.8.3 5.2-1.5 5.4-4.1-.8.8-2 .7-3-.2-1.8-1.6-4.8-1.4-6.4.2z" fill="#6B4A35"/><path d="M6.6 12.5c1.3-.6 2.8-.5 4 .3M13.4 12.8c1.2-.8 2.7-.9 4-.3" stroke="#B08560" stroke-width="1.1"/>',
  dice:'<rect x="4" y="4" width="16" height="16" rx="4.2" fill="#F7A8C4"/><g fill="#5B4436" stroke="none"><circle cx="8.6" cy="8.6" r="1.35"/><circle cx="15.4" cy="15.4" r="1.35"/><circle cx="12" cy="12" r="1.35"/><circle cx="15.4" cy="8.6" r="1.35"/><circle cx="8.6" cy="15.4" r="1.35"/></g>',
  lock:'<path d="M8 10.5V8.2a4 4 0 0 1 8 0v2.3"/><rect x="5" y="10.5" width="14" height="10" rx="3" fill="#F5C14E"/><path d="M12 14.6v2.2"/>',
  // difficulty
  tulip:'<path d="M12 20.5v-7.5"/><path d="M12 18c-2.6-.4-4.2-2-4.6-4.2 2.4 0 4 1.3 4.6 4.2zM12 19c2.6-.4 4.2-2 4.6-4.2-2.4 0-4 1.3-4.6 4.2z" fill="#78B65C"/><path d="M7.6 4.6L10 6.8l2-3 2 3 2.4-2.2v4.8a4.4 4.4 0 0 1-8.8 0z" fill="#F0859F"/>',
  tree:'<path d="M12 20.5v-5.5" stroke-width="2.6"/><path d="M12 3.3a5 5 0 0 1 4.9 3.9 4.3 4.3 0 0 1-1 8.3H8.1a4.3 4.3 0 0 1-1-8.3A5 5 0 0 1 12 3.3z" fill="#78B65C"/><circle cx="9.4" cy="10.2" r="1" fill="#F0859F" stroke="none"/><circle cx="14.7" cy="8.4" r="1" fill="#F0859F" stroke="none"/><circle cx="13.4" cy="12.3" r="1" fill="#F0859F" stroke="none"/>',
  // stats and rewards
  flame:'<path d="M12 20.8c-3.8 0-6.4-2.6-6.4-6.1 0-3.3 2.5-5.2 3.5-8.2 1.6 1.2 2.2 2.7 2.2 4.2 1-1 1.6-2.6 1.5-4.4 3 1.9 5.6 5 5.6 8.5 0 3.4-2.6 6-6.4 6z" fill="#FFA27C"/><path d="M12 20.8c-1.7 0-2.9-1.2-2.9-2.8 0-1.7 1.6-2.7 2.9-4.4 1.3 1.7 2.9 2.7 2.9 4.4 0 1.6-1.2 2.8-2.9 2.8z" fill="#F5C14E"/>',
  trophy:'<path d="M8 5.6H5.2a2.9 2.9 0 0 0 3.1 4.2M16 5.6h2.8a2.9 2.9 0 0 1-3.1 4.2"/><path d="M8 3.8h8v5.4a4 4 0 0 1-8 0z" fill="#F5C14E"/><path d="M12 13.2v3.2"/><path d="M8.6 20.5h6.8l-.9-4.1H9.5z" fill="#D9A56E"/>',
  star:'<path d="M12 2.9l2.75 5.6 6.15.9-4.45 4.35 1.05 6.15L12 17l-5.5 2.9 1.05-6.15L3.1 9.4l6.15-.9z" style="fill:var(--honey)"/>',
  stars:'<path d="M9.5 3.4l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" style="fill:var(--honey)"/><path d="M17.6 12.6l1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3z" fill="#FFF8EA"/>',
  sparkles:'<path d="M10 3.2l1.7 4.6 4.6 1.7-4.6 1.7L10 15.8l-1.7-4.6L3.7 9.5l4.6-1.7z" style="fill:var(--honey)"/><path d="M17.2 12.8l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="#FFF8EA"/>',
  crown:'<path d="M4.2 17.2L3.2 8l5 4 3.8-6.2L15.8 12l5-4-1 9.2z" fill="#F5C14E"/><path d="M4.2 20h15.6"/><circle cx="12" cy="13.6" r="1.4" fill="#F0859F"/>',
  medal:'<path d="M7.4 2.8h3.3l2.4 5.3-2.6 2.6zM16.6 2.8h-3.3L11 8l2.5 2.7z" fill="#9FD2F2"/><circle cx="12" cy="15" r="5.6" fill="#F5C14E"/><path d="M12 12.2l.85 1.75 1.9.27-1.38 1.34.33 1.9-1.7-.9-1.7.9.33-1.9-1.38-1.34 1.9-.27z" fill="#FFF8EA" stroke-width="1.1"/>',
  daisy:'<g fill="#FFF8EA"><circle cx="12" cy="6.4" r="3"/><circle cx="17.3" cy="10.3" r="3"/><circle cx="15.3" cy="16.5" r="3"/><circle cx="8.7" cy="16.5" r="3"/><circle cx="6.7" cy="10.3" r="3"/></g><circle cx="12" cy="12" r="3" fill="#F5C14E"/>',
  blossom:'<g fill="#F7B3C5"><circle cx="12" cy="6.4" r="3"/><circle cx="17.3" cy="10.3" r="3"/><circle cx="15.3" cy="16.5" r="3"/><circle cx="8.7" cy="16.5" r="3"/><circle cx="6.7" cy="10.3" r="3"/></g><circle cx="12" cy="12" r="2.8" fill="#FFF8EA"/>',
  calendar:'<path d="M3.6 9.5V8a3 3 0 0 1 3-3h10.8a3 3 0 0 1 3 3v1.5z" fill="#F0859F"/><path d="M3.6 9.5h16.8v8a3 3 0 0 1-3 3H6.6a3 3 0 0 1-3-3z" fill="#FFF8EA"/><path d="M8 3.2v3.6M16 3.2v3.6"/><circle cx="12" cy="15" r="2" fill="#78B65C"/>',
  week:'<path d="M3.6 9.5V8a3 3 0 0 1 3-3h10.8a3 3 0 0 1 3 3v1.5z" fill="#F0859F"/><path d="M3.6 9.5h16.8v8a3 3 0 0 1-3 3H6.6a3 3 0 0 1-3-3z" fill="#FFF8EA"/><path d="M8 3.2v3.6M16 3.2v3.6"/><path d="M9.8 12.8h4.4l-2.6 5"/>',
  month:'<path d="M3.6 9.5V8a3 3 0 0 1 3-3h10.8a3 3 0 0 1 3 3v1.5z" fill="#B79CF2"/><path d="M3.6 9.5h16.8v8a3 3 0 0 1-3 3H6.6a3 3 0 0 1-3-3z" fill="#FFF8EA"/><path d="M8 3.2v3.6M16 3.2v3.6"/><path d="M12 12.4l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" style="fill:var(--honey)" stroke-width="1.2"/>',
  target:'<circle cx="12" cy="12" r="8.6" fill="#FFF8EA"/><circle cx="12" cy="12" r="5.3" fill="#F0859F"/><circle cx="12" cy="12" r="2" fill="#FFF8EA"/>',
  book:'<path d="M3.8 5.6c2.8-1 5.5-1 8.2.7v14c-2.7-1.7-5.4-1.7-8.2-.7z" fill="#8CC673"/><path d="M20.2 5.6c-2.8-1-5.5-1-8.2.7v14c2.7-1.7 5.4-1.7 8.2-.7z" fill="#78B65C"/>',
  bulb:'<path d="M9.3 17.8h5.4M10.2 20.8h3.6"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="#F5C14E"/>',
  house:'<path d="M5.6 10.4V19a1.5 1.5 0 0 0 1.5 1.5h9.8a1.5 1.5 0 0 0 1.5-1.5v-8.6" fill="#FFF8EA"/><path d="M2.8 11.4L12 3.8l9.2 7.6" fill="#F0859F"/><path d="M10 20.5v-5h4v5" fill="#D9A56E"/>',
  wheat:'<path d="M12 20.8V7"/><g fill="#F5C14E"><ellipse cx="9.5" cy="9.4" rx="1.6" ry="2.6" transform="rotate(-38 9.5 9.4)"/><ellipse cx="14.5" cy="9.4" rx="1.6" ry="2.6" transform="rotate(38 14.5 9.4)"/><ellipse cx="9.5" cy="14" rx="1.6" ry="2.6" transform="rotate(-38 9.5 14)"/><ellipse cx="14.5" cy="14" rx="1.6" ry="2.6" transform="rotate(38 14.5 14)"/><ellipse cx="12" cy="5" rx="1.6" ry="2.6"/></g>',
  shield:'<path d="M12 3.2l7 2.5v5.4c0 4.4-2.9 8-7 9.8-4.1-1.8-7-5.4-7-9.8V5.7z" fill="#9FD2F2"/><path d="M8.6 12.1l2.3 2.3 4.5-4.6"/>',
  mountain:'<path d="M2.8 19.5L9.4 8l3.6 5.6 2.4-3.4 5.8 9.3z" fill="#9FD2F2"/><path d="M7.4 11.5L9.4 8l2 3.2-1 .9-1-1z" fill="#FFF8EA"/><path d="M15.4 10.2l1.6 2.6" />',
  leaf:'<path d="M5 19.2C5 10.4 10 5 19.6 4.4c0 9.6-5 14.8-14.6 14.8z" fill="#78B65C"/><path d="M5 19.2l8.3-8.3"/>',
  wetleaf:'<path d="M5 19.2C5 10.4 10 5 19.6 4.4c0 9.6-5 14.8-14.6 14.8z" fill="#8EE0B4"/><path d="M5 19.2l8.3-8.3"/><path d="M16.6 14.6a1.6 1.6 0 0 0 3.2 0c0-1-1.6-3-1.6-3s-1.6 2-1.6 3z" fill="#EAF8FF" stroke-width="1.2"/>',
  hedge:'<path d="M3.5 20V11.3a3 3 0 0 1 3-3 3.4 3.4 0 0 1 5.5-1.5 3.4 3.4 0 0 1 5.5 1.5 3 3 0 0 1 3 3V20z" fill="#5FA64F"/><circle cx="8.2" cy="12.8" r=".9" fill="#F7A8C4" stroke="none"/><circle cx="14.6" cy="11.4" r=".9" fill="#F7A8C4" stroke="none"/><circle cx="12" cy="16.2" r=".9" fill="#F7A8C4" stroke="none"/>',
  beetle:'<path d="M4.8 12.6L2.6 13.8M5 15.8l-2.2 2M19.2 12.6l2.2 1.2M19 15.8l-2.2 2"/><ellipse cx="12" cy="14.6" rx="7.4" ry="6" fill="#7C8CF0"/><path d="M12 9v11.6"/><circle cx="8.9" cy="14.6" r="1.2" fill="#B5C0FA" stroke="none"/><circle cx="15.1" cy="14.6" r="1.2" fill="#B5C0FA" stroke="none"/><circle cx="12" cy="7.4" r="3.4" fill="#3E3F84"/><path d="M12 4c.3-1.6 1.4-2.2 2.6-2.2"/><circle cx="10.8" cy="7.2" r=".85" fill="#fff" stroke="none"/><circle cx="13.2" cy="7.2" r=".85" fill="#fff" stroke="none"/>',
  fruit:'<circle cx="7.5" cy="14.5" r="5.3" fill="#FFA27C"/><path d="M7.5 9.2c0-1.4.5-2.5 1.4-3.1"/><path d="M8.9 6.6c1.5-1.3 3.3-1.2 4-.3-1.1 1.3-2.7 1.5-4 .3z" fill="#6CC97A"/><rect x="16.4" y="13.6" width="3.2" height="6" rx="1.2" fill="#FFF1DE"/><path d="M13.2 14.2a4.8 4.8 0 0 1 9.6 0z" fill="#B79CF2"/><circle cx="16.4" cy="11.6" r=".8" fill="#fff" stroke="none"/><circle cx="19.4" cy="10.9" r=".9" fill="#fff" stroke="none"/>',
  tunnel:'<ellipse cx="12" cy="14" rx="9" ry="6" fill="#A9744F"/><ellipse cx="12" cy="14" rx="5" ry="3.2" fill="#2E2019" stroke="none"/><circle cx="5" cy="9" r="2" fill="#7FCFEA"/><circle cx="19" cy="9" r="2" fill="#7FCFEA"/>',
  flowerbtn:'<path d="M12 21V12.5a2.6 2.6 0 0 1 2.6-2.6 3 3 0 0 1 5.4-1 2.6 2.6 0 0 1 2.5 2.6V21z" fill="#5FA64F"/><g fill="#F7A8C4"><circle cx="5" cy="13.5" r="2.4"/><circle cx="8.6" cy="16" r="2.4"/><circle cx="7.3" cy="20" r="2.4"/><circle cx="2.7" cy="20" r="2.4"/><circle cx="1.4" cy="16" r="2.4"/></g><circle cx="5" cy="17.2" r="1.9" fill="#F7C64F"/>',
  start:'<ellipse cx="10" cy="16.5" rx="8" ry="4.6" fill="#B07B57"/><ellipse cx="10" cy="16.2" rx="4.8" ry="2.5" fill="#3A2A22" stroke="none"/><path d="M18.5 15V9.5"/><rect x="14.5" y="3" width="8" height="6.5" rx="1.5" fill="#D9A56E"/><text x="18.5" y="8.1" font-size="5.5" font-family="sans-serif" font-weight="800" text-anchor="middle" fill="#5B4436" stroke="none">3</text>',
  peach:'<path d="M12 7.6c-4.2-1.4-7.5 1.4-7.5 5.4 0 4.2 3.3 7.5 7.5 7.5s7.5-3.3 7.5-7.5c0-4-3.3-6.8-7.5-5.4z" fill="#FFA27C"/><path d="M12 7.6c-1 2.2-1 5 0 7"/><path d="M12 7.4c.8-2.6 3.2-3.8 5.8-3.4-.8 2.6-3.2 3.8-5.8 3.4z" fill="#6CC97A"/>',
  mushroom:'<path d="M9.6 13.2v5.3a2.4 2.4 0 0 0 4.8 0v-5.3" fill="#FFF1DE"/><path d="M3.6 13.2a8.4 7.6 0 0 1 16.8 0z" fill="#B79CF2"/><circle cx="9" cy="9.4" r="1.3" fill="#fff" stroke="none"/><circle cx="14.6" cy="8.4" r="1" fill="#fff" stroke="none"/><circle cx="16.4" cy="11.2" r=".9" fill="#fff" stroke="none"/>',
  moon:'<path d="M15.4 3.6a8.5 8.5 0 1 0 5 13.2 7 7 0 0 1-5-13.2z" fill="#F5C14E"/><circle cx="18.6" cy="6.2" r=".6" fill="#5B4436" stroke="none"/>',
  bolt:'<path d="M13.6 2.6L5.6 13.5h5.6L9.8 21.4l8-11h-5.6z" fill="#F5C14E"/>',
  flag:'<path d="M5.2 21V3.8"/><path d="M5.2 4h12.2l-3 4 3 4H5.2" fill="#F27DA2"/>',
  burrow:'<ellipse cx="12" cy="14.2" rx="9.4" ry="6" fill="#B07B57"/><ellipse cx="12" cy="13.8" rx="5.2" ry="2.9" fill="#3A2A22"/>',
  key:'<circle cx="8" cy="8" r="4.5" fill="#F7C64F"/><path d="M11.2 11.2l8 8M16.2 16.2l2.2-2.2M18.6 18.6l1.8-1.8"/>',
  crack:'<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4" fill="#EBD59C"/><path d="M7 8l4 3 1.5 4.5 4 2M11 11l5-3.2"/>',
  rain:'<path d="M7 14.5a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 6.1a4 4 0 0 1 .5 8.4z" fill="#C9D6EA"/><path d="M8.5 17.6l-1 2.2M12.5 17.6l-1 2.2M16.5 17.6l-1 2.2"/>',
  drop:'<path d="M12 3.4s-6 6.9-6 11a6 6 0 0 0 12 0c0-4.1-6-11-6-11z" fill="#9FD2F2"/><path d="M9.2 14.6a2.8 2.8 0 0 0 1.8 2.6" stroke-width="1.3"/>',
  bridge:'<rect x="1.5" y="8" width="21" height="8" rx="2.5" fill="#8CCFEA"/><path d="M3.5 12c1-.8 2-.8 3 0M17.5 12c1-.8 2-.8 3 0" stroke="#fff"/><rect x="8.5" y="3.5" width="7" height="17" rx="1.4" fill="#D9A56E"/><path d="M8.5 8h7M8.5 12h7M8.5 16h7" stroke="#B98352"/>',
  steps:'<ellipse cx="8.6" cy="9" rx="3.2" ry="4.6" transform="rotate(-12 8.6 9)" fill="#E8B98F"/><ellipse cx="15.5" cy="15.4" rx="3.2" ry="4.6" transform="rotate(-12 15.5 15.4)" fill="#E8B98F"/>',
  rewind:'<circle cx="12" cy="12" r="8.6" fill="#9FD2F2"/><path d="M12.3 8.2l-3.8 3.8 3.8 3.8M16.3 8.2l-3.8 3.8 3.8 3.8"/>',
  heart:'<path d="M12 20s-7.6-4.6-7.6-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.6 10c0 5.4-7.6 10-7.6 10z" fill="#F0859F"/>',
  zzz:'<circle cx="12" cy="12" r="8.6" fill="#C9D6EA"/><path d="M7.4 9.4h4.2l-4.2 5h4.2M13.4 7.2h3.2l-3.2 3.8h3.2"/>',
  owl:'<path d="M5.8 9.6a6.2 6.2 0 0 1 12.4 0v5a6.2 6.2 0 0 1-12.4 0z" fill="#D9A56E"/><path d="M5.8 5.4l2.6 3M18.2 5.4l-2.6 3"/><circle cx="9.4" cy="11.4" r="2.3" fill="#FFF8EA"/><circle cx="14.6" cy="11.4" r="2.3" fill="#FFF8EA"/><circle cx="9.6" cy="11.6" r=".8" fill="#5B4436" stroke="none"/><circle cx="14.4" cy="11.6" r=".8" fill="#5B4436" stroke="none"/><path d="M11.2 14.4l.8 1.2.8-1.2z" fill="#F5C14E"/>',
  rainbow:'<path d="M2.6 18.4a9.4 9.4 0 0 1 18.8 0z" fill="#F0859F"/><path d="M5.6 18.4a6.4 6.4 0 0 1 12.8 0z" fill="#F5C14E"/><path d="M8.6 18.4a3.4 3.4 0 0 1 6.8 0z" fill="#9FD2F2"/>',
  snail:'<path d="M2.8 18.6c0-1 .9-1.7 2.1-1.7h10.8c1.8 0 2.9-1.2 2.9-2.9v-2.2a1.7 1.7 0 0 1 3.4 0V14c0 2.7-2 4.9-4.8 4.9H3.9c-.6 0-1.1-.1-1.1-.3z" fill="#F6E2B0"/><path d="M19 10.6l-.8-3M21.4 10.6l.8-3"/><circle cx="10.2" cy="11.4" r="5.4" fill="#C9A0E6"/><path d="M10.6 12.2a.9.9 0 1 1 .5-1.5 2.2 2.2 0 1 1-3 2.6 3.4 3.4 0 1 1 5.6-3.4" stroke-width="1.3"/>',
  butterfly:'<path d="M12 7.5v10"/><path d="M12 10C9.6 5.4 4 4.6 4 8.6c0 2.6 3 3.6 8 3.4zM12 10c2.4-4.6 8-5.4 8-1.4 0 2.6-3 3.6-8 3.4z" fill="#F7B3C5"/><path d="M12 12.2c-3.4.2-6 1.8-5 4.2 1 2.2 4 1.4 5-2.6zM12 12.2c3.4.2 6 1.8 5 4.2-1 2.2-4 1.4-5-2.6z" fill="#FFE07A"/><path d="M12 7.5l-1.6-2.6M12 7.5l1.6-2.6"/>',
  bee:'<ellipse cx="12" cy="14" rx="6.2" ry="4.8" fill="#F5C14E"/><path d="M10.2 9.6v8.8M13.8 9.6v8.8" stroke-width="2.2"/><path d="M8.6 9.8C7 6 3.6 6.4 4.2 8.8c.5 1.8 2.6 2.2 4.4 1zM15.4 9.8c1.6-3.8 5-3.4 4.4-1-.5 1.8-2.6 2.2-4.4 1z" fill="#EAF8FF"/>',
  balloon:'<path d="M12 15.4c-3.4 0-5.6-3-5.6-6.2a5.6 5.6 0 0 1 11.2 0c0 3.2-2.2 6.2-5.6 6.2z" fill="#F0859F"/><path d="M11 15.4h2l-1 1.4z" fill="#F0859F"/><path d="M12 16.8c-1.2 1.4 1.2 2.4 0 4"/><path d="M9.4 7.4a2.8 2.8 0 0 1 1.8-1.6" stroke-width="1.3"/>',
  sunflower:'<g fill="#FFD34D"><ellipse cx="12" cy="5.6" rx="2" ry="3"/><ellipse cx="12" cy="18.4" rx="2" ry="3"/><ellipse cx="5.6" cy="12" rx="3" ry="2"/><ellipse cx="18.4" cy="12" rx="3" ry="2"/><ellipse cx="7.5" cy="7.5" rx="2" ry="3" transform="rotate(-45 7.5 7.5)"/><ellipse cx="16.5" cy="16.5" rx="2" ry="3" transform="rotate(-45 16.5 16.5)"/><ellipse cx="16.5" cy="7.5" rx="2" ry="3" transform="rotate(45 16.5 7.5)"/><ellipse cx="7.5" cy="16.5" rx="2" ry="3" transform="rotate(45 7.5 16.5)"/></g><circle cx="12" cy="12" r="3.6" fill="#7A4E2E"/>',
  bowtie:'<path d="M10.4 12C8 8.4 5.6 6.2 3.8 6.8 2.6 7.2 2.4 9.6 2.4 12s.2 4.8 1.4 5.2c1.8.6 4.2-1.6 6.6-5.2zM13.6 12c2.4-3.6 4.8-5.8 6.6-5.2 1.2.4 1.4 2.8 1.4 5.2s-.2 4.8-1.4 5.2c-1.8.6-4.2-1.6-6.6-5.2z" fill="#F0859F"/><rect x="9.8" y="9.2" width="4.4" height="5.6" rx="1.8" fill="#E36A8C"/>',
  sun:'<circle cx="12" cy="12" r="4.6" style="fill:var(--honey)"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M5.4 18.6l1.7-1.7M16.9 7.1l1.7-1.7"/>',
  worm:'<path d="M3.4 15.6c2.6-5.4 5.4-5.4 7.6 0s5 5.4 7.4 0" stroke-width="6.4"/><path d="M3.4 15.6c2.6-5.4 5.4-5.4 7.6 0s5 5.4 7.4 0" stroke="#FF97B4" stroke-width="3.4"/><circle cx="19" cy="12.6" r="3.2" fill="#FF97B4"/><circle cx="20" cy="12" r=".7" fill="#5B4436" stroke="none"/>',
  // hats, as worn: a little hat sitting on a pink worm-head curve
  'hat-none':'<circle cx="12" cy="12" r="8.6" fill="#FFF8EA"/><path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4"/>',
  'hat-crown':'<path d="M3.4 17.4c1.4-5.2 4.8-8 8.6-8s7.2 2.8 8.6 8" stroke-width="4.6"/><path d="M3.4 17.4c1.4-5.2 4.8-8 8.6-8s7.2 2.8 8.6 8" stroke="#78B65C" stroke-width="2.4"/><g fill="#F7A8C4"><circle cx="5" cy="13.4" r="2.2"/><circle cx="12" cy="9.2" r="2.4"/><circle cx="19" cy="13.4" r="2.2"/></g><g fill="#FFF1A8"><circle cx="8.2" cy="10.6" r="1.9"/><circle cx="15.8" cy="10.6" r="1.9"/></g>',
  'hat-mush':'<path d="M3.4 15.4a8.6 8.6 0 0 1 17.2 0z" fill="#F07A6A"/><circle cx="8.6" cy="11.6" r="1.4" fill="#FFF8EA" stroke="none"/><circle cx="13.8" cy="9.4" r="1.2" fill="#FFF8EA" stroke="none"/><circle cx="16.4" cy="13" r="1" fill="#FFF8EA" stroke="none"/><path d="M6 15.4v1.6a6 2 0 0 0 12 0v-1.6" fill="#F6E2B0"/>',
  'hat-straw':'<ellipse cx="12" cy="15.8" rx="9.6" ry="3.4" fill="#F3D18A"/><path d="M7.2 15.2V12a4.8 4.8 0 0 1 9.6 0v3.2c-1.4.8-2.8 1.2-4.8 1.2s-3.4-.4-4.8-1.2z" fill="#F3D18A"/><path d="M7.2 13h9.6v1.8H7.2z" fill="#F0859F"/>',
  'hat-tophat':'<ellipse cx="12" cy="18.2" rx="9" ry="2.6" fill="#4E3F5C"/><path d="M7.4 18V5.8h9.2V18c-1.4.6-2.8.8-4.6.8s-3.2-.2-4.6-.8z" fill="#4E3F5C"/><path d="M7.4 13.6h9.2v2.2H7.4z" fill="#F0859F"/>',
  'hat-leaf':'<path d="M3.6 15.6C5 9 8.8 5.6 15 5c3.4 0 5.4 1 5.4 1-.4 6-4 9.6-16.8 9.6z" fill="#78B65C"/><path d="M5.2 15.2C9 11.6 13 9 18 7"/><path d="M12.4 6.8c-.6-1.6-.2-3 .8-3.8"/>',
  'hat-rainhat':'<path d="M2.8 15.6c2 1.6 5 2.4 9.2 2.4s7.2-.8 9.2-2.4l-2.2-2.2H5z" fill="#FFD04A"/><path d="M6.6 13.6V11.2a5.4 5.4 0 0 1 10.8 0v2.4" fill="#FFD04A"/><path d="M15 7.4l1.6-1.6" stroke-width="1.3"/>',
  'hat-acorn':'<path d="M5.6 12.6c0 4.4 2.8 7.8 6.4 7.8s6.4-3.4 6.4-7.8" fill="#C98E52"/><path d="M3.8 12.8a8.2 7.4 0 0 1 16.4 0z" fill="#8A5A36"/><path d="M7.2 9.4l2.2 3.4M11 7.6l2.2 5.2M15 8.4l1.8 4.4" stroke-width="1.2"/><path d="M12 5.4V3" stroke-width="2.2"/>',
  'hat-bee':'<path d="M4 19.6a8 8 0 0 1 16 0" stroke-width="2.6"/><path d="M8.8 12.4L6.6 5.6M15.2 12.4l2.2-6.8"/><circle cx="6.4" cy="5" r="2.1" fill="#F5C14E"/><circle cx="17.6" cy="5" r="2.1" fill="#F5C14E"/>',
  'hat-party':'<path d="M12 2.8l6.2 16.4H5.8z" fill="#9FD2F2"/><path d="M8.4 12.4l6.6-2.2M7 16.4l9.8-3.4" stroke="#FFF1A8" stroke-width="1.8"/><path d="M12 2.8l6.2 16.4H5.8z"/><circle cx="12" cy="3.4" r="2" fill="#F7A8C4"/>',
  'hat-brolly':'<path d="M2.8 12a9.2 8 0 0 1 18.4 0c-1.5-1.1-3-1.1-4.6 0-1.5-1.1-3-1.1-4.6 0-1.5-1.1-3-1.1-4.6 0-1.5-1.1-3-1.1-4.6 0z" fill="#9FD2F2"/><path d="M12 12v6.6a2 2 0 0 1-4 0"/><path d="M12 4v-1"/>',
  'hat-beret':'<ellipse cx="12" cy="13.4" rx="9" ry="5.2" fill="#B79CF2"/><path d="M5 15.6c2 1.4 4.4 2 7 2s5-.6 7-2"/><circle cx="12" cy="7.2" r="1.4" fill="#B79CF2"/><path d="M16.6 12.6a1.4 1.4 0 0 0 2.8 0c0-.9-1.4-2.6-1.4-2.6s-1.4 1.7-1.4 2.6z" fill="#EAF8FF" stroke-width="1.2"/>',
  'hat-bow':'<path d="M11.2 13l-2.4 6.2 2.3-.8 1 1.9zM12.8 13l2.4 6.2-2.3-.8-1 1.9z" fill="#E36A8C" stroke-width="1.2"/><path d="M12 12L4.6 7.4v9.2zM12 12l7.4-4.6v9.2z" fill="#E36A8C"/><circle cx="12" cy="12" r="2.3" fill="#C24E72"/>',
  'hat-gold':'<path d="M4.2 17.2L3.2 8l5 4 3.8-6.2L15.8 12l5-4-1 9.2z" fill="#F5C14E"/><path d="M4.2 17.2h15.6v2.6H4.2z" fill="#F5C14E"/><circle cx="12" cy="18.5" r="1.1" fill="#F7A8C4"/><circle cx="7.6" cy="18.5" r="1" fill="#9FD2F2"/><circle cx="16.4" cy="18.5" r="1" fill="#9FD2F2"/>',
  'hat-beanie':'<path d="M5 15.4a7 7 0 0 1 14 0z" fill="#8FD0B0"/><rect x="4" y="14.6" width="16" height="4.4" rx="1.8" fill="#6FB894"/><path d="M8 15.4v2.8M12 15.4v2.8M16 15.4v2.8" stroke-width="1.2"/><circle cx="12" cy="6.4" r="2.4" fill="#FFF8EA"/>',
  'hat-sunflower':'<g fill="#6CC97A" stroke-width="1.2"><ellipse cx="4" cy="4.6" rx="3.4" ry="1.6" transform="rotate(40 4 4.6)"/><ellipse cx="20" cy="4.6" rx="3.4" ry="1.6" transform="rotate(-40 20 4.6)"/></g><g fill="#FFD34D"><ellipse cx="12" cy="5.6" rx="2" ry="3"/><ellipse cx="12" cy="18.4" rx="2" ry="3"/><ellipse cx="5.6" cy="12" rx="3" ry="2"/><ellipse cx="18.4" cy="12" rx="3" ry="2"/><ellipse cx="7.5" cy="7.5" rx="2" ry="3" transform="rotate(-45 7.5 7.5)"/><ellipse cx="16.5" cy="16.5" rx="2" ry="3" transform="rotate(-45 16.5 16.5)"/><ellipse cx="16.5" cy="7.5" rx="2" ry="3" transform="rotate(45 16.5 7.5)"/><ellipse cx="7.5" cy="16.5" rx="2" ry="3" transform="rotate(45 7.5 16.5)"/></g><circle cx="12" cy="12" r="3.6" fill="#7A4E2E"/>',
  'hat-shell':'<path d="M3.6 19.6h16.8" stroke-width="2.4"/><ellipse cx="12" cy="11.6" rx="8" ry="7.4" fill="#C9A0E6"/><path d="M12.6 12.4a1 1 0 1 1 .5-1.7 2.4 2.4 0 1 1-3.3 2.8 3.8 3.8 0 1 1 6.2-3.8" stroke-width="1.3"/>',
  'hat-pumpkin':'<path d="M12 7.4c.2-1.6.8-3 2-3.8"/><path d="M13.4 6c1.4-1.8 4-2 5.2-.8-1.2 1.6-3.4 2-5.2.8z" fill="#6CC97A" stroke-width="1.2"/><ellipse cx="12" cy="14" rx="9" ry="6.4" fill="#F7A05A"/><path d="M12 7.6c-2.4 2-2.4 10.8 0 12.8M12 7.6c2.4 2 2.4 10.8 0 12.8M7.4 8.6c-2.4 2.6-2.4 8.2 0 10.8M16.6 8.6c2.4 2.6 2.4 8.2 0 10.8" stroke-width="1.2"/>',
  'extra-butterfly':'<path d="M12 7.5v10"/><path d="M12 10C9.6 5.4 4 4.6 4 8.6c0 2.6 3 3.6 8 3.4zM12 10c2.4-4.6 8-5.4 8-1.4 0 2.6-3 3.6-8 3.4z" fill="#F7A8C4"/><path d="M12 12.2c-3.4.2-6 1.8-5 4.2 1 2.2 4 1.4 5-2.6zM12 12.2c3.4.2 6 1.8 5 4.2-1 2.2-4 1.4-5-2.6z" fill="#F5C14E"/><path d="M12 7.5l-1.6-2.6M12 7.5l1.6-2.6"/>',
  'hat-bonnet':'<g fill="#F7A8C4"><ellipse cx="5.6" cy="15" rx="3.4" ry="2.4" transform="rotate(-30 5.6 15)"/><ellipse cx="18.4" cy="15" rx="3.4" ry="2.4" transform="rotate(30 18.4 15)"/><ellipse cx="9" cy="17.4" rx="3.4" ry="2.4"/><ellipse cx="15" cy="17.4" rx="3.4" ry="2.4"/></g><g fill="#E36A8C"><ellipse cx="8.6" cy="11" rx="3" ry="2.2" transform="rotate(-40 8.6 11)"/><ellipse cx="15.4" cy="11" rx="3" ry="2.2" transform="rotate(40 15.4 11)"/><ellipse cx="12" cy="13.4" rx="3" ry="2.2"/></g><circle cx="12" cy="7.6" r="2.6" fill="#FFE9A6"/>',
  'hat-miner':'<path d="M2.6 17.6h18.8" stroke-width="2.4"/><path d="M4.6 17.2a7.4 7.6 0 0 1 14.8 0z" fill="#F5A33A"/><path d="M12 9.6v7.6" stroke-width="1.2"/><rect x="9.6" y="10.6" width="4.8" height="3.8" rx="1.4" fill="#B98A62"/><circle cx="12" cy="12.5" r="1.3" fill="#FFF6C8" stroke-width="1"/>',
  'hat-explorer':'<path d="M2.4 17.4c3.6 2 15.6 2 19.2 0-3.4-1.4-15.8-1.4-19.2 0z" fill="#DCC28C"/><path d="M5.2 16.4C5.2 9.8 8 6 12 6s6.8 3.8 6.8 10.4z" fill="#DCC28C"/><path d="M5.4 14.4h13.2" stroke="#8A5A36" stroke-width="2.2"/><path d="M5.6 12.6C4 10.2 3.8 7.6 4.8 5.6c1.4 1.8 1.8 4.4.8 7z" fill="#6CC97A" stroke-width="1.2"/>',
  'hat-sprout':'<path d="M12 21v-9"/><path d="M12 13.4c-.6-4.4-3.8-6.6-8.2-6.4.2 4.6 3.4 6.8 8.2 6.4z" fill="#6CC97A"/><path d="M12 11.4c.6-4 3.6-6.2 8-6 0 4.2-3.2 6.4-8 6z" fill="#8CC673"/><path d="M6 20.8h12" stroke-width="2.2"/>',
  'hat-teacup':'<ellipse cx="12" cy="19" rx="9" ry="2.2" fill="#FFFBF2"/><path d="M5.4 9.8h12.2l-1.4 7.4c-.2 1-1.2 1.6-2.2 1.6H9c-1 0-2-.6-2.2-1.6z" fill="#9FD2F2"/><path d="M17.6 11.4c2.4-.4 3.6 1 3 2.6-.6 1.4-2.2 1.6-3.8 1.2" fill="none"/><g fill="#FFFBF2" stroke="none"><circle cx="9.4" cy="13.4" r="1"/><circle cx="13.6" cy="13.4" r="1"/></g><path d="M11.4 7.8c-1-1.4.6-2.4-.2-4" stroke-width="1.2"/>',
  'hat-nest':'<path d="M3 13.4c1 4.6 4.8 6.6 9 6.6s8-2 9-6.6z" fill="#9A6B45"/><ellipse cx="9.4" cy="11.8" rx="2.8" ry="3.4" fill="#BFE6F7"/><ellipse cx="14.8" cy="12.2" rx="2.6" ry="3.2" fill="#BFE6F7"/><path d="M5 15.6l3 1.4M10 17.2l4-.6M16 16.6l3-1.6" stroke-width="1.2"/><g fill="#7FA8C2" stroke="none"><circle cx="8.6" cy="10.8" r=".7"/><circle cx="15.4" cy="11.4" r=".7"/></g>',
  'hat-cloud':'<path d="M6.4 14.6a3.4 3.4 0 0 1 .6-6.6 4.6 4.6 0 0 1 8.8-.6 3.4 3.4 0 0 1 2.4 6.6z" fill="#FFFFFF"/><path d="M9.4 11.6q.8-.9 1.6 0M13 11.6q.8-.9 1.6 0" stroke-width="1.1"/><g fill="#9ED6EF"><path d="M8.4 17.4c-.8 1.4-.8 2.4 0 2.4s.8-1 0-2.4z"/><path d="M12.4 18c-.8 1.4-.8 2.4 0 2.4s.8-1 0-2.4z"/><path d="M16.2 17.2c-.8 1.4-.8 2.4 0 2.4s.8-1 0-2.4z"/></g>',
  'extra-eyepatch':'<path d="M2.6 6.4c5 2.4 13.6 3.8 18.8 3.6" stroke-width="1.4"/><ellipse cx="15.6" cy="13" rx="4.6" ry="4" fill="#3B2A22"/><circle cx="7.2" cy="13" r="3.4" fill="#FFFFFF"/><circle cx="7.6" cy="13.2" r="1.6" fill="#3B2A22" stroke="none"/>',
  'extra-ladybug':'<path d="M12 6.4a7.4 7.4 0 0 1 7.4 7.4c0 4-3.2 6.8-7.4 6.8s-7.4-2.8-7.4-6.8A7.4 7.4 0 0 1 12 6.4z" fill="#E4574C"/><path d="M8.2 7.6a4 3.2 0 0 1 7.6 0z" fill="#3B2A22"/><path d="M12 7.6v12.8"/><g fill="#3B2A22" stroke="none"><circle cx="8.6" cy="12" r="1.3"/><circle cx="15.4" cy="12" r="1.3"/><circle cx="8.8" cy="16.4" r="1.2"/><circle cx="15.2" cy="16.4" r="1.2"/></g><path d="M10 5.4L8.6 3.4M14 5.4l1.4-2"/>',
  'extra-sweatband':'<path d="M3 9.4c4.8-2 13.2-2 18 0v5.2c-4.8-2-13.2-2-18 0z" fill="#FFFBF2"/><path d="M3 11.6c4.8-2 13.2-2 18 0v1.2c-4.8-2-13.2-2-18 0z" fill="#F27DA2" stroke-width="1"/>',
  'extra-daisies':'<path d="M2.6 8.6c4.4 5.4 14.4 5.4 18.8 0" stroke="#6CC97A" stroke-width="1.6"/><g fill="#FFFBF2"><circle cx="6.2" cy="12.6" r="2.4"/><circle cx="12" cy="14.8" r="2.6"/><circle cx="17.8" cy="12.6" r="2.4"/></g><g fill="#F5C14E" stroke="none"><circle cx="6.2" cy="12.6" r="1"/><circle cx="12" cy="14.8" r="1.1"/><circle cx="17.8" cy="12.6" r="1"/></g>',
  'hat-gnome':'<path d="M6 18.4L11.4 3.6c2.8.4 5.6 2.6 6.2 5.6l.6 9.2z" fill="#E4574C"/><circle cx="18.2" cy="9.6" r="1.8" fill="#FFFBF2"/><rect x="4.2" y="16.6" width="15.6" height="4" rx="2" fill="#FFFBF2"/>',
  'extra-bandana':'<path d="M3.6 8.4c4.6 2.6 12.2 2.6 16.8 0" stroke-width="2.8" stroke="#5B4436"/><path d="M3.6 8.4c4.6 2.6 12.2 2.6 16.8 0" stroke-width="1.4" stroke="#E4574C"/><path d="M5.4 10.2h13.2c-1.6 4.4-4 8-6.6 10.4-2.6-2.4-5-6-6.6-10.4z" fill="#E4574C"/><g fill="#FFF1DE" stroke="none"><circle cx="9.4" cy="12.6" r="1"/><circle cx="14.6" cy="12.6" r="1"/><circle cx="12" cy="16.4" r="1"/></g>',
  'extra-goggles':'<path d="M2 12.8h20" stroke="#A9703F" stroke-width="2.4"/><circle cx="7.4" cy="12.8" r="4.3" fill="#BFE6F7" stroke-width="2.4"/><circle cx="16.6" cy="12.8" r="4.3" fill="#BFE6F7" stroke-width="2.4"/><path d="M5.6 11.2l1.2-1" stroke="#fff" stroke-width="1"/>',
  'hat-horn':'<path d="M4 20a8 8 0 0 1 16 0" stroke-width="2.6"/><path d="M8.2 14.2c-.2-4.8 2.4-8.8 8-11.2-1 3.8-1 7.4 0 11.2z" fill="#7C8CF0"/><circle cx="12.2" cy="10" r=".85" fill="#B5C0FA" stroke="none"/><circle cx="13.6" cy="7" r=".7" fill="#B5C0FA" stroke="none"/>'
};
// pollen flowers and petal gates come in three colours (and a pale flower for no pollen yet), drawn from POLL
{ const hx=n=>'#'+n.toString(16).padStart(6,'0');
  const flower=(c,l,d)=>`<g fill="${c}">${[0,60,120,180,240,300].map(a=>`<ellipse cx="12" cy="6.3" rx="3.3" ry="4.5" transform="rotate(${a} 12 12)"/>`).join('')}</g><circle cx="12" cy="12" r="3.8" fill="${l}"/><g fill="${d}" stroke="none"><circle cx="10.9" cy="11" r=".85"/><circle cx="13.3" cy="12.1" r=".85"/><circle cx="11.6" cy="13.6" r=".85"/></g>`;
  const bud=c=>`<path d="M4.5 20.6h15" stroke-width="2.2"/><path d="M12 20c-4.6 0-6.6-3.6-6.6-8 0-4 2.4-7.4 6.6-9.4 4.2 2 6.6 5.4 6.6 9.4 0 4.4-2 8-6.6 8z" fill="${c}"/><path d="M12 20c-2-1.6-2.8-4.4-2.8-8 0-3 1-5.6 2.8-7.6M12 20c2-1.6 2.8-4.4 2.8-8 0-3-1-5.6-2.8-7.6" stroke-width="1.2"/><path d="M6.4 19.4c-1.6-.4-2.9-1.5-3.4-3.1 1.7-.4 3.3.2 4.4 1.4M17.6 19.4c1.6-.4 2.9-1.5 3.4-3.1-1.7-.4-3.3.2-4.4 1.4" fill="#6CC97A" stroke-width="1.2"/>`;
  for(const k in POLL){ const P=POLL[k]; ART['pollen'+k]=flower(hx(P.col),hx(P.light),hx(P.dark)); ART['petals'+k]=bud(hx(P.col)); }
  ART.pollen0=flower('#EFE6DA','#FFF8EA','#C9BBA8');
  // soft soil: a tilled heap with the worm arching out of it and diving back in
  ART.soil='<path d="M5.6 16.4c-.6-5.6 1.8-9.6 6-9.6" stroke-width="4.6"/><path d="M5.6 16.4c-.6-5.6 1.8-9.6 6-9.6" stroke="#FFB3C8" stroke-width="2.4"/><circle cx="14.2" cy="7.6" r="3" fill="#FFB3C8"/><circle cx="15.1" cy="7" r=".75" fill="#5B4436" stroke="none"/><path d="M1.8 21c.9-4.6 4.9-7.6 10.2-7.6S21.3 16.4 22.2 21z" fill="#B07850"/><g fill="#8A5A3A" stroke="none"><circle cx="8" cy="18" r="1"/><circle cx="13.4" cy="16.4" r="1"/><circle cx="17.4" cy="18.8" r="1"/></g>'; }
const art=(n,size=24)=>`<svg class="art" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="${Math.max(1.3,Math.min(2.6,1.9*24/size)).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ART[n]||''}</svg>`;
// small stickers for the HUD tiles, toasts and pills
const ICON={star:art('star',18),flag:art('flag',18),key:art('key',18),worm:art('worm',20),steps:art('steps',18),burrow:art('burrow',18),leaf:art('leaf',18)};
// control icons: one line weight, drawn in the text colour
const UI_ICON={
  chev:'<svg class="ui-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
  check:'<svg class="ui-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2 8.8-9.2"/></svg>'};
const sticker=svg=>`<span class="ic" aria-hidden="true">${svg}</span>`;
// ---------- HUD ----------
function hudSub(){ if(mode==='garden'){ const ch=CHAPTERS.find(c=>li>=c.from&&li<=c.to); return ch?`${ch.name} · ${li-ch.from+1} of ${ch.to-ch.from+1}`:''; }
  if(L.daily) return 'Daily patch'; const k=progress.endless[endlessDiff].streak; return 'Endless · '+DIFF_NAME[endlessDiff]+(k?` · streak ${k}`:''); }
function statTip(k){ const par=curPar(), len=state.segs.length, fruit=/[+-]/.test(state.grid.map(r=>r.join('')).join(''));
  if(k==='moves') return `Par is ${par}. Finish in ${par} moves for 3 stars, or within ${Math.ceil(par*1.3)} for 2.`;
  if(k==='flags') return 'Touch every flag before the burrow will let you in.';
  if(k==='keys') return 'Each key opens one gate, then it is used up.';
  if(len===state.exitLen) return 'You are just the right length for the burrow.';
  return `The burrow fits a worm of ${state.exitLen}. You are ${len}.`+(fruit?(len<state.exitLen?' A peach makes you longer.':' A mushroom makes you shorter.'):''); }
document.querySelector('.hud-stats').addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.closest('.stat')){ e.preventDefault(); e.target.click(); } });
document.querySelector('.hud-stats').addEventListener('click',e=>{ const st=e.target.closest('.stat'); if(!st||!state) return; toast(statTip(st.dataset.tip||'moves'),3400); });
// one HUD tile: tip picks its statTip, v is the value row and k the caption under it; tappable unless tap is false
const hudTile=(tip,cls,label,v,k,tap=true)=>`<span${tap?' role="button" tabindex="0"':''} class="stat${cls?' '+cls:''}" data-tip="${tip}" aria-label="${label}"><span class="v">${v}</span><span class="k">${k}</span></span>`;
let shownStars=3;
function updateHUD(silent){
  $('lvlNum').style.fontSize=String(mode==='garden'?li+1:0).length>2?'16px':''; $('lvlNum').textContent= mode==='garden' ? li+1 : L.daily ? new Date().getDate() : (progress.endless[endlessDiff].cleared+1); $('lvlName').textContent=L.name;
  $('lvlSub').textContent=hudSub(); document.body.dataset.mode=mode;
  const tabTitle=(mode==='garden'?`${li+1} · `:'')+L.name+' · Squirm'; if(document.title!==tabTitle&&!$('homeOv').classList.contains('show')) document.title=tabTitle;
  const now=starsFor(state.moves,curPar(),hintsUsed>0), meter=[0,1,2].map(j=>`<i class="${j<now?'on':''}"></i>`).join('');
  const mv=$('moves'), mvHtml=`<span class="v">${sticker(ICON.steps)}<b>${state.moves}</b></span><span class="k mv"><em class="mini" aria-hidden="true">${meter}</em><span class="par">par ${curPar()}</span></span>`;
  if(mv.innerHTML!==mvHtml){ mv.innerHTML=mvHtml; if(!silent){ if(now<shownStars) animOnce(mv,'lost'); else pulse(mv); } }
  shownStars=now;
  mv.setAttribute('aria-label',`${state.moves} ${state.moves===1?'move':'moves'}, par ${curPar()}, on track for ${now} ${now===1?'star':'stars'}`); mv.classList.toggle('over',state.moves>curPar());
  const chips=[], map=L.map.join(''), flagsTotal=map.split('C').length-1;
  if(flagsTotal){ const left=countChar(state,'C');
    chips.push(hudTile('flags',left===0&&'done',`Flags ${flagsTotal-left} of ${flagsTotal}`,`${sticker(ICON.flag)}<b>${flagsTotal-left}</b><small>/${flagsTotal}</small>`,left?'Flags':'All flags')); }
  if(map.includes('K')) chips.push(hudTile('keys','',`${state.keys} ${state.keys===1?'key':'keys'}`,`${sticker(ICON.key)}<b>${state.keys}</b>`,state.keys===1?'Key':'Keys',false));
  const ok=state.segs.length===state.exitLen;
  chips.push(hudTile('length',ok&&'done',`Length ${state.segs.length}, burrow fits ${state.exitLen}`,
    `${sticker(ICON.worm)}<b>${state.segs.length}</b><span class="to" aria-hidden="true">${ok?'=':'&rarr;'}</span><b>${state.exitLen}</b>`,ok?'Fits!':'Length'));
  const html=chips.join(''); if($('chips').innerHTML!==html){ const prev=[...$('chips').children], old=prev.map(c=>c.textContent), wasDone=prev.map(c=>c.classList.contains('done')); $('chips').innerHTML=html;
    if(!silent) [...$('chips').children].forEach((c,i)=>{ if(c.classList.contains('done')&&!wasDone[i]) animOnce(c,'cheer'); else if(old[i]!==c.textContent) pulse(c); }); }
  for(const [id,off] of [['undoBtn',!history.length&&state.moves===0]]){ const b=$(id); if(b.disabled&&!off&&!silent) animOnce(b,'pop'); b.disabled=off; }
  const ready = countChar(state,'C')===0 && ok;
  if(ready && !wasReady && !silent && state.status==='play'){ sfx('ready'); glanceT=1.4; }
  wasReady=ready;
  for(const row of cells) for(const c of row) if(c.item&&c.item.userData.rim){ c.item.userData.rim.material = ready? m('ready') : toon(C.mound); c.item.userData.ready=ready; if(c.item.userData.signBoard) c.item.userData.signBoard.material = ready? m('ready') : m('plank'); }
}
// ---------- toasts and dialogs ----------
let toastTimer=0;
$('toast').addEventListener('click',()=>$('toast').classList.remove('show'));
function toast(msg,ms=2600){ const t=$('toast'), bar=document.body.classList.contains('at-home')?document.querySelector('.tabbar'):document.querySelector('#app nav');
  if(bar){ const top=bar.getBoundingClientRect().top; if(top>0) t.style.setProperty('--toast-y',Math.max(16,window.innerHeight-top+12)+'px'); } t.innerHTML=sticker(ICON.leaf)+'<span class="msg"></span>'; t.querySelector('.msg').textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),ms); }
function show(id){ const o=$(id); clearTimeout(o._out); o.classList.remove('out'); o.classList.add('show'); if(id==='homeOv'){ document.body.classList.add('at-home'); return; } const b=$(id).querySelector('.primary')||$(id).querySelector('button'); b&&b.focus({preventScroll:true}); }
function hide(id){ const o=$(id); if(id==='homeOv'){ o.classList.remove('show'); document.body.classList.remove('at-home'); return; }
  if(!o.classList.contains('show')||o.classList.contains('out')) return;
  const ms=reduceMotion?0:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-fast'))*1000||0;
  if(!ms){ o.classList.remove('show'); return; } o.classList.add('out'); o._out=setTimeout(()=>o.classList.remove('show','out'),ms); }
// open and not on its way out
const isOpen=id=>{ const c=$(id).classList; return c.contains('show')&&!c.contains('out'); };
function hideAll(){ ['winOv','homeOv','setOv','finOv'].forEach(hide); }
function anyOverlay(){ return ['winOv','homeOv','genOv','introOv','resetOv','setOv','finOv'].some(isOpen); }
function renderMute(){ if($('homeSound')){ const hb=$('homeSound'); hb.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off'); setTimeout(()=>{ hb.innerHTML=$('muteBtn').innerHTML; },0); } const b=$('muteBtn'); b.setAttribute('aria-pressed',String(muted)); b.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');
  b.innerHTML = muted
   ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
   : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>'; }

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
const todayKey=()=>dateKey(new Date());
const GAME_URL=/^https?:$/.test(location.protocol)?location.origin+location.pathname.replace(/index\.html$/,''):'';
const DAILY_OPTS={flags:true,fruit:true,keys:true,dry:true,portals:true};
progress.daily=Object.assign({streak:0,best:0,last:null,results:{}},progress.daily||{});
async function startDaily(){ if(generating) return; generating=true; hideAll(); show('genOv'); $('genText').textContent="Growing today's patch...";
  const k=todayKey(); let seed=0; for(const ch of 'daily'+k) seed=(seed*31+ch.charCodeAt(0))|0;
  let def=store.json('squirm-daily-patch'); if(!def||def.daily!==k) def=null;
  if(!def){ def=await generateEndless('medium',{...DAILY_OPTS},seed,30); def.daily=k; store.set('squirm-daily-patch',JSON.stringify(def)); } def.name="Today's patch"; def.hint='The same patch for every gardener today.';
  hide('genOv'); generating=false; mode='endless'; startLevel(def,true); enterGame(); }
let generating=false, prefetch=null;
const optsKey=()=>endlessDiff+JSON.stringify(endlessOpts);
function startPrefetch(){ const k=optsKey(); const seed=(Math.random()*2**31)|0; prefetch={k,p:generateEndless(endlessDiff,{...endlessOpts},seed)}; }
async function newEndless(){ if(generating) return; generating=true; hideAll(); clearResume();
  store.set('squirm-endless-opts',JSON.stringify({opts:endlessOpts,diff:endlessDiff}));
  let def; if(prefetch&&prefetch.k===optsKey()){ const p=prefetch.p; prefetch=null; show('genOv'); def=await p; }
  else { prefetch=null; show('genOv'); $('genText').textContent=endlessDiff==='hard'?'Hard patches take a moment to grow...':'Planting seeds...'; def=await generateEndless(endlessDiff,{...endlessOpts},(Math.random()*2**31)|0); }
  hide('genOv'); generating=false;
  mode='endless'; startLevel(def,true); saveResume(); enterGame(); }
function continueEndless(){ const r=readResume('endless'); if(r&&r.def&&r.diff&&!r.def.daily){ endlessDiff=r.diff; mode='endless'; hideAll(); startLevel(r.def,false); enterGame(); return true; } return false; }

// ---------- native back button: a small stack of layers mirrored in browser history ----------
const layers=[]; let ignorePop=0;
function pushLayer(n){ layers.push(n); try{ window.history.pushState({squirm:layers.length},''); }catch(e){} }
// replace the layers from `from` upward with one new layer, without racing the async history.go
function swapLayers(from,n){ const i=layers.lastIndexOf(from); if(i<0){ pushLayer(n); return; } const k=layers.length-i; layers.length=i; layers.push(n);
  if(k>1){ ignorePop++; try{ window.history.go(-(k-1)); }catch(e){ ignorePop--; } } }
function popLayer(n){ const i=layers.lastIndexOf(n); if(i<0) return; const k=layers.length-i; layers.length=i; ignorePop++; try{ window.history.go(-k); }catch(e){ ignorePop--; } }
function enterGame(){ const top=layers[layers.length-1];
  if(top==='game') return;
  if(layers.includes('game')){ popLayer(layers[layers.indexOf('game')+1]); return; }
  if(top==='tab'){ layers[layers.length-1]='game'; try{ window.history.replaceState({squirm:layers.length},''); }catch(e){} return; }
  pushLayer('game'); }
window.addEventListener('popstate',()=>{ if(ignorePop>0){ ignorePop--; return; } const top=layers.pop();
  if(top==='intro') closeIntro(true);
  else if(top==='reset') hide('resetOv');
  else if(top==='finale') hide('finOv');
  else if(top==='settings') hide('setOv');
  else if(top==='tab') showTab('play',true);
  else if(top==='photo') exitPhoto();
  else if(top==='win'){ hide('winOv'); if(layers.includes('game')) popLayer('game'); showHome(); }
  else if(top==='game'){ hideAll(); showHome(); } });

// ---------- what's new ----------
// newest first: [version, date, title, lines]. The top version must equal package.json's (a unit test checks).
// Bump the version for every release players will notice (semver: minor for new things, patch for fixes) and
// add an entry on top. Returning players see the newest entry once as a card on the Play tab, new players never
// do (squirm-news holds the last version seen); Settings > About lists them all.
const NEWS=[
  ['1.12.1','2026-10-31','A tidier wardrobe',['The bird\'s nest is properly woven now, and its eggs sit snug inside.','The sweatband hugs the head all the way round, the pirate patch covers its eye, and the daisy chain shows under the chin.','The ladybug friend is a little bigger.']],
  ['1.12.0','2026-10-31','Pick a colour',['Many hats and extras now come in five colours: wear one and pick its colour in the wardrobe.','Four new hats: a little sprout, a teacup, a bird\'s nest and a little rain cloud.','Four new extras: a pirate patch, a ladybug friend, a sweatband and a daisy chain.','Each one unlocks in its own playful way. Take a peek in the wardrobe!']],
  ['1.11.0','2026-10-31','Far fields',['A new chapter, Far fields: ten big, wide patches, and the toughest one yet at the end.','An explorer\'s hat, a spotted bandana, a Sage colour and a new badge to earn.','A tidier top bar: just what you need to finish the patch.','A smarter fancy mustache, and the worm looks right when it pops out of a tunnel and straight back in.']],
  ['1.10.0','2026-10-31','Pollen and soft soil',['Two new things in the garden: flowers dust you in pollen that opens petal gates of the same colour, and soft soil lets you burrow under yourself.','Three new chapters: Pollen paths, Soft soil and Tangled roots.','New hats (a petal bonnet, a miner\'s helmet and a gnome hat), digging goggles, a Sprout colour and three new badges.','Pick pollen and soft soil for your meadow patches too.']],
  ['1.9.0','2026-10-28','Two new chapters',['Chapters 17 and 18, Critter crossing and Harvest moon: 20 of the toughest patches yet.','Two new hats to earn: a snail shell and a pumpkin.','A Moonlight worm colour, a butterfly friend for growing the whole garden, and two new badges.']],
  ['1.8.0','2026-10-28','Handier buttons',['Snap a photo of your garden any time, from the new Photo button.','Hold Undo to start a patch over.','The win card has a Home button now.']],
  ['1.7.0','2026-10-27','Wardrobe polish',['Five more extras: freckles, a button nose, a flower clip, a bow tie and a cozy scarf.','Hats, extras, colours and patterns all got a careful polish.','Your worm chats a little less while you play.']],
  ['1.6.0','2026-10-26','A chattier worm',['A brighter win card that shows everything you earned.','Your worm says a word or two while you play, and gives hints itself.','New things in a patch get their own illustrated card.']],
  ['1.5.0','2026-10-25','New in the garden',['Worm patterns, new hats and colours, plus glasses, shades and mustaches to wear.','A new badges book, with your progress on every badge, and 16 new badges.','Snap a photo of your garden after you finish a patch, from any angle you like.','Fresh looks for the home screen, garden map, meadow, wardrobe and settings, with a battery saver option.']],
  ['1.4.0','2026-10-24','Beetle bumps',['Chapter 16: push beetles around, even onto flower buttons.','A new hat to earn: the beetle horn.']],
  ['1.3.0','2026-10-24','A bigger garden',['Two new chapters, Garden party and Grand bloom.','A finale for when the whole garden is grown.']],
  ['1.2.0','2026-10-21','The garden map',['Patches are stepping stones on a winding garden map.','A ladybug and a little bird visit the garden.','Your worm stretches, wiggles and watches butterflies while you think.']],
  ['1.1.0','2026-10-20','Badges and music',['Badges to earn and hats to wear.','Gentle music that follows the time of day.','A daily patch reminder, where your phone allows it.']]];
const newsDate=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
function renderNews(){ const seen=store.get('squirm-news'), n=NEWS[0], returning=LEVELS.some((l,i)=>isCleared(i))||Object.keys(progress.daily.results).length>0;
  if(!returning&&seen!==n[0]){ store.set('squirm-news',n[0]); }
  const show=returning&&seen!==n[0]; $('newsCard').hidden=!show;
  if(show){ $('newsTitle').textContent=n[2]; $('newsList').innerHTML=n[3].map(x=>`<li>${x}</li>`).join(''); }
  $('newsLog').innerHTML=NEWS.map(e=>`<div><b>${e[2]} <small>v${e[0]} · ${newsDate(e[1])}</small></b><ul>${e[3].map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join(''); }
$('newsClose').onclick=()=>{ store.set('squirm-news',NEWS[0][0]); $('newsCard').hidden=true; };

// ---------- home ----------
function showHome(quiet){ if(updateReady){ location.reload(); return; } document.title='Squirm'; const was=curTab; showTab('play',true); renderHome(); show('homeOv');
  if(quiet) return; if(was==='play') tabIntro('play'); stagger(document.querySelectorAll('.home-top .star-pill,.home-top .round:not([hidden])'),'enter',0,50); stagger(document.querySelectorAll('.tabbar .tab'),'rise',150,40); }
// ---------- home tabs: Play, Garden (patch list), Meadow (endless), Me (wardrobe), Badges ----------
let curTab='play';
const TAB_RENDER={garden:()=>renderLevelList(),meadow:()=>renderEndless(),me:()=>renderWardrobe(),badges:()=>renderBadges()};
function showTab(name,fromBack){ const prev=curTab; curTab=name;
  for(const t of ['play','garden','meadow','me','badges']){ const pg=$('tab'+t[0].toUpperCase()+t.slice(1)); pg.hidden=t!==name; }
  document.querySelectorAll('.tabbar .tab').forEach(b=>{ const on=b.dataset.tab===name; b.classList.toggle('on',on); b.setAttribute('aria-current',on?'page':'false'); });
  const pg=$('tab'+name[0].toUpperCase()+name.slice(1)); pg.scrollTop=0;
  // one worm, two homes: it sits on the Play tab and above the wardrobe on the Me tab
  const slot=name==='me'?$('slotMe'):$('slotPlay'); if(homeCanvas.parentNode!==slot) slot.appendChild(homeCanvas); homeStage(name==='me');
  if(TAB_RENDER[name]) TAB_RENDER[name]();
  if(prev!==name){ tabIntro(name); const tb=document.querySelector(`.tabbar .tab[data-tab="${name}"]`); if(tb) animOnce(tb,'pop'); }
  // the back button returns to Play from the other tabs
  if(fromBack) return;
  if(name==='play'){ if(layers[layers.length-1]==='tab') popLayer('tab'); }
  else if(layers[layers.length-1]!=='tab') pushLayer('tab'); }
document.querySelectorAll('.tabbar .tab').forEach(b=>b.onclick=()=>{ ensureAudio(); if(b.dataset.tab!==curTab) showTab(b.dataset.tab); });
function renderHome(){
  $('homeStars').innerHTML=`${ICON.star}<span>${starTotal()}</span>`;
  const k=todayKey(), dr=progress.daily.results[k]; $('dailyDay').textContent=new Date().getDate();
  const mid=new Date(); mid.setHours(24,0,0,0); const left=Math.max(1,Math.ceil((mid-new Date())/60000)), wait=left>=60?`${Math.floor(left/60)}h ${left%60}m`:`${left}m`;
  $('dailyBtn').classList.toggle('done',!!dr); $('dailySub').textContent = dr ? `Done in ${dr.moves} moves. Next one in ${wait}.` : (progress.daily.streak?`Keep your ${progress.daily.streak} day streak going`:'One patch for everyone today');
  $('dailyWeek').innerHTML=[6,5,4,3,2,1,0].map(n=>{ const d=new Date(); d.setDate(d.getDate()-n); return `<i class="${progress.daily.results[dateKey(d)]?'on':''} ${n?'':'today'}"></i>`; }).join('');
  const ni=nextGardenIndex(), started=LEVELS.some((l,i)=>isCleared(i));
  if(allCleared()){ const t=shineable().length; $('playTitle').textContent='Garden grown!'; $('playSub').textContent=t?`${t} ${t===1?'patch':'patches'} to shine up · what's next`:"All 3 stars · see what's next"; }
  else { $('playTitle').textContent=started?'Continue':'Play'; $('playSub').textContent=`Patch ${ni+1} · ${LEVELS[ni].name}`; }
  // Continue: how far along its chapter the next patch is
  const pc=CHAPTERS.find(c=>ni>=c.from&&ni<=c.to); $('playPips').innerHTML=pc&&!allCleared()?[...Array(pc.to-pc.from+1).keys()].map(j=>{ const i=pc.from+j; return `<i class="${isCleared(i)?'on':i===ni?'cur':''}"></i>`; }).join(''):'';
  // Meadow: the saved difficulty and its streak; one tap grows (or resumes) a patch
  const em=progress.endless[endlessDiff], er=readResume('endless'), canResume=er&&er.def&&!er.def.daily;
  $('meadowSub').textContent=canResume?'Pick up where you left off':`${DIFF_NAME[endlessDiff]}${em.streak?` · streak ${em.streak}`:em.cleared?` · ${em.cleared} cleared`:''}`;
  renderGoal(); sayHello();
  renderMute(); renderHaptic(); renderNews();
  // what the page shows before the game has loaded next time (see the boot script in shell.html)
  store.set('squirm-boot',JSON.stringify({stars:$('homeStars').innerHTML,title:$('playTitle').textContent,sub:$('playSub').textContent,daily:$('dailySub').textContent,done:!!dr,day:new Date().toDateString()}));
}
// a little sticker worm in the current colour wearing a pattern, for the wardrobe. Sunset and rainbow take their
// colours from colorAt, so the sticker shows the same tint the worm gets
function patArt(id,size=40,col=wormCol){ const c=WORM_COLS[col], hex=n=>'#'+n.toString(16).padStart(6,'0'), body=hex(c[1]), path='M3.5 15.5c2.2-4.4 5.3-4.4 7.5 0s5.3 4.4 7.5 0';
  const base=new THREE.Color(c[1]), sun=[0,.25,.5].map(o=>`<stop offset="${o}" stop-color="#${colorAt(4*(1-o/.75),5,'sunset',base).getHexString()}"/>`).join(''), r0=rainbowFrom(base);
  const over={stripes:`<path d="${path}" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="butt" stroke-dasharray="1.6 2.4" stroke-dashoffset="-6"/>`,
    spots:`<g fill="#fff" fill-opacity=".6" stroke="none"><circle cx="6.4" cy="13.6" r="1.1"/><circle cx="9.6" cy="13" r="1.1"/><circle cx="13" cy="17.4" r="1.1"/><circle cx="16.6" cy="17.6" r="1.1"/></g>`,
    fade:`<path d="${path}" stroke="url(#pf${size}-${col})" stroke-width="5"/>`,
    rainbow:`<path d="${path}" stroke="url(#pr${size}-${col})" stroke-width="5"/>`,
    bands:`<path d="${path}" stroke="#5B4436" stroke-opacity=".3" stroke-width="5" stroke-linecap="butt" stroke-dasharray=".9 3.1" stroke-dashoffset="-5"/>`,
    sunset:`<path d="${path}" stroke="url(#ps${size}-${col})" stroke-width="5"/>`,
    glitter:`<g fill="#fff" stroke="none"><circle cx="5.6" cy="14.2" r=".75"/><circle cx="8.6" cy="11.9" r=".55"/><circle cx="11.2" cy="15.4" r=".7"/><circle cx="13.8" cy="18.2" r=".55"/><circle cx="16.4" cy="17" r=".75"/></g>`}[id]||'';
  return `<svg class="art" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><linearGradient id="pf${size}-${col}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="ps${size}-${col}" x1="0" x2="1">${sun}<stop offset=".75" stop-color="${body}" stop-opacity="0"/></linearGradient><linearGradient id="pr${size}-${col}" x1="0" x2="1">${[4,3,2,1,0].map((k,i)=>`<stop offset="${(i*.13).toFixed(2)}" stop-color="#${RAINBOW[(r0+k)%5].getHexString()}"/>`).join('')}<stop offset=".62" stop-color="${body}" stop-opacity="0"/></linearGradient></defs>
    <path d="${path}" stroke="#5B4436" stroke-width="7.4"/><path d="${path}" stroke="${body}" stroke-width="5"/>${over}<g stroke="none"><circle cx="20.2" cy="10.6" r="3.6" fill="#5B4436"/><circle cx="20.2" cy="10.6" r="2.5" fill="${hex(c[2])}"/><circle cx="21" cy="9.9" r=".7" fill="#5B4436"/></g></svg>`; }
// ---------- wardrobe (Me tab) ----------
// the worm on its stage shows the whole outfit; Hats / Colours / Patterns switch one grid of tiles
let wardTab='hats';
const tile=(key,val,on,ok,ico,name,note)=>`<button data-${key}="${val}" class="hat ${on?'on':''} ${ok?'':'locked'}" aria-pressed="${on}"><span class="hat-ico" aria-hidden="true">${ok?ico:art('lock',28)}</span><b>${name}</b><small>${ok?(on?'Wearing':'Tap to wear'):note}</small></button>`;
function outfitChanged(el){ bumpStat('outfits'); save(); if(hHead) homeReact('joy'); renderWardrobe(); const on=$('wardGrid').querySelector('.hat.on'); if(on) settle(on); }
function wearHat(id){ hatId=id; store.set('squirm-hat',hatId); dressHat(hHead); dressHat(segMeshes[0]); }
function wearColour(i){ wormCol=i; store.set('squirm-colour',String(i)); applyWormColour(); }
function wearPattern(id){ wormPat=id; store.set('squirm-pattern',wormPat); applyWormColour(); }
function wearExtra(id){ extraId=id; store.set('squirm-extra',extraId); dressExtra(hHead); dressExtra(segMeshes[0]); }
function renderWardrobe(){ const hats=HATS.filter(hatUnlocked), cols=coloursUnlocked(), pats=patternsUnlocked(), exs=EXTRAS.filter(e=>e[3]()), hat=HATS.find(h=>h[0]===hatId)||HATS[0], ex=EXTRAS.find(e=>e[0]===extraOn());
  $('outfitLine').textContent=[hat[0]==='none'?'No hat':hat[1],WORM_COLS[wormCol][0],PATTERNS.find(x=>x[0]===patOn())[1],...(ex[0]==='none'?[]:[ex[1]])].join(' · ');
  const n={hats:[hats.length-1,HATS.length-1],colours:[cols,WORM_COLS.length],patterns:[pats.length,PATTERNS.length],extras:[exs.length-1,EXTRAS.length-1]};
  qa($('wardSeg'),'button').forEach(b=>{ const on=b.dataset.w===wardTab, c=n[b.dataset.w]; b.classList.toggle('on',on); b.setAttribute('aria-selected',String(on)); b.querySelector('small').textContent=`${c[0]} of ${c[1]}`; });
  const g=$('wardGrid'); g.className=`hat-grid fade-scroll ward-${wardTab}`;
  if(wardTab==='hats') g.innerHTML=HATS.map(h=>tile('h',h[0],h[0]===hatId,hatUnlocked(h),hatArt(h[0]),h[1],h[3]||`Finish ${CHAPTERS[h[2]]?CHAPTERS[h[2]].name:'a chapter'}`)).join('');
  else if(wardTab==='extras') g.innerHTML=EXTRAS.map(e=>tile('x',e[0],e[0]===extraOn(),e[3](),extraArt(e[0],44),e[1],e[2])).join('');
  else if(wardTab==='colours') g.innerHTML=WORM_COLS.map((c,i)=>tile('c',i,i===wormCol,i<cols,patArt(patOn(),46,i),c[0],`${c[3]} stars`)).join('');
  else g.innerHTML=PATTERNS.map(p=>tile('p',p[0],p[0]===patOn(),pats.includes(p[0]),patArt(p[0],46),p[1],p[2])).join('');
  renderTints();
  qa(g,'button').forEach(b=>b.onclick=()=>{
    if(b.dataset.h){ const h=HATS.find(x=>x[0]===b.dataset.h); if(!hatUnlocked(h)){ nope(b,h[3]?`${h[1]}: ${h[3].charAt(0).toLowerCase()+h[3].slice(1)} to earn it.`:`Finish every patch in ${CHAPTERS[h[2]].name} to earn the ${h[1].toLowerCase()}.`,2800); return; } wearHat(h[0]); }
    else if(b.dataset.x){ const e=EXTRAS.find(x=>x[0]===b.dataset.x); if(!e[3]()){ nope(b,`${e[1]}: ${e[2].charAt(0).toLowerCase()+e[2].slice(1)} to earn it.`,2800); return; } wearExtra(e[0]); }
    else if(b.dataset.c!=null){ const i=+b.dataset.c, c=WORM_COLS[i]; if(i>=coloursUnlocked()){ nope(b,`${c[0]} unlocks at ${c[3]} stars. You have ${starTotal()}.`,2600); return; } wearColour(i); }
    else { const p=PATTERNS.find(x=>x[0]===b.dataset.p); if(!p[3]()){ nope(b,`${p[1]}: ${p[2].charAt(0).toLowerCase()+p[2].slice(1)} to earn it.`,2800); return; } wearPattern(p[0]); }
    outfitChanged(); }); }
// a colour picker for the hat or extra being worn, only on its tab and only for items with colour options
function renderTints(){ const row=$('wardTint'), id=wardTab==='hats'?hatId:wardTab==='extras'?extraOn():null, t=id&&TINTS[id];
  const item=t&&(wardTab==='hats'?HATS.find(h=>h[0]===id):EXTRAS.find(e=>e[0]===id));
  row.hidden=!t; if(!t) return; const k=tintOf(id);
  row.innerHTML=`<span class="tint-lbl">${item[1]}<small>${t.opts[k][0]}</small></span>`+t.opts.map((o,i)=>`<button role="radio" class="tint${i===k?' on':''}" aria-checked="${i===k}" aria-label="${o[0]}" data-t="${i}"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="${hexStr(o[1])}" stroke="#5B4436" stroke-width="2"/>${o[2]!=null?`<path d="M12 21.5a9.5 9.5 0 0 1 0-19z" fill="${hexStr(o[2])}" stroke="#5B4436" stroke-width="2" transform="rotate(45 12 12)"/>`:''}</svg></button>`).join('');
  qa(row,'button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.t; if(i===tintOf(id)) return; tints[id]=i; store.set('squirm-tints',JSON.stringify(tints));
    if(wardTab==='hats'){ dressHat(hHead); dressHat(segMeshes[0]); } else { dressExtra(hHead); dressExtra(segMeshes[0]); }
    outfitChanged(); settle($('wardTint').querySelector('.tint.on')); }); }
qa($('wardSeg'),'button').forEach(b=>b.onclick=()=>{ if(wardTab===b.dataset.w) return; wardTab=b.dataset.w; renderWardrobe(); $('wardGrid').scrollTop=0; settle(b);
  stagger(qa($('wardGrid'),'button'),'rise',0,22,12); });
// a random outfit from what's unlocked, different from the current one where possible
$('dressRandom').onclick=()=>{ const pick=(a,cur)=>{ const o=a.filter(x=>x!==cur); return (o.length?o:a)[Math.floor(Math.random()*(o.length||a.length))]; };
  for(const k in TINTS) if(Math.random()<.5) tints[k]=Math.floor(Math.random()*TINTS[k].opts.length); store.set('squirm-tints',JSON.stringify(tints)); bumpStat('outfits');
  wearHat(pick(HATS.filter(hatUnlocked).map(h=>h[0]),hatId)); wearColour(pick([...Array(coloursUnlocked()).keys()],wormCol)); wearPattern(pick(patternsUnlocked(),patOn())); wearExtra(pick(EXTRAS.filter(e=>e[3]()).map(e=>e[0]),extraOn()));
  if(hHead) homeReact('wow'); renderWardrobe(); };
const DIFF_ICON_KEY={easy:'sprout',medium:'tulip',hard:'tree'};
// short names for the mechanic tiles; the full name goes in the label
const FEAT_SHORT={flags:'Flags',buttons:'Flowers',leaves:'Leaves',fruit:'Fruit',keys:'Keys',portals:'Tunnels',dry:'Dry',rain:'Rain',rivers:'Rivers',snails:'Snails',beetles:'Beetles',pollen:'Pollen',soil:'Soil'};
const DIFF_DESC={easy:'Small patches. A gentle stroll.',medium:'Roomier patches with a few more twists.',hard:'Big patches, longer worms, real head-scratchers.'};
function renderEndless(anim){ const e=progress.endless[endlessDiff];
  const h=$('mHero'); h.dataset.d=endlessDiff;
  h.innerHTML=`<span class="m-em" aria-hidden="true">${art(DIFF_ICON_KEY[endlessDiff],46)}</span><div class="m-info"><b>${DIFF_NAME[endlessDiff]}</b><span class="m-desc">${DIFF_DESC[endlessDiff]}</span>`
    +`<div class="m-chips"><span>${art('flame',18)}${e.streak}<small>streak</small></span><span>${art('trophy',18)}${e.best}<small>best</small></span><span>${art('star',18)}${e.stars}<small>stars</small></span><span>${art('sprout',18)}${e.cleared}<small>cleared</small></span></div></div>`;
  if(anim) animOnce(h,'swap');
  $('diffSeg').innerHTML=['easy','medium','hard'].map(d=>`<button role="radio" aria-checked="${d===endlessDiff}" data-d="${d}" class="diff ${d===endlessDiff?'on':''}">${art(DIFF_ICON_KEY[d],22)}<b>${DIFF_NAME[d]}</b></button>`).join('');
  $('diffSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(endlessDiff===b.dataset.d) return; endlessDiff=b.dataset.d; renderEndless(true); settle($('diffSeg').querySelector('.diff.on')); });
  $('featGrid').innerHTML=FEATURES.map(([k,n])=>`<button role="checkbox" aria-checked="${!!endlessOpts[k]}" aria-label="${n}" title="${n}" data-k="${k}" class="mech ${endlessOpts[k]?'on':''}"><span class="mi" aria-hidden="true">${MECH[k].i}</span>${FEAT_SHORT[k]}<span class="ok" aria-hidden="true">${UI_ICON.check}</span></button>`).join('');
  $('featGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; endlessOpts[k]=!endlessOpts[k]; sfx(endlessOpts[k]?'on':'off'); renderEndless(); settle($('featGrid').querySelector(`[data-k="${k}"]`)); });
  const on=FEATURES.filter(([k])=>endlessOpts[k]).length; $('mixCount').textContent=on?`${on} of ${FEATURES.length}`:'just the basics';
  $('mixAll').textContent=on===FEATURES.length?'None':'All';
  const r=readResume('endless'); $('homeEndlessCont').hidden=!(r&&r.def&&!r.def.daily&&r.diff===endlessDiff);
}
// All turns every mechanic on; once they all are, the same link clears them back to just the basics
$('mixAll').onclick=()=>{ const all=FEATURES.every(([k])=>endlessOpts[k]); FEATURES.forEach(([k])=>endlessOpts[k]=!all); sfx(all?'off':'on'); renderEndless(); if(!all) qa($('featGrid'),'.mech.on').forEach(settle); };
// the patch to continue with: the current one, or the next if the current one is already cleared
function nextGardenIndex(){ const i=currentGardenIndex(); if(!isCleared(i)) return i;
  for(let j=i+1;j<LEVELS.length;j++) if(!isCleared(j)&&isUnlocked(j)) return j; return i; }
$('homePlay').onclick=()=>{ ensureAudio(); if(allCleared()){ showFinale(true); return; } hideAll(); loadLevel(nextGardenIndex()); enterGame(); };
// ---------- the whole garden: what to do once every patch is cleared ----------
function allCleared(){ return LEVELS.every((l,i)=>isCleared(i)); }
function shineable(){ return LEVELS.map((l,i)=>i).filter(i=>isCleared(i)&&(progress.stars[LEVELS[i].name]||0)<3); }
function renderFinale(){
  const todo=shineable(), left=BADGES.filter(b=>!progress.badges[b[0]]), dailyDone=!!progress.daily.results[todayKey()];
  $('finStats').innerHTML=`<div class="m-stat"><span class="ic" aria-hidden="true">${art('star',26)}</span><b>${starTotal()}</b><small>of ${LEVELS.length*3} stars</small></div>`
    +`<div class="m-stat"><span class="ic" aria-hidden="true">${art('medal',26)}</span><b>${Object.keys(progress.badges).length}</b><small>of ${BADGES.length} badges</small></div>`
    +`<div class="m-stat"><span class="ic" aria-hidden="true">${art('worm',26)}</span><b>${(progress.stats.moves||0).toLocaleString()}</b><small>moves</small></div>`;
  const row=(go,ico,title,sub,done)=>`<button class="set-link${done?' is-done':''}" data-go="${go}"><span class="set-ico" aria-hidden="true">${art(ico,28)}</span><span><b>${title}</b><small>${sub}</small></span><span class="chev" aria-hidden="true">${done?UI_ICON.check:UI_ICON.chev}</span></button>`;
  $('finNext').innerHTML=
    row('shine','star',todo.length?'Shine up your stars':'Every patch has 3 stars',todo.length?`${todo.length} can earn more · next: ${LEVELS[todo[0]].name}`:'Not a single star left to find. Wow.',!todo.length)
    +row('badges','medal',left.length?'Badges to find':'Every badge found',left.length?`${left.length} to go, like ${left.slice(0,2).map(b=>b[2]).join(' and ')}`:'You found every last one.',!left.length)
    +row('meadow','daisy','Endless meadow','Fresh patches, as many as you like',false)
    +row('daily','calendar','Daily patch',dailyDone?'Done today. A new one grows tomorrow.':'A new one for everyone, every day',dailyDone);
  qa($('finNext'),'.set-link').forEach(b=>b.onclick=()=>finGo(b.dataset.go,b)); }
// push: open it as a new layer (from home); otherwise the caller already put a 'finale' layer in place
function showFinale(push){ renderFinale(); show('finOv'); if(push) pushLayer('finale'); petals(); sfx('badge'); stagger(qa($('finOv'),'.fin-emb,.m-stat,.set-link'),'rise',100,60); }
// each choice takes over the finale's place in the back stack, so back leads home
function finGo(k,el){
  if(k==='shine'){ const t=shineable(); if(!t.length){ nope(el,'Every patch already has 3 stars.'); return; } layers[layers.length-1]='game'; hideAll(); loadLevel(t[0]); return; }
  if(k==='daily'){ if(progress.daily.results[todayKey()]){ nope(el,'Today\'s patch is done. Come back tomorrow for a new one.'); return; } layers[layers.length-1]='game'; hide('finOv'); $('dailyBtn').onclick(); return; }
  layers[layers.length-1]='tab'; hide('finOv'); showTab(k,true); }
$('finClose').onclick=()=>{ hide('finOv'); popLayer('finale'); renderHome(); };
$('endlessGo').onclick=()=>{ newEndless(); };
$('surprise').onclick=()=>{ const ks=['fruit','keys','portals','dry','rain','rivers','snails','buttons','leaves','beetles','pollen','soil']; ks.forEach(k=>endlessOpts[k]=false); endlessOpts.flags=Math.random()<.8;
  const n=2+Math.floor(Math.random()*2); for(let i=0;i<n;i++) endlessOpts[ks[Math.floor(Math.random()*ks.length)]]=true; renderEndless(); qa($('featGrid'),'.mech.on').forEach(settle); };
$('meadowBtn').onclick=()=>{ ensureAudio(); if(!continueEndless()) newEndless(); };
// the badge closest to being earned, as a little goal on the Play tab; tapping opens it on the Badges tab
function renderGoal(){ const g=$('goalCard'), id=nearestBadge(), b=badgeById(id), p=badgeProg(b);
  if(!b||progress.badges[id]){ g.hidden=true; return; } g.hidden=false; g.dataset.b=id;
  g.innerHTML=`<span class="b-medal" aria-hidden="true">${art(b[1],32)}<span class="b-lock">${art('lock',12)}</span></span><span class="gt"><small>${p?'Almost there':'Next badge'}</small><b>${b[2]}</b>`
    +(p?`<span class="gbar"><span class="b-bar" style="--p:${pct(p)}"></span>${p[0].toLocaleString()} of ${p[1].toLocaleString()}</span>`:`<em>${b[3]}</em>`)+`</span>`; }
$('goalCard').onclick=()=>{ badgeSel=$('goalCard').dataset.b; badgeFilter='all'; showTab('badges'); };
// the worm says hello: by time of day, about today's daily, and something new each time it's tapped
const SAY_TAP=['Hi there!','That tickles!','Wheee!','Hello, friend!','*wiggle wiggle*','I like your hat.','Shall we crawl?','Mmm, peaches.'];
let sayI=0;
function say(t){ const el=$('wormSay'); if(!el||el.textContent===t) return; el.textContent=t; animOnce(el,'say'); }
function sayHello(){ const h=new Date().getHours(), d=progress.daily, done=!!d.results[todayKey()];
  const hi=h<5?'Up late?':h<12?'Good morning!':h<18?'Hello again!':'Good evening!', played=LEVELS.some((l,i)=>isCleared(i));
  say(!done&&played?`${hi} Today's patch is ready.`:h<5?'Up late? Me too.':hi); }
$('dailyBtn').onclick=()=>{ ensureAudio(); const r=readResume('endless'); if(r&&r.def&&r.def.daily===todayKey()){ mode='endless'; hideAll(); startLevel(r.def,false); enterGame(); return; } startDaily(); };
$('homeEndlessCont').onclick=()=>{ continueEndless(); };
$('homeSound').onclick=()=>toggleMute($('homeSound'));
// colour theme: follow the system, or force light or dark
const THEMES=['auto','light','dark'];
let theme=store.get('squirm-theme')||'auto'; if(!THEMES.includes(theme)) theme='auto';
function applyTheme(){ if(theme==='auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=theme;
  $('setTheme').querySelectorAll('button').forEach(b=>{ const on=b.dataset.t===theme; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); }); }
$('setTheme').querySelectorAll('button').forEach(b=>b.onclick=()=>{ theme=b.dataset.t; store.set('squirm-theme',theme); applyTheme(); settle(b); });
applyTheme();

// ---------- settings: pages, toggles, theme, save code backup and restore ----------
function renderSettings(){ renderNews(); $('setMusic').setAttribute('aria-checked',String(musicOn)); $('setMusicVol').value=Math.round(musicVol*100); $('volRow').hidden=!musicOn;
  // a little summary of the garden at the top
  $('setHero').innerHTML=[[art('star',22),starTotal(),'stars'],[art('medal',22),Object.keys(progress.badges).length,'badges'],[art('sprout',22),LEVELS.filter((l,i)=>isCleared(i)).length,'patches']].map(([i,n,l])=>`<span>${i}${n}<small>${l}</small></span>`).join('');
  qa($('setGfx'),'button').forEach(b=>{ const on=b.dataset.g===gfx; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); }); $('setSound').setAttribute('aria-checked',String(!muted)); $('setHaptic').setAttribute('aria-checked',String(hapticsOn)); applyTheme();
  $('statsRow').hidden=$('statsNote').hidden=!statsLive(); $('setStats').setAttribute('aria-checked',String(statsOn())); $('saveCode').hidden=true; $('saveCode').value=''; $('saveLoad').textContent='Restore'; renderRemind(); }
$('settingsBtn').onclick=()=>{ ensureAudio(); renderSettings(); $('setScroll').scrollTop=0; const d=$('setOv').querySelector('details'); if(d) d.open=false;
  show('setOv'); pushLayer('settings'); stagger(qa($('setScroll'),':scope > *'),'rise',60,45); };
$('setClose').onclick=()=>{ hide('setOv'); popLayer('settings'); renderHome(); };
$('setGfx').querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(gfx===b.dataset.g) return; gfx=b.dataset.g; store.set('squirm-gfx',gfx);
  if(gfx==='saver') setQuality(0); else if(gfx==='best') setQuality(2); renderSettings(); settle(b); });
$('setSound').onclick=()=>{ toggleMute(); renderSettings(); };
$('setStats').onclick=()=>{ const on=!statsOn(); store.set('squirm-stats',on?'1':'0'); sfx(on?'on':'off'); renderSettings(); };
$('setHaptic').onclick=()=>{ $('hapticBtn').onclick(); renderSettings(); };
$('setMusicVol').oninput=e=>{ musicVol=e.target.value/100; store.set('squirm-music-vol',String(musicVol)); ensureAudio(); musicTick(); };
$('setMusic').onclick=()=>{ musicOn=!musicOn; store.set('squirm-music',musicOn?'1':'0'); ensureAudio(); sfx(musicOn?'on':'off'); renderSettings(); if(musicOn&&muted) toast('Turn sound on to hear the music.',2400); };
// a save code is every squirm- key (except throwaway ones) as base64 JSON with a version prefix
const SAVE_PREFIX='SQUIRM1:', SAVE_SKIP=['squirm-quality','squirm-gfx','squirm-offline-told','squirm-daily-patch','squirm-remind','squirm-boot','squirm-stats','squirm-stats-v'];
function saveCode(){ const d={}; for(const k of store.keys()) if(!SAVE_SKIP.includes(k)) d[k]=store.get(k);
  return SAVE_PREFIX+btoa(unescape(encodeURIComponent(JSON.stringify(d)))); }
function readSaveCode(code){ code=String(code||'').trim(); if(!code.startsWith(SAVE_PREFIX)) return null;
  try{ const d=JSON.parse(decodeURIComponent(escape(atob(code.slice(SAVE_PREFIX.length))))); if(!d||typeof d!=='object'||!d['squirm-progress']) return null;
    for(const k in d) if(!k.startsWith('squirm-')||typeof d[k]!=='string') return null; JSON.parse(d['squirm-progress']); return d; }catch(e){ return null; } }
$('saveCopy').onclick=async()=>{ const c=saveCode(); try{ await navigator.clipboard.writeText(c); toast('Save code copied. Keep it somewhere safe.',2600); }
  catch(e){ const t=$('saveCode'); t.hidden=false; t.value=c; t.focus(); t.select(); toast('Copy the code from the box.',2600); } };
$('saveLoad').onclick=()=>{ const t=$('saveCode');
  if(t.hidden||!t.value.trim()){ t.hidden=false; t.value=''; t.focus(); $('saveLoad').textContent='Load it'; return; }
  const d=readSaveCode(t.value); if(!d){ nope(t,"That code doesn't look right. Check it was copied in full.",3000); return; }
  try{ Object.keys(localStorage).filter(k=>k.startsWith('squirm-')&&!SAVE_SKIP.includes(k)).forEach(k=>localStorage.removeItem(k)); for(const k in d) localStorage.setItem(k,d[k]); }catch(e){ toast("Couldn't save on this device.",2600); return; }
  buzz([20,40,20]); location.reload(); };

// ---------- badges: small goals, checked after wins and after moves that bump a counter ----------
progress.badges=progress.badges||{}; progress.stats=Object.assign({slides:0,hedges:0,fruit:0},progress.stats||{}); progress.clean=progress.clean||{};
// dailies finished, counted from now on; players from before start with the days still on record (the last 90)
if(progress.stats.dailies==null) progress.stats.dailies=Object.keys(progress.daily.results).length;
const anyChapter=f=>CHAPTERS.some(ch=>{ for(let i=ch.from;i<=ch.to;i++) if(!f(i)) return false; return true; });
// a badge test that also reports progress: [have, need], shown on the badges screen
const counted=f=>Object.assign(()=>{ const [a,b]=f(); return a>=b; },{prog:f});
const BADGES=[
  ['first','sprout','First wiggle','Finish your first patch.',c=>(c&&c.won)||LEVELS.some((l,i)=>isCleared(i))],
  ['par','target','Right on par','Finish a patch in par moves or fewer.',c=>c&&c.won&&c.mv<=c.par],
  ['chapter','book','Chapter done','Finish every patch in a chapter.',()=>anyChapter(isCleared)],
  ['clean','bulb','All by myself','Finish a whole chapter without using a hint.',()=>anyChapter(i=>progress.clean[LEVELS[i].name])],
  ['stars50','star','Star gazer','Collect 50 stars in the garden.',counted(()=>[starTotal(),50])],
  ['stars150','stars','Constellation','Collect 150 stars in the garden.',counted(()=>[starTotal(),150])],
  ['garden','house','The whole garden','Finish every garden patch.',counted(()=>[LEVELS.filter((l,i)=>isCleared(i)).length,LEVELS.length])],
  ['daily','calendar','Early bird','Finish a daily patch.',()=>Object.keys(progress.daily.results).length>0],
  ['streak7','week','Week of wiggles','Keep a seven day daily streak.',counted(()=>[progress.daily.best,7])],
  ['meadow','wheat','Meadow wanderer','Clear ten endless patches.',counted(()=>[['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0),10])],
  ['brave','shield','Brave little worm','Clear a hard endless patch.',()=>progress.endless.hard.cleared>0],
  ['slides','wetleaf','Slip and slide','Slide across 50 wet leaves.',counted(()=>[progress.stats.slides,50])],
  ['hedges','hedge','Green thumb','Open hedges 20 times.',counted(()=>[progress.stats.hedges,20])],
  ['pushes','beetle','Heave-ho','Push beetles 25 times.',counted(()=>[progress.stats.pushes,25])],
  ['snacks','peach','Snack attack','Eat 30 peaches and mushrooms.',counted(()=>[progress.stats.fruit,30])],
  ['owl','moon','Night owl','Finish a patch between 10 pm and 5 am.',c=>c&&c.won&&(c.hour>=22||c.hour<5)],
  ['quick','bolt','Quick crawl','Finish a patch with a par of 10 or more in under 30 seconds.',c=>c&&c.won&&c.par>=10&&c.secs<30],
  ['flags','flag','Flag collector','Touch 100 flags.',counted(()=>[progress.stats.flags,100])],
  ['tunnels','tunnel','Burrow buddy','Travel through tunnels 25 times.',counted(()=>[progress.stats.tunnels,25])],
  ['gates','key','Key keeper','Open 15 gates.',counted(()=>[progress.stats.gates,15])],
  ['crumbs','crack','Crumbly ground','Watch 50 dry patches sink.',counted(()=>[progress.stats.crumbles,50])],
  ['rain','rain','Rain dancer','Start the rain 10 times.',counted(()=>[progress.stats.rains,10])],
  ['bridges','bridge','Bridge keeper','Swing bridges 15 times.',counted(()=>[progress.stats.swings,15])],
  ['moves','steps','Long crawl','Crawl 1,000 moves.',counted(()=>[progress.stats.moves,1000])],
  ['undos','rewind','Second thoughts','Take back 100 moves.',counted(()=>[progress.stats.undos,100])],
  ['taps','heart','Best friends','Say hi to the worm 20 times.',counted(()=>[progress.stats.taps,20])],
  ['nap','zzz','Nap time','Let the worm doze off mid-patch.',counted(()=>[progress.stats.naps,1])],
  ['sage','owl','Puzzle sage','Finish 20 patches without a hint.',counted(()=>[Object.keys(progress.clean).length,20])],
  ['shiny','sparkles','Shining garden','Get three stars on 30 patches.',counted(()=>[LEVELS.filter(l=>progress.stars[l.name]===3).length,30])],
  ['chapters','blossom','Seasoned gardener','Finish seven chapters.',counted(()=>[CHAPTERS.filter((ch,k)=>chapterCleared(k)).length,7])],
  ['month','month','Month of wiggles','Keep a 30 day daily streak.',counted(()=>[progress.daily.best,30])],
  ['fearless','mountain','Fearless','Clear ten hard endless patches.',counted(()=>[progress.endless.hard.cleared,10])],
  ['dressup','hat-tophat','Dress-up box','Unlock five hats.',counted(()=>[HATS.filter(h=>h[0]!=='none'&&hatUnlocked(h)).length,5])],
  ['rainbow','rainbow','Rainbow worm','Unlock every worm colour.',counted(()=>[coloursUnlocked(),WORM_COLS.length])],
  ['patterns','worm','Dressed to wiggle','Unlock every worm pattern.',counted(()=>[patternsUnlocked().length,PATTERNS.length])],
  ['golden','trophy','Golden chapter','Get three stars on every patch in a chapter.',()=>anyChapter(i=>progress.stars[LEVELS[i].name]===3)],
  ['allstars','crown','Every star in the sky','Get three stars on every garden patch.',counted(()=>[LEVELS.filter(l=>progress.stars[l.name]===3).length,LEVELS.length])],
  ['pure','daisy','Pure gardener','Finish 100 patches without a hint.',counted(()=>[Object.keys(progress.clean).length,100])],
  ['notake','tulip','No take-backs','Finish a patch with a par of 25 or more without undo or hints.',c=>c&&c.won&&c.par>=25&&c.undos===0&&!c.hinted],
  ['lightning','flame','Lightning worm','Finish a patch with a par of 30 or more, right on par, in under a minute.',c=>c&&c.won&&c.par>=30&&c.mv<=c.par&&c.secs<60],
  ['sunrises','sun','Fifty sunrises','Finish 50 daily patches.',counted(()=>[progress.stats.dailies,50])],
  ['legend','tree','Meadow legend','Clear 50 hard endless patches.',counted(()=>[progress.endless.hard.cleared,50])],
  ['unstoppable','bee','Unstoppable','Clear 10 hard endless patches in a row.',counted(()=>[progress.endless.hard.best,10])],
  ['appetite','mushroom','Big appetite','Eat 200 peaches and mushrooms.',counted(()=>[progress.stats.fruit,200])],
  ['flowerpower','flowerbtn','Flower power','Push a beetle onto a flower button.',counted(()=>[progress.stats.beetleFlower,1])],
  ['wheee','leaf','Wheee!','Slide across four wet leaves in one go.',counted(()=>[progress.stats.slideMax,4])],
  ['photos','camera','Say cheese','Snap 5 photos of your garden.',counted(()=>[progress.stats.photos,5])],
  ['marathon','butterfly','Marathon worm','Crawl 10,000 moves.',counted(()=>[progress.stats.moves,10000])],
  ['dawn','drop','Dawn chorus','Finish a patch between 5 and 7 in the morning.',c=>c&&c.won&&c.hour>=5&&c.hour<7],
  ['hatrack','hat-gold','Hat collector','Unlock every hat.',counted(()=>[HATS.filter(h=>h[0]!=='none'&&hatUnlocked(h)).length,HATS.length-1])],
  ['fashion','extra-shades','Fashion icon','Unlock every extra.',counted(()=>[EXTRAS.filter(e=>e[0]!=='none'&&e[3]()).length,EXTRAS.length-1])],
  ['critters','hat-shell','Critter wrangler','Finish every patch in Critter crossing.',()=>chapterCleared(16)],
  ['harvest','hat-pumpkin','Harvest home','Finish every patch in Harvest moon.',()=>chapterCleared(17)],
  ['pollinator','pollenY','Busy pollinator','Get dusted with pollen 50 times.',counted(()=>[progress.stats.dusts,50])],
  ['knots','soil','Tied in knots','Burrow under yourself 25 times.',counted(()=>[progress.stats.burrows,25])],
  ['tangled','hat-gnome','Deep roots','Finish every patch in Tangled roots.',()=>chapterCleared(20)],
  ['farfields','hat-explorer','Far and wide','Finish every patch in Far fields.',()=>chapterCleared(21)],
  ['collector','medal','Badge collector','Earn 40 other badges.',counted(()=>[Object.keys(progress.badges).filter(k=>k!=='collector').length,40])]];
// returns the badges earned just now; quiet ones (earned before badges existed) don't celebrate
function checkBadges(ctx,quiet){ const got=[];
  for(const b of BADGES){ if(progress.badges[b[0]]) continue; let ok=false; try{ ok=!!b[4](ctx); }catch(e){} if(ok){ progress.badges[b[0]]=Date.now(); got.push(b); } }
  if(got.length){ save(); // after a win the win card lists them, so only the jingle plays
    if(!quiet) setTimeout(()=>{ sfx('badge'); if(!(ctx&&ctx.won)) toast(`Badge earned: ${got[0][2].replace(/&[^;]+;/g,'')}${got.length>1?` and ${got.length-1} more`:''}!`,3200); },ctx&&ctx.won?1400:200); }
  return got; }
function bumpStat(k,n=1){ progress.stats[k]=(progress.stats[k]||0)+n; }
// badges screen: a filter, groups of sticker tiles in a fading scroller, and a card for the picked badge
const BADGE_GROUPS=[['Garden journey',['first','par','chapter','clean','sage','stars50','stars150','shiny','chapters','garden','golden','pure','notake','lightning','critters','harvest','tangled','farfields','allstars']],
  ['Daily and meadow',['daily','streak7','month','sunrises','meadow','brave','fearless','unstoppable','legend']],
  ['Garden helpers',['flags','snacks','appetite','crumbs','gates','tunnels','rain','bridges','slides','wheee','hedges','pushes','flowerpower','pollinator','knots']],
  ['Just for fun',['moves','marathon','undos','taps','nap','owl','dawn','quick','photos','dressup','hatrack','rainbow','patterns','fashion','collector']]];
// a badge left out of every group still shows, in the last one
{ const seen=new Set(BADGE_GROUPS.flatMap(g=>g[1])); BADGE_GROUPS[BADGE_GROUPS.length-1][1].push(...BADGES.map(b=>b[0]).filter(id=>!seen.has(id))); }
let badgeFilter='all', badgeSel=null;
const badgeById=id=>BADGES.find(b=>b[0]===id);
// [have, need] for a counted badge that isn't earned yet and has more than one step, else null
const badgeProg=b=>{ if(progress.badges[b[0]]||!b[4].prog) return null; const [a,n]=b[4].prog(); return n>1?[Math.min(a||0,n),n]:null; };
const pct=([a,n])=>(100*a/n).toFixed(1)+'%';
// the badge to show first: the closest one to earning, else the first not earned, else the first
function nearestBadge(){ let best=null, br=-1;
  for(const b of BADGES){ const p=badgeProg(b); if(p&&p[0]/p[1]>br){ br=p[0]/p[1]; best=b; } }
  return (best||BADGES.find(b=>!progress.badges[b[0]])||BADGES[0])[0]; }
function badgeTile(b){ const t=!!progress.badges[b[0]], p=badgeProg(b);
  return `<button class="b-tile ${t?'on':''} ${b[0]===badgeSel?'sel':''}" data-b="${b[0]}" aria-pressed="${b[0]===badgeSel}" aria-label="${b[2]}${t?', earned':''}">`
    +`<span class="b-medal" aria-hidden="true">${art(b[1],34)}${t?'':`<span class="b-lock">${art('lock',14)}</span>`}</span><b>${b[2]}</b>`
    +`<span class="b-bar ${p?'':'none'}" style="--p:${p?pct(p):'0%'}" aria-hidden="true"></span></button>`; }
function renderBadgeDetail(anim){ const b=badgeById(badgeSel), t=!!progress.badges[b[0]], p=badgeProg(b), d=$('badgeDetail');
  d.classList.toggle('on',t);
  d.innerHTML=`<span class="b-medal" aria-hidden="true">${art(b[1],38)}${t?'':`<span class="b-lock">${art('lock',14)}</span>`}</span><span class="pt"><b>${b[2]}</b><small>${b[3]}</small>`
    +(t?`<small class="b-state got">${UI_ICON.check} Earned</small>`:p?`<small class="b-state"><span class="b-bar" style="--p:${pct(p)}"></span>${p[0].toLocaleString()} of ${p[1].toLocaleString()}</small>`:`<small class="b-state">Not yet</small>`)+`</span>`;
  if(anim) animOnce(d,'swap'); }
function renderBadges(){ const n=Object.keys(progress.badges).length;
  $('badgeCount').textContent=`${n} of ${BADGES.length} earned`;
  $('badgeBar').firstElementChild.style.setProperty('--p',(100*n/BADGES.length).toFixed(1)+'%');
  qa($('badgeFilter'),'button').forEach(b=>{ const on=b.dataset.f===badgeFilter; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); });
  const show=b=>badgeFilter==='all'||(badgeFilter==='earned')===!!progress.badges[b[0]];
  if(!badgeSel||!badgeById(badgeSel)) badgeSel=nearestBadge();
  const html=BADGE_GROUPS.map(([title,ids])=>{ const list=ids.map(badgeById).filter(show); if(!list.length) return '';
    const got=ids.filter(id=>progress.badges[id]).length;
    return `<section class="b-group" aria-label="${title}"><p class="label">${title}<span>${got} of ${ids.length}</span></p><div class="b-tiles">${list.map(badgeTile).join('')}</div></section>`; }).join('');
  const g=$('badgeGrid'); g.innerHTML=html||`<p class="b-empty">${badgeFilter==='earned'?'No badges yet. Finish a patch to earn your first one.':'You found every badge. What a garden!'}</p>`;
  qa(g,'.b-tile').forEach(el=>el.onclick=()=>{ if(badgeSel===el.dataset.b) return; badgeSel=el.dataset.b;
    qa(g,'.b-tile').forEach(x=>{ const on=x===el; x.classList.toggle('sel',on); x.setAttribute('aria-pressed',String(on)); }); settle(el); renderBadgeDetail(true); });
  renderBadgeDetail(); }
qa($('badgeFilter'),'button').forEach(b=>b.onclick=()=>{ if(badgeFilter===b.dataset.f) return; badgeFilter=b.dataset.f; renderBadges(); $('badgeGrid').scrollTop=0; settle(b);
  stagger(qa($('badgeGrid'),'.b-tile'),'rise',0,25,12); });

// ---------- secret reset ----------
function askReset(){ sfx('stuck'); show('resetOv'); pushLayer('reset'); }
$('resetNo').onclick=()=>{ hide('resetOv'); popLayer('reset'); if(hHead) applyExpr(hHead,'joy'); };
$('resetYes').onclick=()=>{ store.keys().forEach(k=>store.del(k));
  buzz([40,60,40]); location.reload(); };

// ---------- the worm on the home screen: just the head, full of personality ----------
const homeCanvas=$('homeWorm'); let homeR=null, hScene, hCam, hRig, hBody=null, hHead, hExprT=0, hBlink=2, hReactT=0;
function initHomeWorm(){ try{ homeR=new THREE.WebGLRenderer({canvas:homeCanvas,antialias:true,alpha:true}); }catch(e){ return; }
  homeR.setPixelRatio(Math.min(window.devicePixelRatio||1,3)); homeR.setSize(220,200,false);
  hScene=new THREE.Scene(); hScene.add(new THREE.HemisphereLight(0xfffaf0,0xb7d79a,.32)); hScene.add(new THREE.AmbientLight(0xfff4e2,.2));
  const d=new THREE.DirectionalLight(0xfff1dc,.6); d.position.set(-2,4,3); hScene.add(d);
  // framed with headroom above the worm so tall hats (top hat, umbrella) fit
  hCam=new THREE.PerspectiveCamera(24,220/200,.1,50); hCam.position.set(0,.5,4.66); hCam.lookAt(0,.63,0);
  hRig=new THREE.Group(); hScene.add(hRig);
  hHead=makeSeg(0,hRig); hHead.position.set(0,.34,0); hHead.scale.setScalar(1.45); applyExpr(hHead,'grin');
  // on the Me tab the worm shows its whole body, curled on the ground beside it, so colour and pattern show
  hBody=new THREE.Group(); hBody.visible=false; hRig.add(hBody);
  const tb=new THREE.Mesh(new THREE.BufferGeometry(),tubeMat), tl=new THREE.Mesh(new THREE.BufferGeometry(),lineMat), tip=new THREE.Mesh(sph(1,20,14),capMat.clone()), to=new THREE.Mesh(tip.geometry,lineMat);
  tip.add(to); hBody.add(tb,tl,tip); hBody.userData={tb,tl,tip,to};
  const sh=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x5B4436,transparent:true,opacity:.16,depthWrite:false}));
  sh.rotation.x=-Math.PI/2; sh.scale.set(1.15,.55,1); sh.position.set(.35,-.43,.15); hBody.add(sh);
  buildHomeBody();
  // tap: a happy reaction. Hold for 3 seconds: the secret reset (the worm gets more and more worried)
  let holdT=null, holdStart=0, held=false;
  const endHold=()=>{ clearInterval(holdT); holdT=null; if(hHead) hHead.userData.shake=0; };
  homeCanvas.addEventListener('pointerdown',e=>{ ensureAudio(); held=false; holdStart=performance.now(); clearInterval(holdT);
    holdT=setInterval(()=>{ const t=(performance.now()-holdStart)/1000; if(t<.6) return;
      if(hHead){ hHead.userData.shake=Math.min(1,(t-.6)/2.4); if(hHead.userData.expr!=='wow') applyExpr(hHead,'wow'); }
      if(Math.floor(t*4)!==Math.floor((t-.05)*4)) buzz(Math.round(6+t*6));
      if(t>=3){ endHold(); held=true; askReset(); } },50); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>homeCanvas.addEventListener(ev,()=>{ const short=holdT && performance.now()-holdStart<600; endHold();
    if(short&&!held){ homeReact(EXPRS[Math.floor(Math.random()*EXPRS.length)]); sfx('grow'); if(curTab==='play') say(SAY_TAP[sayI++%SAY_TAP.length]); bumpStat('taps'); checkBadges(null); save(); } else if(!held && hHead) applyExpr(hHead,'smile'); }));
  homeCanvas.addEventListener('contextmenu',e=>e.preventDefault());
  homeCanvas.addEventListener('keydown',e=>{ if(e.key!=='Enter'&&e.key!==' ') return; e.preventDefault(); ensureAudio(); homeReact(EXPRS[Math.floor(Math.random()*EXPRS.length)]); sfx('grow'); });
}
// the curl: from the neck behind the head, down to the ground and round to a tail in front
function buildHomeBody(){ if(!hBody) return; const {tb,tl,tip,to}=hBody.userData;
  const pts=[[0,.22,-.18],[.12,-.14,-.3],[.5,-.3,-.28],[.9,-.3,-.05],[1.02,-.31,.32],[.78,-.33,.6],[.5,-.36,.66]].map(p=>new THREE.Vector3(...p));
  // about one game segment per unit of length, like in a patch, so stripes and spots keep their size
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'), S=60, len=curve.getLength(), n=1+len, sp=[], rr=[], cc=[], gs=[];
  for(let j=0;j<S;j++){ const u=j/(S-1), g=.5+u*len; sp.push(curve.getPoint(u)); rr.push(.33*(1-.55*u*u)*(1+.04*Math.cos(g*4*Math.PI))); cc.push(colorAt(g,n)); gs.push(g); }
  tubeGeo(tb.geometry,sp,rr,cc,0,gs); tubeGeo(tl.geometry,sp,rr.map(r=>r+.035),null,0);
  const end=sp[S-1], r=rr[S-1]; tip.position.copy(end); tip.scale.setScalar(r); to.scale.setScalar(1+.035/r); tip.material.color.copy(cc[S-1]); }
// the Play tab shows the head alone; the Me tab a wider stage with the whole worm
function homeStage(me){ if(!homeR) return; const w=me?320:220, h=me?(window.innerHeight<760?210:280):200; homeR.setSize(w,h,false); hCam.aspect=w/h;
  homeCanvas.style.height=me?h+'px':'';
  // headroom above the head so the tallest hats (wizard hat, umbrella) stay in frame
  if(me){ hCam.position.set(.32,2.3,6); hCam.lookAt(.32,.42,.1); hRig.position.set(-.42,0,0); } else { hCam.position.set(0,.5,4.66); hCam.lookAt(0,.63,0); hRig.position.set(0,0,0); }
  hCam.updateProjectionMatrix(); hBody.visible=me; }
function homeReact(e){ if(!hHead) return; applyExpr(hHead,e); hReactT=1.4; hExprT=0; const b=hHead.userData.body;
  tween(380,(x,k)=>{ const s=1+Math.sin(k*Math.PI)*.14; b.scale.set(s,1/s,s); b.position.y=Math.sin(k*Math.PI)*.12; },()=>{ b.scale.set(1,1,1); b.position.y=0; }); }
function renderHomeWorm(dt){ if(!homeR) return; const t=idleT;
  const sk=hHead.userData.shake||0; hHead.position.x=Math.sin(t*60)*.03*sk;
  hHead.position.y=.34+Math.sin(t*2.2)*.03; hHead.rotation.y=Math.sin(t*.8)*.28; hHead.rotation.z=Math.sin(t*1.1)*.06; hHead.userData.body.rotation.x=-.1+Math.sin(t*.6)*.08;
  hExprT+=dt/1000; if(hReactT>0) hReactT-=dt/1000; else if(hExprT>2.8){ hExprT=0; let e; do{ e=EXPRS[Math.floor(Math.random()*EXPRS.length)]; }while(e===hHead.userData.expr); applyExpr(hHead,Math.random()<.3?'smile':e); }
  hBlink-=dt/1000; let bl=1; if(hBlink<0){ bl=Math.max(.08,Math.abs(hBlink+.07)/.07); if(hBlink<-.14) hBlink=1.6+Math.random()*2.5; }
  hHead.userData.face.eyes.forEach(e=>{ const s=e.userData.baseS||1; e.scale.set(s,s*(e.userData.baseY||1)*bl,s); });
  homeR.render(hScene,hCam); homeCanvas.classList.add('ready'); }

// ---------- first time you meet a mechanic ----------
const MECH={
  basics:{t:'Crawl to the burrow',d:'Swipe to crawl. The burrow only fits a worm of the exact length on its sign.',k:/E/,i:art('start',40)},
  flags:{t:'Flags',d:'Touch every flag before the burrow will let you in.',k:/C/,i:art('flag',40)},
  fruit:{t:'Peaches and mushrooms',d:'A peach makes you one longer. A mushroom makes you one shorter. Shorter worms can turn in tight spots.',k:/[+-]/,i:art('fruit',40)},
  keys:{t:'Keys and gates',d:'Pick up a key to open one wooden gate. Each key works once.',k:/[KG]/,i:art('key',40)},
  dry:{t:'Dry patches',d:'Cracked ground sinks into the soil once your tail leaves it. You only get one visit.',k:/x/,i:art('crack',40)},
  portals:{t:'Tunnels',d:'Worms dig! Crawl into a tunnel and come out of the one marked with the same flowers.',k:/[1-9]/,i:art('tunnel',40)},
  rain:{t:'Rain',d:'Step on a cloud stone to start or stop the rain. Rain grows seedlings into leaves you can cross, and fills puddles so you can\'t.',k:/[Rsw]/,i:art('rain',40)},
  snails:{t:'Snails',d:'A snail slides one tile every time you move and turns around when something blocks it. You cannot crawl through a snail, so time your moves.',k:/[<>^v]/,i:art('snail',40)},
  buttons:{t:'Flower buttons',d:'Hedges open while any part of you rests on a big flower. Keep your tail on the flower while your head slips through.',k:/[BH]/,i:art('flowerbtn',40)},
  beetles:{t:'Beetles',d:'Bump into a beetle to push it one tile ahead. Beetles only move onto grass, flowers, dry patches and leaves, where they slide. A beetle resting on a flower holds the hedges open for you.',k:/O/,i:art('beetle',40)},
  leaves:{t:'Wet leaves',d:'Dewy leaves are slippery. Crawl onto one and you slide along until you reach dry grass or bump into something.',k:/i/,i:art('wetleaf',40)},
  pollen:{t:'Pollen and petal gates',d:'Crawl over a flower to get dusted in its pollen. Petal gates only open for a worm wearing their colour, and the next flower you visit swaps your colour.',k:/[PYUpyu]/,i:art('pollenY',40)},
  soil:{t:'Soft soil',d:'Worms love loose earth! On soft soil you burrow under, so you can cross your own body there. Just never fold back onto yourself.',k:/#/,i:art('soil',40)},
  rivers:{t:'Rivers and bridges',d:'Water blocks the way. Bridges only go along their planks, and a crank swings every bridge you are not standing on.',k:/[~=|L]/,i:art('bridge',40)},
};
let seenMech=store.json('squirm-seen')||{};
let introDone=null;
function newMechanics(){ const m=L.map.join(''); return Object.keys(MECH).filter(k=>!seenMech[k]&&MECH[k].k.test(m)); }
// one card per mechanic: a big bobbing sticker, its name and what it does; Next pages through, the last says Let's go
let introList=[], introI=0;
const INTRO_TINT=['--tint-leaf','--tint-honey','--tint-berry'];
function renderIntro(anim){ const k=introList[introI], n=introList.length, b=$('introBody');
  b.innerHTML=`<p class="label">${n===1?'Something new':`New in this patch · ${introI+1} of ${n}`}</p>`
    +`<div class="intro-art" style="--tint:var(${INTRO_TINT[(Object.keys(MECH).indexOf(k))%3]})"><span class="ia">${MECH[k].i.replace('width="40" height="40"','width="64" height="64"').replace(/stroke-width="[\d.]+"/,'stroke-width="1.5"')}</span><i></i><i></i><i></i></div>`
    +`<h2 id="introTitle">${MECH[k].t}</h2><p class="desc">${MECH[k].d}</p>`;
  $('introDots').innerHTML=n>1?introList.map((x,i)=>`<i class="${i===introI?'on':''}"></i>`).join(''):'';
  $('introOk').textContent=introI<n-1?'Next':"Let's go!";
  if(anim&&!reduceMotion) animOnce(b,'swap'); }
function showIntro(list,done){ introList=list; introI=0; renderIntro(false);
  list.forEach(k=>seenMech[k]=1); store.set('squirm-seen',JSON.stringify(seenMech));
  introDone=done; show('introOv'); pushLayer('intro'); sfx('ready'); }
function introNext(){ if(introI<introList.length-1){ introI++; renderIntro(true); sfx('ready'); } else closeIntro(false); }
// ---------- the worm talks ----------
// a speech bubble that follows the worm's head during play: little reactions and hints
let gSayT=0;
function wormSays(t,ms=2000){ const el=$('wormSayG'); if(!state||anyOverlay()||photoOn) return; el.textContent=t; el.hidden=false; gSayT=ms/1000; placeSay(); animOnce(el,'say'); }
function placeSay(){ const el=$('wormSayG'), h=segMeshes[0]; if(el.hidden) return;
  if(!h||anyOverlay()||photoOn||document.body.classList.contains('at-home')){ el.hidden=true; gSayT=0; return; }
  const v=h.position.clone(); v.y+=.45; v.project(camera); const W=window.innerWidth, H=window.innerHeight, x=(v.x+1)/2*W, y=(1-v.y)/2*H;
  const w=el.offsetWidth, left=x+30+w>W-8; el.classList.toggle('left',left);
  el.style.transform=`translate(${Math.round(Math.max(8,left?x-30-w:x+30))}px,${Math.round(Math.max(8,y-el.offsetHeight/2))}px)`; }
const SAY={ '+':['Yum!','Peachy!','Nom nom!'], '-':['Whoa, smaller!','Shrinking!'], C:['Got it!','A flag!','Tagged!'], K:['A key!','Ooh, shiny!'], G:['Open sesame!'], pollen:['Achoo!','Tickles!','So fluffy!','Pretty colour!'] };
let sayN=0;
let sayLast=-99;
const sayFor=k=>{ const a=SAY[k]; if(!a||idleT-sayLast<40||Math.random()>.25) return null; sayLast=idleT; return a[sayN++%a.length]; };
function closeIntro(fromBack){ hide('introOv'); if(!fromBack) popLayer('intro'); const d=introDone; introDone=null; if(d) d(); }
$('introOk').onclick=introNext;

// ---------- first-time tutorial ----------
function maybeTutorial(){ if(store.get('squirm-tutorial')==='1'||mode!=='garden'||li!==0||history.length) return false; $('tutorial').classList.add('show'); return true; }
function dismissTutorial(){ const t=$('tutorial'); if(!t.classList.contains('show')) return; t.classList.remove('show'); store.set('squirm-tutorial','1'); }

// ---------- levels: starting a patch, and the garden map ----------
function loadLevel(i,withHint=true){ mode='garden'; li=i; startLevel(LEVELS[i],withHint); store.set('squirm-current-name',LEVELS[i].name); }
let nudged=false, playT=0;
const playTime=()=>{ const s=Math.round(playT); return s<60?`${s}s`:`${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`; };
let pollensHere=new Set();
function startLevel(def,withHint=true){ nudged=false; playT=0; pollensHere=new Set();
  L=def; state=initState(L); history=[]; queue.length=0; slideSteps.length=0; wasReady=false; hintsUsed=0; undosHere=0; clearHint(); $('wormSayG').hidden=true; gSayT=0;
  buildBoard(); snapWorm(); fitCamera(); updateHUD(true); hudIntro(); lastMoveT=idleT;
  const resumed=tryResume(); if(!resumed) clearResume();
  introAnim();
  if(resumed) toast('Picking up where you left off.',2400);
  else if(withHint){ const nm=newMechanics(); if(nm.length) setTimeout(()=>{ if(!$('homeOv').classList.contains('show')) showIntro(nm,()=>maybeTutorial()); },reduceMotion?0:900); else maybeTutorial(); }
  $('skipBtn').hidden = mode!=='endless' || !!L.daily;
}
function introAnim(){ if(reduceMotion) return;
  const items=[...snailMeshes,...beetleMeshes].map(s=>({o:s,d:.3,y0:s.position.y})); [...snailMeshes,...beetleMeshes].forEach(s=>s.scale.setScalar(.01)); for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y][x]; [c.tile,c.item].forEach((o,j)=>{ if(o){ items.push({o,d:(x+y)*.035+j*.08,y0:o.position.y}); o.scale.setScalar(.01); } }); }
  const worm=segMeshes.slice(); worm.forEach(s=>s.scale.setScalar(.01)); wormG.visible=false;
  const total=.55+(state.w+state.h)*.035+.35; animating++;
  const back=t=>{ const c1=1.70158, c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
  tween(total*1000,(e,k)=>{ const tt=k*total;
    items.forEach(it=>{ const t=Math.max(0,Math.min(1,(tt-it.d)/.4)); it.o.scale.setScalar(Math.max(.01,back(t))); it.o.position.y=it.y0-(1-t)*.5; });
    const wt=Math.max(0,Math.min(1,(tt-(total-.45))/.4)); wormG.visible=wt>0; worm.forEach(s=>s.scale.setScalar(Math.max(.01,back(wt)))); },
    ()=>{ items.forEach(it=>{ it.o.scale.setScalar(1); it.o.position.y=it.y0; }); worm.forEach(s=>s.scale.setScalar(1)); wormG.visible=true; animating--; if(queue.length) tryMove(queue.shift()); });
}
const CHAPTERS=CHAPTER_NAMES.map((name,k)=>({name,from:k*10,to:Math.min(LEVELS.length-1,k*10+9)}));
const THUMB_COL={'O':'#7C8CF0','B':'#F7A8C4','H':'#4E8F40','i':'#8EE0B4','<':'#C9A0E6','>':'#C9A0E6','^':'#C9A0E6','v':'#C9A0E6','.':'#B9E49E','x':'#EBD59C','~':'#8CCFEA','=':'#D9A56E','|':'#D9A56E','E':'#3A2A22','C':'#F27DA2','K':'#F7C64F','G':'#C88A55','+':'#FFA27C','-':'#B79CF2','R':'#C9D6EA','w':'#9ED6EF','s':'#7CC95F','L':'#B98352','P':'#FF7A6B','Y':'#FFC63A','U':'#63A9F2','p':'#FFC6BC','y':'#FFE9A6','u':'#C4E2FF','#':'#C99063'};
function drawThumb(cv,lv){ const g=cv.getContext('2d'); const h=lv.map.length, w=Math.max(...lv.map.map(r=>r.length)); const s=Math.floor(80/Math.max(w,h)), ox=(88-w*s)/2, oy=(88-h*s)/2;
  g.fillStyle='#9A6A4C'; g.fillRect(0,0,88,88);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const c=lv.map[y][x]||' '; if(c===' ') continue; g.fillStyle=THUMB_COL[c]||(c>='1'&&c<='9'?'#7FCFEA':'#B9E49E'); g.fillRect(ox+x*s+1,oy+y*s+1,s-2,s-2); }
  g.fillStyle='#FF8FAF'; lv.worm.forEach(p=>{ g.fillRect(ox+p[0]*s+2,oy+p[1]*s+2,s-4,s-4); }); }
// the garden map: one little scene per chapter, its patches stepping stones along a winding path
const SCENE_COL=['#CFEFB8','#FFD9C2','#E2D6FA','#FFE9A8','#CBE7F7','#FBD3E0','#D3EFD0','#F3DCC4','#CFE1F8','#F8D8EA','#D9F2C9','#FFD6DE','#C9EEDF','#FFE0C2','#FFF0A8','#D9DEFC','#E8F2C0','#F9D2BE','#FDE0EA','#EED9C4','#DCEFD6','#E6EDC8'];
const SCENE_DECO=[['sprout','flag'],['peach','mushroom'],['wheat','crack'],['key','sunflower'],['tunnel','sprout'],['drop','rain'],['bridge','drop'],['blossom','butterfly'],['tree','bee'],['daisy','leaf'],['snail','leaf'],['blossom','hedge'],['wetleaf','drop'],['balloon','bowtie'],['sunflower','stars'],['beetle','daisy'],['snail','beetle'],['moon','wheat'],['pollenY','butterfly'],['soil','sprout'],['pollenU','soil'],['tree','flag']];
// a few pebble outlines so the stepping stones don't all look stamped from one mould
const STONES=['48% 52% 46% 54% / 56% 50% 50% 44%','54% 46% 52% 48% / 48% 56% 44% 52%','46% 54% 50% 50% / 52% 46% 54% 48%','52% 48% 56% 44% / 50% 54% 46% 50%','50% 50% 44% 56% / 46% 52% 48% 54%'];
const LOCK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M8 10.5V8.2a4 4 0 0 1 8 0v2.3"/><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M12 14.6v2.2"/></svg>';
let picked=-1;
function renderLevelList(){
  const g=$('lvGrid'); g.innerHTML=''; const stars=i=>progress.stars[LEVELS[i].name]||0;
  let total=0; LEVELS.forEach((l,i)=>total+=stars(i)); $('lvTotal').innerHTML=`${STAR(true,0).replace('width="44" height="44"','width="20" height="20"')} ${total} of ${LEVELS.length*3}`;
  const grown=LEVELS.filter((l,i)=>isCleared(i)).length; $('lvBar').style.setProperty('--p',(100*grown/LEVELS.length).toFixed(1)+'%'); $('lvGrown').textContent=`${grown} of ${LEVELS.length} patches grown`;
  $('chStrip').innerHTML=CHAPTERS.map((ch,k)=>{ const n=ch.to-ch.from+1, open=isUnlocked(ch.from), hat=HATS.find(h=>h[2]===k); let c=0; for(let i=ch.from;i<=ch.to;i++) if(isCleared(i)) c++;
    return `<button class="ch-chip ${c===n?'done':''} ${open?'':'locked'}" role="tab" data-k="${k}" aria-label="Chapter ${k+1}, ${ch.name}, ${c} of ${n} grown"><span class="ring" style="--p:${(100*c/n).toFixed(1)}%"><span class="emb">${open&&hat?hatArt(hat[0],28):art(open?'sprout':'lock',open?24:20)}</span></span>${k+1}</button>`; }).join('');
  qa($('chStrip'),'.ch-chip').forEach(b=>b.onclick=()=>{ const sc=g.querySelector(`.scene[data-k="${b.dataset.k}"]`); if(!sc) return;
    g.scrollTo({top:g.scrollTop+sc.getBoundingClientRect().top-g.getBoundingClientRect().top-2,behavior:reduceMotion?'auto':'smooth'}); markChapter(+b.dataset.k); settle(b.querySelector('.ring')); });
  const RH=96, TOP=56; let shownLocked=false;
  CHAPTERS.forEach((ch,k)=>{ const n=ch.to-ch.from+1, open=isUnlocked(ch.from); let cs=0, allDone=true, fresh=ch.from>0&&open;
    for(let i=ch.from;i<=ch.to;i++){ cs+=stars(i); if(!isCleared(i)) allDone=false; else fresh=false; }
    const hat=HATS.find(h=>h[2]===k), sc=document.createElement('section'); sc.className='scene'+(open?'':' later'); sc.dataset.k=k; sc.style.setProperty('--scene',SCENE_COL[k%SCENE_COL.length]);
    const sub=!open?(shownLocked?'Locked':`Finish ${CHAPTERS[k-1].name} to open`):allDone?(hat?`${hat[1]} earned`:'All done'):(hat?`Reward: ${hat[1].toLowerCase()}`:`${n} patches`);
    sc.innerHTML=`<div class="ch-banner"><span class="emb" aria-hidden="true">${!open?art('lock',28):hat?hatArt(hat[0],34):art('sprout',30)}</span><span class="tt"><b>${ch.name}${fresh?' <small class="new">New</small>':''}</b><small>${sub}</small></span><span class="cnt">${allDone?`<span class="done" aria-label="Finished">${UI_ICON.check}</span>`:''}${open?STAR(true,0).replace('width="44" height="44"','width="18" height="18"')+`${cs}/${n*3}`:''}</span></div>`;
    g.appendChild(sc);
    // a chapter you can't reach yet is just its banner and a row of dots
    if(!open){ shownLocked=true; sc.insertAdjacentHTML('beforeend',`<div class="peek" aria-hidden="true">${'<i></i>'.repeat(n)}</div>`); return; }
    const tr=document.createElement('div'); tr.className='trail'; const H=TOP+(n-1)*RH+56; tr.style.height=H+'px'; sc.appendChild(tr);
    const pts=[]; for(let j=0;j<n;j++) pts.push([50+28*Math.sin(j*1.05+k*1.7),TOP+j*RH]);
    const pathTo=last=>pts.slice(0,last+1).map((p,j)=>j?`C${pts[j-1][0]},${pts[j-1][1]+RH/2} ${p[0]},${p[1]-RH/2} ${p[0]},${p[1]}`:`M${p[0]},${p[1]}`).join(' ');
    let walked=-1; for(let j=0;j<n;j++) if(isUnlocked(ch.from+j)) walked=j;
    tr.innerHTML=`<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="road" d="${pathTo(n-1)}"/><path class="edge" d="${pathTo(n-1)}"/>${walked>0?`<path class="walked" d="${pathTo(walked)}"/>`:''}</svg>`;
    // a few garden bits near the edges, away from the path
    const deco=SCENE_DECO[k%SCENE_DECO.length]; [1,4,7].forEach((j,q)=>{ const x=pts[j][0]; const d=document.createElement('span'); d.className='deco'; d.innerHTML=art(deco[q%2],26);
      d.style.left=(x<50?88:12)+'%'; d.style.top=(pts[j][1]+RH/2)+'px'; d.style.setProperty('--r',((j*37+k*11)%40-20)+'deg'); tr.appendChild(d); });
    for(let j=0;j<n;j++){ const i=ch.from+j, lv=LEVELS[i], st=stars(i), best=progress.best[lv.name], locked=!isUnlocked(i), [x,y]=pts[j];
      const b=document.createElement('button'); b.className='node'+(i===li?' cur':'')+(locked?' locked':isCleared(i)?' done':'')+(st===3?' gold':''); b.dataset.i=i;
      b.style.left=x+'%'; b.style.top=y+'px';
      b.setAttribute('aria-label',`Patch ${i+1}, ${lv.name}`+(locked?', locked':`, ${st} ${st===1?'star':'stars'}${best?`, best ${best}`:''}, par ${lv.par}`));
      b.style.setProperty('--shape',STONES[(i*7+3)%STONES.length]);
      b.innerHTML=(locked?LOCK_SVG:`${i+1}`)+(locked?'':`<em class="mini" aria-hidden="true">${[0,1,2].map(q=>`<i class="${q<st?'on':''}"></i>`).join('')}</em>`);
      // first tap picks the stone and shows its card; tapping it again (or Play) opens it
      b.onclick=()=>{ if(locked){ nope(b,`Finish patch ${i} first, then this one opens.`,2200); return; }
        if(picked===i){ playPicked(); return; } pickPatch(i,true); };
      tr.appendChild(b); } });
  // the end of the map: what's next once it's all grown, or a note that more is on the way
  const end=document.createElement('div'); end.className='map-end';
  end.innerHTML=allCleared()?`<span class="emb" aria-hidden="true">${art('crown',30)}</span><b>The whole garden is grown!</b><small>More patches are growing and will show up here by themselves.</small><button class="btn primary">What's next?</button>`
    :`<span aria-hidden="true">${art('sprout',30)}</span><b>More patches are growing</b><small>New ones will show up here by themselves when they're ready.</small>`;
  const eb=end.querySelector('button'); if(eb) eb.onclick=()=>showFinale(true); g.appendChild(end);
  pickPatch(isUnlocked(li)?li:0,false);
  setTimeout(()=>{ const c=g.querySelector('.node.sel'); if(c) c.scrollIntoView({block:'center'}); spyChapter(); },30);
}
// the chip of the chapter in view lights up, and the strip keeps it on screen
function markChapter(k){ qa($('chStrip'),'.ch-chip').forEach(b=>{ const on=+b.dataset.k===k; b.classList.toggle('on',on); b.setAttribute('aria-selected',String(on));
  if(on){ const st=$('chStrip'), l=b.offsetLeft-st.offsetLeft, want=l-(st.clientWidth-b.offsetWidth)/2; if(Math.abs(st.scrollLeft-want)>20) st.scrollTo({left:want,behavior:reduceMotion?'auto':'smooth'}); } }); }
let spyQ=false;
function spyChapter(){ const g=$('lvGrid'), top=g.getBoundingClientRect().top+60; let k=0; qa(g,'.scene').forEach(sc=>{ if(sc.getBoundingClientRect().top<=top) k=+sc.dataset.k; }); markChapter(k); }
$('lvGrid').addEventListener('scroll',()=>{ if(spyQ) return; spyQ=true; requestAnimationFrame(()=>{ spyQ=false; spyChapter(); }); },{passive:true});
function pickPatch(i,anim){ picked=i; const lv=LEVELS[i], st=progress.stars[lv.name]||0, best=progress.best[lv.name], ch=CHAPTERS.find(c=>i>=c.from&&i<=c.to);
  document.querySelectorAll('#lvGrid .node').forEach(n=>n.classList.toggle('sel',+n.dataset.i===i));
  const p=$('lvPick'); p.innerHTML=`<canvas class="thumb" width="88" height="88" aria-hidden="true"></canvas><span class="pt"><b>${i+1}. ${lv.name}</b><small><em class="mini" aria-hidden="true">${[0,1,2].map(q=>`<i class="${q<st?'on':''}"></i>`).join('')}</em>${best?`best ${best} · par ${lv.par}`:`par ${lv.par}`}</small><small>${ch?ch.name:''}<span class="mechs" aria-hidden="true">${Object.keys(MECH).filter(k=>k!=='basics'&&MECH[k].k.test(lv.map.join(''))).map(k=>MECH[k].i.replace(/width="40" height="40"/,'width="21" height="21"').replace(/stroke-width="[\d.]+"/,'stroke-width="2.2"')).join('')}</span></small></span><button class="go" aria-label="Play patch ${i+1}"><svg width="26" height="26" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg></button>`;
  drawThumb(p.querySelector('canvas'),lv); p.querySelector('.go').onclick=playPicked;
  if(anim){ settle(document.querySelector('#lvGrid .node.sel')); animOnce(p,'swap'); } }
function playPicked(){ if(picked<0) return; hideAll(); loadLevel(picked); enterGame(); }

// ---------- camera: tilted 3/4 view; the board sits between the header and the buttons ----------
const PITCH=56*Math.PI/180, TILT=0;
function camDir(yawDeg){ const y=yawDeg*Math.PI/180; return new THREE.Vector3(Math.sin(y)*Math.cos(PITCH),Math.sin(PITCH),Math.cos(y)*Math.cos(PITCH)); }
let camYaw=TILT; const basePos=new THREE.Vector3(), camOff=new THREE.Vector3(), camTgt=new THREE.Vector3();
function boardCorners(){ const pts=[];
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ if(state.grid[y][x]===' ') continue;
    for(const [ox,oz] of [[-1.3,-1.3],[1.3,-1.3],[-1.3,1.3],[1.3,1.3]]) for(const yy of [-.35,.9]) pts.push(wp(x+ox,y+oz,yy)); }
  return pts; }
function measure(yaw,d,pts,W,H){ camera.clearViewOffset(); camera.aspect=W/H; camera.updateProjectionMatrix();
  camera.position.copy(camDir(yaw)).multiplyScalar(d); camera.lookAt(0,0,0); camera.updateMatrixWorld();
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; const v=new THREE.Vector3();
  for(const p of pts){ v.copy(p).project(camera); const px=(v.x+1)/2*W, py=(1-v.y)/2*H; x0=Math.min(x0,px); x1=Math.max(x1,px); y0=Math.min(y0,py); y1=Math.max(y1,py); }
  return {x0,x1,y0,y1}; }
function fitFor(yaw,pts,W,H,availW,availH){ let lo=2, hi=120;
  for(let i=0;i<28;i++){ const mid=(lo+hi)/2, b=measure(yaw,mid,pts,W,H); if(b.x1-b.x0<=availW && b.y1-b.y0<=availH) hi=mid; else lo=mid; }
  return hi; }
// frame the board between the HUD's header and nav, or between `frame.top` and `frame.bot` (photo mode)
function fitCamera(refit,frame){
  const W=window.innerWidth, H=window.innerHeight; renderer.setSize(W,H,false);
  if(!state) return;
  if(!frame&&photoOn) frame=photoFrame();
  const top=frame?frame.top:document.querySelector('header').getBoundingClientRect().bottom+6;
  const bot=frame?frame.bot:document.querySelector('nav').getBoundingClientRect().top-6;
  const availW=W-16, availH=Math.max(120,bot-top); const pts=boardCorners();
  if(refit!==false){ const a=fitFor(TILT,pts,W,H,availW,availH), b=fitFor(90+TILT,pts,W,H,availW,availH); camYaw = b<a*0.95 ? 90+TILT : TILT; }
  const d=fitFor(camYaw,pts,W,H,availW,availH); const bb=measure(camYaw,d,pts,W,H);
  basePos.copy(camera.position);
  const offX=(bb.x0+bb.x1)/2-W/2, offY=(bb.y0+bb.y1)/2-(top+bot)/2;
  camera.setViewOffset(W,H,offX,offY,W,H); camera.updateProjectionMatrix();
  for(const row of cells) for(const c of row) if(c.item) faceCamera(c.item);
  if(refit!==false) placeTrees();
}
// move the camera to a new framing over a moment instead of jumping (basePos is where the frame loop puts it)
function glideCamera(frame){ const W=window.innerWidth, H=window.innerHeight, p0=basePos.clone(), v=camera.view, o0=v&&v.enabled?[v.offsetX,v.offsetY]:[0,0];
  fitCamera(false,frame); if(reduceMotion){ camLook.set(0,0,0); return; } const p1=basePos.clone(), o1=[camera.view.offsetX,camera.view.offsetY]; basePos.copy(p0);
  const l0=camLook.clone(); tween(700,(e,k)=>{ const t=ease(k); basePos.lerpVectors(p0,p1,t); camLook.copy(l0).multiplyScalar(1-t); camera.position.copy(basePos); camera.lookAt(camLook); camera.setViewOffset(W,H,o0[0]+(o1[0]-o0[0])*t,o0[1]+(o1[1]-o0[1])*t,W,H); camera.updateProjectionMatrix(); }); }
let resizeQueued=false;
window.addEventListener('resize',()=>{ if(resizeQueued) return; resizeQueued=true; requestAnimationFrame(()=>{ resizeQueued=false; fitCamera(); }); });

// ---------- input ----------
function screenVec(d){
  const h=state.segs[0]; const a=wp(h[0],h[1]).project(camera), b=wp(h[0]+d[0],h[1]+d[1]).project(camera);
  return new THREE.Vector2((b.x-a.x)*window.innerWidth,-(b.y-a.y)*window.innerHeight).normalize();
}
function dirFromScreen(dx,dy){
  const s=new THREE.Vector2(dx,dy).normalize(); let best=null,bd=-2;
  for(const k of ['N','S','W','E']){ const dd=screenVec(DIRS[k]).dot(s); if(dd>bd){bd=dd;best=k;} } return best;
}
// every press of a button or HUD tile plays one 'tap' with one light haptic, or the sfx named in its data-sfx
// ('none' when its handler picks the sound itself, maybe later). If the handler already played a sound or
// buzzed during this click, the press adds nothing, so no action ever sounds twice. The element is found in the
// capture phase, because some handlers re-render the very button that was pressed.
let pressEl=null;
document.addEventListener('click',e=>{ pressEl=e.target.closest?e.target.closest('button,[role=button]:not(canvas)'):null; fbNow.s=fbNow.b=false; },true);
document.addEventListener('click',()=>{ const el=pressEl; pressEl=null; if(!el||el.disabled) return; const k=el.dataset.sfx||'tap';
  if(k==='none'||fbNow.s||!SFX[k]) return; try{ SFX[k](); }catch(e){} if(!fbNow.b) buzz(HAPTIC[k]); });
const SWIPE=22, TAP=10; let gest=null;
const ignoreTarget=t=>t.closest && t.closest('button,.ov,.home,.dialog');
document.addEventListener('pointerdown',e=>{ ensureAudio(); if(e.button>0||ignoreTarget(e.target)) return;
  gest={x:e.clientX,y:e.clientY,id:e.pointerId,fired:false,onBoard:!e.target.closest('header,nav,#toast')}; },{passive:true});
// one swipe is one move; keep the finger down and every further stretch of drag is another move
const CHAIN=48;
document.addEventListener('pointermove',e=>{ if(!gest||e.pointerId!==gest.id) return;
  const dx=e.clientX-gest.x, dy=e.clientY-gest.y;
  if(Math.hypot(dx,dy)>=(gest.fired?CHAIN:SWIPE)){ gest.fired=true; gest.x=e.clientX; gest.y=e.clientY; tryMove(dirFromScreen(dx,dy)); } },{passive:true});
document.addEventListener('pointerup',e=>{ if(!gest||e.pointerId!==gest.id) return; ensureAudio();
  const dx=e.clientX-gest.x, dy=e.clientY-gest.y, dist=Math.hypot(dx,dy);
  if(!gest.fired){ if(dist>=TAP) tryMove(dirFromScreen(dx,dy)); else if(gest.onBoard) tapMove(e); }
  gest=null; },{passive:true});
document.addEventListener('pointercancel',()=>{ gest=null; });
document.addEventListener('touchmove',e=>{ if(!e.target.closest('.list,.home,.dialog')) e.preventDefault(); },{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());
const ray=new THREE.Raycaster(); const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function wormEmote(){ const h=segMeshes[0]; if(!h||animating||state.status!=='play') return; bumpStat('taps'); checkBadges(null); save(); react(EXPRS[Math.floor(Math.random()*EXPRS.length)],1200); lastMoveT=idleT;
  sfx('tap'); tone(660+Math.random()*300,.18,{type:'sine',vol:.08,slide:1.4}); buzz(10); const b=h.userData.body;
  if(!reduceMotion) tween(420,(e,k)=>{ const s=1+Math.sin(k*Math.PI)*.16; b.scale.set(s,1/s,s); b.rotation.z=Math.sin(k*Math.PI*3)*.25*(1-k); },()=>{ b.scale.set(1,1,1); b.rotation.z=0; }); }
function tapMove(e){
  const ndc=new THREE.Vector2((e.clientX/window.innerWidth)*2-1,-(e.clientY/window.innerHeight)*2+1); camera.updateMatrixWorld();
  ray.setFromCamera(ndc,camera); const p=new THREE.Vector3(); if(!ray.ray.intersectPlane(plane,p)) return; const h=state.segs[0];
  const gx=Math.round(p.x+(state.w-1)/2), gy=Math.round(p.z+(state.h-1)/2); const dx=gx-h[0], dy=gy-h[1];
  if(dx===0&&dy===0){ wormEmote(); return; }
  if(Math.abs(dx)+Math.abs(dy)!==1) return;
  tryMove(Object.keys(DIRS).find(k=>DIRS[k][0]===dx&&DIRS[k][1]===dy));
}
const KEYMAP={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
window.addEventListener('keydown',e=>{ if(e.ctrlKey||e.metaKey||e.altKey||(e.target&&/^(TEXTAREA|INPUT)$/.test(e.target.tagName))) return; ensureAudio();
  if(photoOn){ if(e.code==='Escape') window.history.back(); else if(e.code==='Enter'||e.code==='Space'){ e.preventDefault(); snapPhoto(); } else if(e.code==='KeyP') posePhoto(); else if(e.code==='KeyR') resetView(); else if(photoKeyPan(e.code)) e.preventDefault(); return; }
  if((e.code==='Enter'||e.code==='Space') && isOpen('winOv')){ e.preventDefault(); $('winNext').click(); return; }
  if(e.code==='KeyR' && isOpen('winOv')){ e.preventDefault(); $('winReplay').click(); return; }
  if(e.code==='Enter' && calmMoment() && curTab==='play' && (document.activeElement===document.body||!document.activeElement)){ e.preventDefault(); $('homePlay').click(); return; }
  if((e.code==='Enter'||e.code==='Space'||e.code==='ArrowRight') && isOpen('introOv')){ e.preventDefault(); introNext(); return; }
  if(KEYMAP[e.code] && !anyOverlay()){ e.preventDefault(); tryMove(dirFromScreen(...KEYMAP[e.code])); }
  else if((e.code==='KeyZ'||e.code==='Backspace'||e.code==='KeyU') && !anyOverlay()){ e.preventDefault(); undo(); }
  else if(e.code==='KeyR' && !anyOverlay()) restart();
  else if(e.code==='KeyH' && !anyOverlay()) showHint();
  else if(e.code==='KeyP' && !anyOverlay()) $('photoBtn').click();
  else if(e.code==='KeyM') toggleMute(anyOverlay()?null:$('muteBtn'));
  else if(e.code==='Escape'){ if(layers.length&&!generating) window.history.back(); }
});

// ---------- buttons ----------
// Undo: a tap takes back one move; holding it fills a ring around the button and then starts the patch over
let holdRAF=0, undoHeld=false;
const HOLD_WAIT=220, HOLD_MS=900;
function endHold(){ cancelAnimationFrame(holdRAF); holdRAF=0; const b=$('undoBtn'); b.classList.remove('holding'); b.style.removeProperty('--hold'); }
$('undoBtn').addEventListener('pointerdown',e=>{ if(e.button>0||!state||state.moves===0) return; undoHeld=false; endHold(); const t0=performance.now(), b=$('undoBtn');
  const tick=now=>{ const k=(now-t0-HOLD_WAIT)/HOLD_MS; if(k>0){ b.classList.add('holding'); b.style.setProperty('--hold',Math.min(1,k).toFixed(3)); }
    if(k>=1){ endHold(); undoHeld=true; buzz(30); restart(); return; } holdRAF=requestAnimationFrame(tick); };
  holdRAF=requestAnimationFrame(tick); });
['pointerup','pointerleave','pointercancel'].forEach(ev=>$('undoBtn').addEventListener(ev,endHold));
$('undoBtn').addEventListener('contextmenu',e=>e.preventDefault());
$('undoBtn').onclick=()=>{ if(undoHeld){ undoHeld=false; return; } undo(); }; $('hintBtn').onclick=showHint; $('tutorial').onclick=dismissTutorial; 
$('levelsBtn').onclick=()=>{ hideAll(); popLayer('game'); showHome(); };
$('skipBtn').onclick=()=>{ if(mode!=='endless'||animating) return; const e=progress.endless[endlessDiff]; e.streak=0; save(); clearResume(); toast('Skipped. Your streak starts over.',2000); newEndless(); };
$('winShare').onclick=async()=>{ try{ if(navigator.share){ await navigator.share({text:shareText}); return; } }catch(e){ return; }
  try{ await navigator.clipboard.writeText(shareText); toast('Result copied. Paste it anywhere.',2200); }catch(e){ toast(shareText,5000); } };
$('winReplay').onclick=()=>{ hideAll(); popLayer('win'); if(mode==='garden') loadLevel(li,false); else startLevel(L,false); };
$('winNext').onclick=()=>{ hideAll(); if(L.daily){ popLayer('game'); showHome(); return; }
  if(mode==='garden'&&li===LEVELS.length-1&&allCleared()){ swapLayers(layers.includes('game')?'game':'win','finale'); showHome(true); showFinale(false); return; } popLayer('win'); if(mode==='garden') loadLevel(li===LEVELS.length-1?0:li+1); else newEndless(); };
function toggleMute(el){ ensureAudio(); muted=!muted; if(el) settle(el); store.set('squirm-muted',muted?'1':'0'); renderMute(); if(state) syncWeather(false); sfx(muted?'off':'on'); }
$('muteBtn').onclick=()=>toggleMute($('muteBtn'));
renderMute();
function renderHaptic(){ const b=$('hapticBtn'); b.setAttribute('aria-pressed',String(hapticsOn)); b.setAttribute('aria-label',hapticsOn?'Turn vibration off':'Turn vibration on');
  b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7.5" y="4" width="9" height="16" rx="2.5"/>'+(hapticsOn?'<path d="M4 9v6M20 9v6M1.5 10.5v3M22.5 10.5v3"/>':'<path d="M3 3l18 18"/>')+'</svg>'; }
$('hapticBtn').onclick=()=>{ hapticsOn=!hapticsOn; store.set('squirm-haptics',hapticsOn?'1':'0'); renderHaptic(); sfx(hapticsOn?'on':'off'); };
renderHaptic();

// ---------- loop ----------
let drawn=false, last=performance.now(), last0=last, frameN=0, slowT=0, fastT=0, sampleT=0, raisedOnce=false;
// steps quality down when frames run under ~25 fps (a phone in low power mode capped at 30 fps is fine),
// and back up once frames are quick again, so one rough patch doesn't leave the garden blurry for good
function watchSpeed(ms){ if(ms>250||gfx!=='auto') return; sampleT+=ms; if(ms>40) slowT+=ms; if(ms<20) fastT+=ms;
  if(sampleT<4000) return; const slow=slowT/sampleT>.5, fast=fastT/sampleT>.9; sampleT=slowT=fastT=0;
  if(slow&&quality>0) setQuality(quality-1);
  else if(fast&&quality<2&&!raisedOnce){ raisedOnce=true; setQuality(quality+1); } }
function setQuality(q){ quality=q; store.set('squirm-quality',String(quality));
  renderer.setPixelRatio(pixelRatio()); sun.shadow.mapSize.setScalar(quality===2?2048:1024); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } fitCamera(false); }
function frame(now){
  const dt=Math.min(50,now-last); last=now; idleT+=dt/1000;
  for(let i=tweens.length-1;i>=0;i--){ const t=tweens[i]; if(!t) continue; t.t+=dt; const k=Math.min(1,t.t/t.dur); t.fn(ease(k),k); if(k>=1){ const j=tweens.indexOf(t); if(j>=0) tweens.splice(j,1); t.done&&t.done(); } }
  if(!reduceMotion){
    for(const row of cells) for(const c of row){ const it=c.item; if(!it) continue; const u=it.userData;
      if(u.bob){ u.bob.position.y=(u.bobBase||0)+Math.sin(idleT*2.4+it.position.x)*.05; if(u.noSpin){ if(u.keyBody) u.keyBody.rotation.z=Math.sin(idleT*1.8+it.position.z)*.25; } else u.bob.rotation.y+=dt*.0012; }
      if(u.swirl) u.swirl.rotation.z-=dt*.003;
      if(u.cloudMat) u.cloudMat.color.copy(cloudDry).lerp(cloudWet,wet); // greys over as the rain sets in
      if(u.drops&&u.drops.visible) u.drops.children.forEach(d=>{ const k=(idleT*1.4+d.userData.ph)%1; d.position.y=-.12-k*.3; d.material.opacity=1-k; d.material.transparent=true; });
      if(u.flag){ const wave=x=>{ x=Math.min(.42,Math.max(0,x)); return Math.sin(x*13-idleT*6)*.04*(x/.42); };
        for(const [mesh,b] of [[u.flag,u.flagBase],[u.flagLine,u.flagLineBase]]){ if(!mesh) continue; const pa=mesh.geometry.attributes.position;
          for(let v=0;v<pa.count;v++) pa.array[v*3+2]=wave(b[v*3]); pa.needsUpdate=true; } }
      if(u.rim){ const s=u.ready?1+Math.sin(idleT*5)*.07:1; u.rim.scale.set(s,s,.8*s); }
    }
    flyers.children.forEach((b,i)=>{ const u=b.userData, t=idleT*.35+u.ph;
      const x=u.c[0]+Math.cos(t)*u.R, z=u.c[1]+Math.sin(t*1.3)*u.R*.7, y=1.3+Math.sin(t*3)*.25;
      const nx=u.c[0]+Math.cos(t+.05)*u.R, nz=u.c[1]+Math.sin((t+.05)*1.3)*u.R*.7;
      b.position.set(x,y,z); b.rotation.y=Math.atan2(nx-x,nz-z);
      const sh=b.userData.shadow; if(sh){ const inBed=Math.abs(x-bedBox.cx)<bedBox.hw&&Math.abs(z-bedBox.cz)<bedBox.hd; const gx=Math.round(x+(state.w-1)/2), gz=Math.round(z+(state.h-1)/2), onTile=tileAt(state,gx,gz)!==' '; sh.position.set(x,onTile?.02:inBed?-.2:-.33,z); const k=1.15-(y-1.05)*.6; sh.scale.setScalar(k); sh.material.opacity=.55+.25*(1.55-y); }
      const f=Math.sin(idleT*22+i)*1.0; b.userData['w-1'].rotation.z=-f; b.userData['w1'].rotation.z=f; });
  }
  // a cloud floats above its stone and drifts up out of the way while the worm is under it
  if(state) for(const row of cells) for(const c of row){ const u=c.item&&c.item.userData; if(!u||!u.cloud) continue;
    const want=occupied(u.at[0],u.at[1])?1.12:.76; u.bobBase+=(want-u.bobBase)*(reduceMotion?1:1-Math.exp(-dt/1000*6)); if(reduceMotion) u.cloud.position.y=u.bobBase; }
  if(state&&state.status==='play'&&!anyOverlay()&&!document.hidden) playT+=dt/1000;
  if(!reduceMotion && state) for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y]&&cells[y][x]; if(!c||c.ch!=='x'||!c.tile) continue;
    const on=state.status==='play'&&occupied(x,y); c.tile.rotation.z=on?Math.sin(idleT*31+x*3+y)*.012:0; c.tile.rotation.x=on?Math.cos(idleT*27+x+y*2)*.012:0; }
  if(!nudged && state && state.status==='play' && state.moves>0 && idleT-lastMoveT>45 && !anyOverlay() && !document.body.classList.contains('at-home')){
    nudged=true; wormSays('Stuck? The bulb has ideas.',3200); pulse($('hintBtn')); }
  if(segMeshes[0]){ const hp=segMeshes[0].position; camTgt.set(THREE.MathUtils.clamp(hp.x*.06,-.35,.35),0,THREE.MathUtils.clamp(hp.z*.06,-.35,.35)); if(reduceMotion) camTgt.set(0,0,0);
    if(photoOn) camTgt.set(0,0,0); camOff.lerp(camTgt,1-Math.exp(-dt/1000*1.6)); camera.position.copy(basePos).add(camOff); }
  if(!reduceMotion){ fxTimer-=dt;
    if(fxTimer<0){ fxTimer=90;
      for(const row of cells) for(const c of row){ const u=c.item&&c.item.userData; if(u&&c.item.userData.kind==='K'&&Math.random()<.08) sparkle(c.item.position); }
      if(wet>.5) for(let i=0;i<3;i++) splash(); } }
  // wind: a steady sway with an occasional soft gust rolling through
  windU.value=idleT; gustU.value=reduceMotion?1:1+1.2*Math.pow(Math.max(0,Math.sin(idleT*.21)),4);
  for(const s of swayers){ const a=(s.amp||1)*.07; s.o.rotation.z=Math.sin(idleT*1.6+s.ph)*a; s.o.rotation.x=Math.cos(idleT*1.3+s.ph)*a*.5; }
  const hp0=segMeshes[0]&&segMeshes[0].position;
  updateBeetles(dt); updatePollen(dt);
  snailMeshes.forEach((s,i)=>{ let lean=0; if(hp0){ const a=Math.atan2(hp0.x-s.position.x,hp0.z-s.position.z)-s.rotation.y; lean=-Math.sin(a)*.35; }
    s.userData.eyes.forEach((e,j)=>{ e.rotation.z=(j?-.25:.25)+lean+Math.sin(idleT*3+i+j)*.08; }); });
  if(hintMesh){ hintMesh.children[0].position.y=Math.sin(idleT*5)*.08; hintMesh.rotation.y+=dt*.002; }
  flowH.offset.x-=dt*.00025; flowV.offset.x-=dt*.00025;
  if(!reduceMotion) for(const f of flowTiles){ f.w.position.y=-.19+Math.sin(idleT*1.8+f.ph)*.006;
    if(f.leaf){ const u=((idleT*.25+f.ph/6.28)%1+1)%1, a=-.5+u, k=Math.min(1,(.5-Math.abs(a))*6); f.leaf.position[f.along]=a; f.leaf.position[f.along==='x'?'z':'x']=Math.sin(idleT*1.3+f.ph)*.12;
      f.leaf.rotation.y=f.ph+idleT*.6; f.leaf.position.y=-.125+Math.sin(idleT*3+f.ph)*.008; f.leaf.scale.setScalar(Math.max(.01,k)); }
    { const t=(idleT*.45+f.ph*.37)%2.4; if(t<1.2){ const k=t/1.2; if(k<.05){ f.ripple.position.x=(Math.sin(f.ph*9+Math.floor(idleT*.45))*.25); f.ripple.position.z=(Math.cos(f.ph*7+Math.floor(idleT*.45))*.25); }
        f.ripple.visible=true; f.ripple.scale.setScalar(.6+k*1.6); f.rippleMat.opacity=.7*(1-k); } else f.ripple.visible=false; }
    for(const gl of f.glints){ const t=(idleT*.7+gl.userData.ph)%3, k=t<.6?Math.sin(t/.6*Math.PI):0; gl.visible=k>.02; gl.scale.set(k,.45*k,1); } }
  if(document.body.classList.contains('at-home')) renderHomeWorm(dt);
  updateHead(dt);
  if(gSayT>0){ gSayT-=dt/1000; if(gSayT<=0) $('wormSayG').hidden=true; else placeSay(); }
  updateRain(dt); ambient(dt); updateCritters(dt);
  updateWorm();
  // behind menus the garden is blurred, so a third of the frames is plenty
  const behind=anyOverlay(); frameN++;
  if(!isOpen('genOv') && (!behind || frameN%3===0)){ renderer.render(scene,camera); if(!drawn){ drawn=true; canvas.classList.add('ready'); } }
  if(!behind && !document.hidden) watchSpeed(now-last0);
  last0=now;
  if(!document.hidden) requestAnimationFrame(frame); else paused=true;
}
let paused=false; document.addEventListener('visibilitychange',()=>{ if(ac){ try{ document.hidden?ac.suspend():ac.resume(); }catch(e){} } if(!document.hidden&&paused){ paused=false; last=performance.now(); requestAnimationFrame(frame); } if(rainGain&&ac) rainGain.gain.setTargetAtTime(document.hidden?0:(state&&state.raining&&!muted?.07:0),ac.currentTime,.2); });

// ---------- unexpected errors: tell the player instead of failing silently ----------
let errorShown=false;
const onGameError=src=>{ if(errorShown||(src&&!String(src).startsWith(location.origin))) return; errorShown=true;
  try{ animating=0; queue.length=0; toast('Oops, the garden hiccupped. If something looks stuck, restart the patch.',4200); }catch(e){} };
window.addEventListener('error',e=>onGameError(e.filename));
window.addEventListener('unhandledrejection',()=>onGameError(null));

// ---------- anonymous stats: a few counters on GoatCounter, no cookies, nothing personal ----------
// The one network request the game makes on its own. Off until STATS_CODE names the GoatCounter site,
// on the live https site only (never localhost, so not in tests), and players can switch it off in
// Settings (squirm-stats, device-specific). A request that fails offline is simply lost.
const STATS_CODE='squirm';
const statsLive=()=>!!STATS_CODE && location.protocol==='https:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
const statsOn=()=>statsLive() && store.get('squirm-stats')!=='0';
// path: '/' for a visit, or an event name like 'clear/037' (events group by name on the dashboard)
function stat(path,event=true){ if(!statsOn()||navigator.onLine===false) return;
  const q=new URLSearchParams({p:path,t:event?path:'Squirm',r:event?'':document.referrer,s:`${screen.width},${screen.height},${devicePixelRatio||1}`,rnd:Math.random().toString(36).slice(2)});
  if(event) q.set('e','true');
  const url=`https://${STATS_CODE}.goatcounter.com/count?${q}`;
  try{ if(!(navigator.sendBeacon&&navigator.sendBeacon(url))) new Image().src=url; }catch(e){} }
const pad3=n=>String(n).padStart(3,'0');
function statsBoot(){ if(!statsOn()) return; stat('/',false);
  const app=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true; stat(app?'launch/app':'launch/browser');
  const v=NEWS[0][0]; if(store.get('squirm-stats-v')!==v){ store.set('squirm-stats-v',v); stat('version/'+v); } }
window.addEventListener('appinstalled',()=>stat('install'));

// ---------- offline play and install ----------
// A new deploy installs a new worker in the background. Installed apps are usually resumed rather
// than relaunched, so check for one whenever the app comes back to the foreground, and reload into
// the new version at a calm moment: right away on the home screen, otherwise on the way back home.
let updateReady=false;
const calmMoment=()=>$('homeOv').classList.contains('show') && !generating && !['winOv','genOv','introOv','resetOv','setOv','finOv'].some(isOpen);
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  const hadWorker=!!navigator.serviceWorker.controller; let controlled=hadWorker, reg=null;
  const check=()=>{ if(reg&&navigator.onLine!==false) reg.update().catch(()=>{}); };
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!controlled){ controlled=true; return; } // first install taking over, same version as this page
    if(updateReady) return; updateReady=true;
    if(calmMoment()) location.reload(); else toast('New patches arrived. They load when you head home.',4000); });
  navigator.serviceWorker.ready.then(()=>{ const told=store.get('squirm-offline-told')==='1'; store.set('squirm-offline-told','1');
    if(!told&&!hadWorker) setTimeout(()=>toast('Squirm is saved on this device. It plays offline too.',3200),1500); });
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{ reg=r; }).catch(()=>{}));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
  setInterval(check,30*60*1000); }
// ---------- daily reminder ----------
// No server, so no push. Where the browser supports it (Chrome on Android, installed), the service
// worker is woken now and then by periodic background sync and shows a notification if today's
// daily patch is still waiting. Elsewhere, if the app can badge its icon, it does that instead.
let remind=Object.assign({on:false,hour:9},store.json('squirm-remind'));
const remindKind=()=>{ if(!('Notification' in window)||!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol)) return 'none';
  if('PeriodicSyncManager' in window) return 'full'; return navigator.setAppBadge?'badge':'none'; };
function updateAppBadge(){ if(!navigator.setAppBadge) return;
  try{ (remind.on&&!progress.daily.results[todayKey()]?navigator.setAppBadge(1):navigator.clearAppBadge()).catch(()=>{}); }catch(e){} }
// the service worker can't read localStorage, so the page hands it what it needs through a cache
async function shareRemindState(){ updateAppBadge(); if(!('caches' in window)) return;
  try{ const c=await caches.open('squirm-state'), old=await c.match('reminder'), prev=old?await old.json():{};
    await c.put('reminder',new Response(JSON.stringify({...prev,on:remind.on,hour:remind.hour,done:progress.daily.last,streak:progress.daily.streak}),{headers:{'content-type':'application/json'}})); }catch(e){} }
function saveRemind(){ store.set('squirm-remind',JSON.stringify(remind)); shareRemindState(); renderRemind(); }
function renderRemind(){ const k=remindKind(), on=remind.on&&k!=='none';
  $('setRemind').setAttribute('aria-checked',String(on)); $('setRemind').disabled=k==='none';
  $('remindWhen').hidden=k!=='full'||!on;
  $('setRemindAt').querySelectorAll('button').forEach(b=>{ const s=+b.dataset.h===remind.hour; b.classList.toggle('on',s); b.setAttribute('aria-checked',String(s)); });
  $('remindNote').textContent = k==='none' ? "This browser can't send reminders from Squirm. Install Squirm with Chrome on Android and they'll work."
    : k==='badge' ? "This device can't send Squirm reminders on its own. Instead, Squirm puts a dot on its icon when you leave with today's patch still waiting."
    : on ? "Once a day, after the time you pick, Squirm sends a gentle nudge if today's patch is still waiting. Your phone picks the exact moment, so it may come a little later."
    : "Get a gentle nudge when a fresh daily patch is waiting for you."; }
$('setRemind').onclick=async()=>{ const k=remindKind(); if(k==='none') return;
  if(remind.on){ remind.on=false; saveRemind(); sfx('off'); try{ const reg=await navigator.serviceWorker.ready; if(reg.periodicSync) await reg.periodicSync.unregister('squirm-daily'); }catch(e){} return; }
  let perm=Notification.permission; if(perm==='default'){ try{ perm=await Notification.requestPermission(); }catch(e){} }
  if(perm!=='granted'){ nope($('setRemind'),'Notifications are turned off for Squirm. You can allow them in your browser settings.',3600); renderRemind(); return; }
  if(k==='full'){ try{ const reg=await navigator.serviceWorker.ready;
      const st=await navigator.permissions.query({name:'periodic-background-sync'}).catch(()=>null);
      if(st&&st.state!=='granted') throw new Error('not installed');
      await reg.periodicSync.register('squirm-daily',{minInterval:4*3600*1000}); }
    catch(e){ nope($('setRemind'),'Add Squirm to your home screen first, then turn reminders on there.',3600); renderRemind(); return; } }
  remind.on=true; saveRemind(); sfx('on'); };
$('setRemindAt').querySelectorAll('button').forEach(b=>b.onclick=()=>{ remind.hour=+b.dataset.h; saveRemind(); settle(b); });
if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',e=>{ if(e.data==='squirm-daily'&&calmMoment()) $('dailyBtn').onclick(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden) updateAppBadge(); });
// keep the worker's copy in step (it also hears about a secret reset this way)
if(remindKind()!=='none'){ shareRemindState(); if(!remind.on) navigator.serviceWorker.ready.then(r=>r.periodicSync&&r.periodicSync.unregister('squirm-daily')).catch(()=>{}); }

let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; $('installBtn').hidden=false; });
window.addEventListener('appinstalled',()=>{ installEvt=null; $('installBtn').hidden=true; });
$('installBtn').onclick=async()=>{ const e=installEvt; if(!e) return; installEvt=null; $('installBtn').hidden=true; try{ await e.prompt(); }catch(err){} };

// ---------- boot ----------
qa(document,'.fade-scroll').forEach(fadeScroll);
document.querySelectorAll('[data-art]').forEach(e=>e.insertAdjacentHTML('afterbegin',art(e.dataset.art,+e.dataset.size||24)));
// upload the shared effect textures once up front: otherwise each one is first sent to the GPU
// whenever its effect first happens (a random sparkle, a snore), which shows up as a tiny hitch
const warmTextures=()=>{ for(const t of [gradTex,glowTex,sparkTex,turfTex,crackTex,swirlTex,lawnTex,flowH,flowV,blobTex,zTex,slimeTex]) try{ renderer.initTexture(t); }catch(e){} };
const start=()=>{ const i=currentGardenIndex();
  { const dk=todayKey(); if(progress.lastDay!==dk){ progress.lastDay=dk; bumpStat('days'); save(); } } warmTextures(); applyWormColour(); checkBadges(null,true); pickTod(); setInterval(pickTod,60000); setTimeout(statsBoot,2000);
  mode='garden'; li=i; showHome(true);
  // the home screen is already up; the garden and the home worm are built on the next frame and fade in
  requestAnimationFrame(()=>{ startLevel(LEVELS[i],false); initHomeWorm(); requestAnimationFrame(frame);
    if(new URLSearchParams(location.search).get('play')==='daily'){ try{ window.history.replaceState(null,'',location.pathname); }catch(e){} $('dailyBtn').onclick(); } }); };
(document.fonts&&document.fonts.ready? document.fonts.ready : Promise.resolve()).then(start);
})();
