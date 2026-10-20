(function(){

const motionQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let reduceMotion = !!(motionQuery && motionQuery.matches);
if(motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change',e=>{ reduceMotion=e.matches; });
const C = {
  turf1:0xB9E49E, turf2:0xAADB8E, dry:0xEBD59C, soil:0x9A6A4C, soilDark:0x7E543B, wood:0xD29A62, lawn:0x8CC673,
  head:0xFFB0C6, riverWater:0x8CCFEA, plank:0xD9A56E, plankDark:0xB98352, leafBig:0x7CC95F, water:0x9ED6EF, mud:0x8A5E43, cloud:0xFFFFFF, rainCloud:0xAEBBD2, eye:0xFFFFFF, pupil:0x3B2A22, cheek:0xFF6F96,
  peach:0xFFA27C, leaf:0x6CC97A, cap:0xB79CF2, stem:0xFFF1DE, key:0xF7C64F, gateWood:0xC88A55,
  flag:0xF27DA2, flagDone:0x79C95F, pole:0xB98A62,
  straw:0xF3D18A, strawDark:0xD9B166, acornCap:0x8A5A36, acornNut:0xC98E52, partyA:0x9FD2F2, partyB:0xFFF1A8, crown:0xF5C14E, beret:0xB79CF2,
  wetLeaf:0x8EE0B4, leafVein:0x5DBA8A, dew:0xEAF8FF, hedge:0x5FA64F, hedgeDark:0x4E8F40, petalB:0xF7A8C4,
  burrow:0x3A2A22, mound:0xB07B57, ready:0x8EDB72, line:0x5B4436,
  portal:{ '1':0x7FCFEA, '2':0xC69CF7, '3':0xFFB877, '4':0x9BE39B }
};
// ---------- three setup ----------
const canvas=document.getElementById('c'), stage=document.getElementById('stage');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true}); }catch(e){ document.getElementById('noGL').classList.add('show'); return; }
// quality 2 = full, 1 = lighter shadows, 0 = also lower resolution; drops automatically on slow devices
let quality=2; try{ const q=parseInt(localStorage.getItem('squirm-quality'),10); if(q>=0&&q<=2) quality=q; }catch(e){}
const pixelRatio=()=>Math.min(window.devicePixelRatio||1,quality===2?1.75:quality===1?1.5:1);
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
function outline(mesh,t=.028,r){ if(!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  const rad=r||mesh.geometry.boundingSphere.radius; const o=new THREE.Mesh(mesh.geometry,lineMat); o.scale.setScalar(1+t/rad); mesh.add(o); return o; }
function outlineBox(mesh,t,w,h,d){ const o=new THREE.Mesh(mesh.geometry,lineMat); o.scale.set(1+2*t/w,1+2*t/h,1+2*t/d); mesh.add(o); return o; }
// sphere geometries are cached by size; radii are rounded so random scenery sizes don't grow the cache forever
const GC={}; const sph=(r,ws=28,hs=20)=>{ r=Math.round(r*100)/100; const k=r+'_'+ws+'_'+hs; return GC[k]||(GC[k]=new THREE.SphereGeometry(r,ws,hs)); };

// ---------- audio ----------
const AC=window.AudioContext||window.webkitAudioContext; let ac=null, master=null, muted=false;
try{ muted=localStorage.getItem('squirm-muted')==='1'; }catch(e){}
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
  tap:()=>{ tone(880,.05,{type:'triangle',vol:.07,slide:1.2}); },
  win:()=>{ [523,659,784,1046].forEach((f,i)=>tone(f,.28,{type:'triangle',vol:.14,delay:i*.11})); tone(1318,.6,{vol:.1,delay:.46}); tone(1568,.7,{vol:.08,delay:.5}); },
  ready:()=>{ tone(880,.15,{vol:.08}); tone(1320,.25,{vol:.07,delay:.08}); },
  slide:()=>{ noise(.16,{freq:2600,slide:.5,vol:.05,q:1.5}); tone(620,.14,{type:'sine',vol:.05,slide:1.4}); },
  hedgeOpen:()=>{ noise(.3,{freq:900,vol:.09,q:1.2,slide:.5}); tone(392,.2,{type:'triangle',vol:.06,slide:.8}); },
  hedgeClose:()=>{ noise(.26,{freq:500,vol:.08,q:1.2,slide:1.6}); tone(294,.18,{type:'triangle',vol:.05,slide:1.2}); },
  snail:()=>{ tone(330,.14,{type:'sine',vol:.05,slide:.75}); tone(250,.12,{type:'sine',vol:.035,slide:.8,delay:.08}); },
};
// ---------- music: a slow generated tune that follows the time of day and the rain ----------
let musicOn=true, musicVol=.7; try{ musicOn=localStorage.getItem('squirm-music')!=='0'; const v=parseFloat(localStorage.getItem('squirm-music-vol')); if(v>=0&&v<=1) musicVol=v; }catch(e){}
let mBus=null, mLp=null, mNext=0, mBeat=0, mDeg=2;
const SCALES={major:[0,2,4,7,9],minor:[0,3,5,7,10]};
const PROG={major:[[0,4,7],[-3,0,4],[5,9,12],[7,11,14]],minor:[[0,3,7],[-4,0,3],[3,7,10],[-2,2,5]]};
const MOODS={morning:{root:62,scale:'major',bpm:76,bright:2600,prob:.6,wave:'sine'},day:{root:60,scale:'major',bpm:80,bright:3000,prob:.55,wave:'triangle'},
  evening:{root:57,scale:'major',bpm:68,bright:1900,prob:.45,wave:'triangle'},night:{root:57,scale:'minor',bpm:60,bright:1400,prob:.35,wave:'sine'}};
const midiHz=n=>440*Math.pow(2,(n-69)/12);
function musicSetup(){ if(!ac||mBus) return; mBus=ac.createGain(); mBus.gain.value=0; mLp=ac.createBiquadFilter(); mLp.type='lowpass'; mLp.frequency.value=2600;
  const echo=ac.createDelay(1), fb=ac.createGain(), wet=ac.createGain(); echo.delayTime.value=.42; fb.gain.value=.3; wet.gain.value=.26;
  mBus.connect(mLp); mBus.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(mLp); mLp.connect(master); }
function mNote(hz,t,dur,vol,wave,attack){ const o=ac.createOscillator(), g=ac.createGain(); o.type=wave; o.frequency.value=hz;
  g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(mBus); o.start(t); o.stop(t+dur+.05); }
function musicTick(){ if(!ac||!mBus) return; const want=musicOn&&!muted&&!document.hidden&&ac.state==='running';
  mBus.gain.setTargetAtTime(want?1.4*musicVol:0,ac.currentTime,.3); if(!want){ mNext=0; return; }
  const md=MOODS[todName]||MOODS.day, rain=!!(state&&state.raining), spb=60/(md.bpm*(rain?.85:1)), sc=SCALES[md.scale];
  mLp.frequency.setTargetAtTime(rain?md.bright*.6:md.bright,ac.currentTime,1);
  if(mNext<ac.currentTime) mNext=ac.currentTime+.15;
  while(mNext<ac.currentTime+.6){ const t=mNext, beat=mBeat%4, chord=PROG[md.scale][Math.floor(mBeat/4)%4];
    if(beat===0){ chord.forEach(s=>mNote(midiHz(md.root-12+s),t,spb*4.3,.06,'sine',.6)); mNote(midiHz(md.root-24+chord[0]),t,spb*3.2,.11,'triangle',.04); }
    if(Math.random()<md.prob*(rain?.6:1)){ mDeg=Math.max(0,Math.min(sc.length*2-1,mDeg+[-2,-1,-1,1,1,2][Math.floor(Math.random()*6)]));
      const semi=sc[mDeg%sc.length]+12*Math.floor(mDeg/sc.length); mNote(midiHz(md.root+semi),t+(Math.random()<.25?spb/2:0),spb*1.7,.1,md.wave,.02); }
    mBeat++; mNext+=spb; } }
setInterval(musicTick,200);
let hapticsOn=true; try{ hapticsOn=localStorage.getItem('squirm-haptics')!=='0'; }catch(e){}
const HAPTIC={move:8,grow:[10,30,14],shrink:[14,30,10],key:[8,25,8,25,12],gate:22,flag:[12,40,16],portal:[10,30,24],crumble:28,bump:[14,30,14],stuck:[40,70,40],undo:6,
  tap:5,badge:[15,40,15,40,30],win:[30,60,30,60,90],ready:[10,40,10],slide:6,hedgeOpen:[12,30,12],hedgeClose:14,rainOn:[30,50,15],creak:[20,40,20,40,20],rainOff:[15,50,30]};
const iosHaptic=(()=>{ try{ const l=document.createElement('label'); l.setAttribute('aria-hidden','true'); l.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const i=document.createElement('input'); i.type='checkbox'; i.setAttribute('switch',''); i.tabIndex=-1; l.appendChild(i); document.body.appendChild(l); return l; }catch(e){ return null; } })();
function buzz(p){ if(!hapticsOn||p==null) return;
  try{ if(navigator.vibrate){ navigator.vibrate(p); return; }
    if(iosHaptic){ const n=Array.isArray(p)?Math.ceil(p.length/2):1; for(let i=0;i<n;i++) setTimeout(()=>iosHaptic.click(),i*110); } }catch(e){} }
let birdT=8;
function ambient(dt){ birdT-=dt/1000; if(birdT>0) return; birdT=7+Math.random()*9; if(!ac||muted||!state||state.raining||document.hidden) return;
  const base=2200+Math.random()*900, n=2+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){ tone(base*(1+(i%2)*.12),.09,{vol:.025,slide:1.25,delay:i*.12}); }
  if(Math.random()<.4) for(let i=0;i<2;i++) tone(base*.8,.12,{vol:.02,slide:.85,delay:.6+i*.15}); }
const sfx=(k,...a)=>{ try{ SFX[k](...a); }catch(e){} buzz(HAPTIC[k]); };

// ---------- state ----------
let mode='garden', endlessDiff='medium', li=0, L=null, state=null, history=[], cells=[], segMeshes=[];
let animating=0, queue=[], headDir=[1,0], idleT=0, lastMoveT=0, wasReady=false;
let progress={v:2,best:{},stars:{}};
try{ const p=JSON.parse(localStorage.getItem('squirm-progress')||'null'); if(p&&p.best) progress=Object.assign(progress,p); }catch(e){}
const isCleared=i=>progress.best[LEVELS[i].name]!=null;
const isUnlocked=i=>i===0||isCleared(i)||isCleared(i-1);
function currentGardenIndex(){ let n=null; try{ n=localStorage.getItem('squirm-current-name'); }catch(e){} const i=LEVELS.findIndex(l=>l.name===n); return i>=0&&isUnlocked(i)?i:0; }
progress.endless=progress.endless||{}; ['easy','medium','hard'].forEach(d=>{ progress.endless[d]=Object.assign({cleared:0,streak:0,best:0,stars:0},progress.endless[d]||{}); });
let endlessOpts={flags:true,fruit:true,keys:true,portals:false,dry:true,rain:false,rivers:false};
try{ const o=JSON.parse(localStorage.getItem('squirm-endless-opts')||'null'); if(o){ Object.assign(endlessOpts,o.opts||{}); if(o.diff) endlessDiff=o.diff; } }catch(e){}
const curPar=()=> L.par;
function askPersist(){ try{ const st=navigator.storage; if(st&&st.persist) st.persisted().then(p=>p||st.persist()).catch(()=>{}); }catch(e){} }
const save=()=>{ try{ localStorage.setItem('squirm-progress',JSON.stringify(progress)); }catch(e){} };
function wp(x,y,yy=0){ return new THREE.Vector3(x-(state.w-1)/2, yy, y-(state.h-1)/2); }
function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// ---------- geometry helpers ----------
function rrShape(w,d,r){ const s=new THREE.Shape(), x=-w/2, y=-d/2;
  s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+d-r); s.quadraticCurveTo(x+w,y+d,x+w-r,y+d);
  s.lineTo(x+r,y+d); s.quadraticCurveTo(x,y+d,x,y+d-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s; }
function slab(w,d,r,h,b){ const g=new THREE.ExtrudeGeometry(rrShape(w-2*b,d-2*b,r),{depth:Math.max(.01,h-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:5,curveSegments:8});
  g.rotateX(-Math.PI/2); g.center(); g.computeVertexNormals(); return g; }
const TURF=slab(.94,.94,.16,.3,.08);
const turfTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,128,128);
  for(let i=0;i<260;i++){ const x=Math.random()*128,y=Math.random()*128; g.fillStyle=Math.random()<.5?'rgba(80,140,60,.16)':'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x,y,1.2+Math.random()*1.6,3+Math.random()*3,Math.random()*3,0,Math.PI*2); g.fill(); }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1.6,1.6); return t; })();
MC.turf1=toon(C.turf1,{map:turfTex}); MC.turf2=toon(C.turf2,{map:turfTex});
const crackTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d');
  g.strokeStyle='rgba(150,110,70,.85)'; g.lineWidth=5; g.lineCap='round'; g.lineJoin='round';
  g.beginPath(); g.moveTo(18,36); g.lineTo(50,56); g.lineTo(62,90); g.lineTo(98,108); g.moveTo(50,56); g.lineTo(90,42); g.lineTo(110,22); g.moveTo(62,90); g.lineTo(30,106); g.stroke();
  return new THREE.CanvasTexture(cv); })();
const swirlTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d');
  g.translate(64,64); g.strokeStyle='rgba(255,255,255,.95)'; g.lineWidth=7; g.lineCap='round';
  for(let a=0;a<3;a++){ g.beginPath(); for(let t=0;t<1;t+=.02){ const r=6+t*52, an=a*2.094+t*4.2; const px=Math.cos(an)*r, py=Math.sin(an)*r; t?g.lineTo(px,py):g.moveTo(px,py);} g.stroke(); }
  return new THREE.CanvasTexture(cv); })();
const lawnTex=(()=>{ const cv=document.createElement('canvas'); cv.width=64; cv.height=8; const g=cv.getContext('2d');
  g.fillStyle='#8CC673'; g.fillRect(0,0,64,8); g.fillStyle='#84BF6B'; g.fillRect(32,0,32,8);
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(60,60); return t; })();

// ---------- garden scenery ----------
const lawnMat=toon(0xffffff,{map:lawnTex});
const PETAL=[0xF57FA4,0xFFB05E,0xB89CF5,0xFFD95A,0xFF8C8C];
function tulip(r,col){ const g=new THREE.Group(); const h=.22+r()*.12;
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,h,8),m('leaf')); st.position.y=h/2; g.add(st);
  const lf=new THREE.Mesh(sph(.07,14,10),m('leaf')); lf.scale.set(.5,1.4,.25); lf.position.set(.05,.08,0); lf.rotation.z=-.5; g.add(lf);
  const cup=new THREE.Mesh(sph(.075,18,14),toon(col)); cup.scale.set(1,1.25,1); cup.position.y=h+.05; outline(cup,.018); cup.castShadow=true; g.add(cup);
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
function placeTrees(){ disposeTree(trees); trees.clear(); if(!state) return; const r=rng((mode==='garden'?li*31+7:(L.seed|0))+99);
  const yaw=camYaw*Math.PI/180, fx=Math.sin(yaw), fz=Math.cos(yaw), sx=Math.cos(yaw), sz=-Math.sin(yaw);
  const hw=(camYaw%180===0?state.w:state.h)/2+1.4, hd=(camYaw%180===0?state.h:state.w)/2+1.4;
  for(let t=0;t<(quality===0?9:16);t++){ let side,along;
    if(r()<.55){ side=(r()-.5)*2*(hw+4); along=-(hd+1.3+r()*4); } else { side=(r()<.5?-1:1)*(hw+1.3+r()*3); along=-hd-3+r()*(hd*1.4+3); }
    const x=sx*side+fx*along, z=sz*side+fz*along;
    const big=r()<.55; const o= big? tree(r,.8+r()*.5) : bush(r,1.2+r()*.9); o.position.set(x,-.34,z); o.rotation.y=r()*6; trees.add(o); swayers.push({o,ph:r()*6,amp:big?.12:.025}); }
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
const blobTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const c=cv.getContext('2d'); const gr=c.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(40,30,25,.32)'); gr.addColorStop(1,'rgba(40,30,25,0)'); c.fillStyle=gr; c.fillRect(0,0,64,64); return new THREE.CanvasTexture(cv); })();
let flyShadows=[], bedBox={cx:0,cz:0,hw:1,hd:1};
function buildGarden(){ swayers=[];
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
  // plants in the soil wherever the worm cannot go
  for(let y=Math.floor(y0-.0);y<=y1;y++) for(let x=x0;x<=x1;x++){ if(state.grid[y][x]!==' ') continue; const roll=r(); if(roll<.22) continue;
    const p=roll<.5?tulip(r,PETAL[Math.floor(r()*PETAL.length)]):roll<.7?daisy(r):roll<.85?sprout(r):pebbles(r);
    const pos=wp(x,y,-.22); p.position.set(pos.x+(r()-.5)*.22,-.22,pos.z+(r()-.5)*.22); p.rotation.y=r()*6; p.scale.setScalar(1.5); shade(p); if(roll<.85) swayers.push({o:p,ph:r()*6}); garden.add(p);
    if(roll>=.22 && roll<.5 && r()>.4){ const q=tulip(r,PETAL[Math.floor(r()*PETAL.length)]); q.position.set(pos.x+(r()-.5)*.3,-.22,pos.z+(r()-.5)*.3); q.scale.setScalar(1.3); shade(q); swayers.push({o:q,ph:r()*6}); garden.add(q); } }
  // a loose hedge of bushes hugging the bed's wooden border
  const lite=quality===0;
  for(let i=0;i<(lite?8:14);i++){ const t=r(); const side=Math.floor(r()*4); const hx=bw/2+.75, hz=bd/2+.75; let x,z;
    if(side<2){ x=cx+(t-.5)*bw; z=cz+(side?hz:-hz); } else { z=cz+(t-.5)*bd; x=cx+(side===2?hx:-hx); }
    const b=bush(r,.8+r()*.5); b.position.set(x,-.34,z); shade(b); swayers.push({o:b,ph:r()*6,amp:.02}); garden.add(b); }
  // lawn scenery around the bed
  const R=Math.max(bw,bd)/2;
  for(let i=0;i<(lite?24:54);i++){ const a=r()*Math.PI*2, d=R+1+r()*6; const x=cx+Math.cos(a)*d*(bw/Math.max(bw,bd)+.2), z=cz+Math.sin(a)*d*(bd/Math.max(bw,bd)+.2);
    if(Math.abs(x-cx)<bw/2+.6 && Math.abs(z-cz)<bd/2+.6) continue;
    const k=r(); const o = k<.35? bush(r,1+r()*.8) : k<.75? (r()>.5?tulip(r,PETAL[Math.floor(r()*PETAL.length)]):daisy(r,r()>.6?0xFFE27A:0xFFFFFF)) : pebbles(r);
    o.position.set(x,-.34,z); o.rotation.y=r()*6; shade(o); if(k<.75) swayers.push({o,ph:r()*6,amp:k<.35?.025:1}); if(k>=.35&&k<.75) o.scale.setScalar(2.1); else if(k>=.75) o.scale.setScalar(1.6); garden.add(o); }
  const s=Math.max(bw,bd)*.75+2;
  Object.assign(sun.shadow.camera,{left:-s,right:s,top:s,bottom:-s,near:.5,far:40}); sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(cx,0,cz); sun.position.set(cx-4,10,cz+5);
  // butterflies
  disposeTree(flyers); flyers.clear(); flyShadows.forEach(o=>{ disposeTree(o); removeObj(o); }); flyShadows=[]; bedBox={cx,cz,hw:bw/2,hd:bd/2}; for(let i=0;i<2;i++){ const b=new THREE.Group(); const col=[0xFFB3C9,0xFFE07A][i];
    const body=new THREE.Mesh(sph(.025,10,8),m('pupil')); body.scale.set(1,1,3); b.add(body);
    for(const sd of [-1,1]){ const piv=new THREE.Group(); const w=new THREE.Mesh(new THREE.CircleGeometry(.09,16),toon(col,{side:THREE.DoubleSide})); w.position.x=sd*.08; w.scale.set(1,1.3,1); w.rotation.x=-Math.PI/2; piv.add(w); b.add(piv); b.userData['w'+sd]=piv; }
    b.userData.ph=r()*10; b.userData.c=[cx,cz]; b.userData.R=R*.8+.5; flyers.add(b);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(.32,.32),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false})); sh.rotation.x=-Math.PI/2; scene.add(sh); flyShadows.push(sh); b.userData.shadow=sh; }
}

// ---------- tiles and items ----------
const flowTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,64,64);
  g.strokeStyle='rgba(255,255,255,1)'; g.fillStyle='rgba(120,190,220,.18)'; for(let i=0;i<3;i++){ g.fillRect(0,i*21+8,64,2); }
  g.strokeStyle='rgba(255,255,255,.95)'; g.lineWidth=2.5; g.lineCap='round'; for(let i=0;i<5;i++){ const y=Math.random()*64,x=Math.random()*64; g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+6,y-3,x+12,y); g.stroke(); }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; })();
const flowH=flowTex, flowV=flowTex.clone(); flowV.needsUpdate=true; flowV.center.set(.5,.5); flowV.rotation=Math.PI/2;
const waterMatH=toon(C.riverWater,{map:flowH}), waterMatV=toon(C.riverWater,{map:flowV});
const WATER=slab(1.02,1.02,.05,.1,.02);
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
function numberTex(n){ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d');
  g.fillStyle='#FFF8EA'; g.beginPath(); g.arc(64,64,52,0,Math.PI*2); g.fill(); g.lineWidth=7; g.strokeStyle='#5B4436'; g.stroke();
  g.fillStyle='#5B4436'; g.font='800 70px Grandstander, Nunito, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(n),64,70);
  return new THREE.CanvasTexture(cv); }
function faceCamera(o){ const yaw=(typeof camYaw==='number'?camYaw:0)*Math.PI/180; if(o.userData.faceCam){ o.rotation.y=yaw; if(o.userData.lean){ o.rotation.order='YXZ'; o.rotation.x=o.userData.lean; } } if(o.userData.signs) o.userData.signs.forEach(s=>{ s.rotation.y=yaw-o.rotation.y; s.position.set(-Math.sin(yaw)*.36+Math.cos(yaw)*.26,0,-Math.cos(yaw)*.36-Math.sin(yaw)*.26); }); }
function numberSprite(n){
  const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d');
  g.fillStyle='#5B4436'; g.beginPath(); g.arc(64,64,58,0,Math.PI*2); g.fill();
  g.fillStyle='#FFF8EA'; g.beginPath(); g.arc(64,64,50,0,Math.PI*2); g.fill();
  g.fillStyle='#5B4436'; g.font='800 70px Grandstander, Nunito, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(n),64,70);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),depthWrite:false})); s.scale.set(.46,.46,1); return s;
}
function mk(geo,mt,parent,pos,ol=.022){ const o=new THREE.Mesh(geo,mt); if(pos) o.position.set(...pos); o.castShadow=true; if(ol) outline(o,ol); parent.add(o); return o; }
function makeItem(x,y,ch){
  const g=new THREE.Group(); g.position.copy(wp(x,y)); g.userData.kind=ch;
  if(ch==='+'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b;
    const f=mk(sph(.2,28,20),m('peach'),b,[0,.3,0]); f.scale.set(1,.92,1);
    mk(new THREE.CylinderGeometry(.018,.022,.1,8),toon(0x8A5A3C),b,[0,.52,0],0);
    const lf=mk(sph(.09,16,10),m('leaf'),b,[.08,.53,0],.016); lf.scale.set(1,.35,.6); lf.rotation.z=-.5;
    const lf2=mk(sph(.07,16,10),m('leaf'),b,[-.06,.52,.02],.014); lf2.scale.set(1,.35,.6); lf2.rotation.z=.6;
    const crease=new THREE.Mesh(new THREE.TorusGeometry(.185,.008,6,40,Math.PI),toon(0xF07F5E)); crease.position.set(0,.3,.0); crease.rotation.y=Math.PI/2; crease.scale.y=.92; b.add(crease);
    const blush=new THREE.Mesh(sph(.08,14,10),new THREE.MeshBasicMaterial({color:0xFF7C6E,transparent:true,opacity:.35})); blush.position.set(.08,.33,.13); blush.scale.set(1,1,.4); b.add(blush); }
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
    g.userData.flag=fl; g.userData.flagBase=Float32Array.from(fg.attributes.position.array);
    mk(new THREE.CylinderGeometry(.11,.14,.05,18),m('pole'),g,[0,.025,0],.014); }
  else if(ch>='1'&&ch<='9'){ const col=C.portal[ch]||0x9fd8e8; // a tunnel dug into the soil, marked with flowers of its pair colour
    const hole=new THREE.Mesh(new THREE.CircleGeometry(.27,32),new THREE.MeshBasicMaterial({color:0x2E2019})); hole.rotation.x=-Math.PI/2; hole.position.y=.012; g.add(hole);
    const inner=new THREE.Mesh(new THREE.RingGeometry(.15,.27,32),new THREE.MeshBasicMaterial({color:0x4A3226})); inner.rotation.x=-Math.PI/2; inner.position.y=.014; g.add(inner);
    const dm=toon(0xA9744F), dm2=toon(0x96633F);
    for(let i=0;i<9;i++){ const a=i/9*Math.PI*2; const lump=new THREE.Mesh(sph(.1+(i%3)*.015,16,12),i%2?dm:dm2); lump.position.set(Math.cos(a)*.33,.03,Math.sin(a)*.33); lump.scale.y=.55; lump.castShadow=true; lump.receiveShadow=true; g.add(lump); }
    const fm=toon(col); for(let i=0;i<3;i++){ const a=i/3*Math.PI*2+.6; const f=new THREE.Group(); f.position.set(Math.cos(a)*.36,.06,Math.sin(a)*.36);
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
    const box=new THREE.Mesh(new THREE.BoxGeometry(.8,.5,.8),m('hedge')); box.position.y=.25; box.castShadow=true; box.receiveShadow=true; outlineBox(box,.02,.8,.5,.8); hg.add(box);
    for(let i=0;i<9;i++){ const b=new THREE.Mesh(sph(.17,14,10),i%2?m('hedge'):m('hedgeDark')); b.position.set(((i%3)-1)*.27,.5+((i*7)%3)*.02,(Math.floor(i/3)-1)*.27); b.castShadow=true; hg.add(b); }
    for(let i=0;i<4;i++){ const fl=new THREE.Mesh(sph(.04,10,8),m('petalB')); fl.position.set(Math.cos(i*1.7)*.3,.62,Math.sin(i*1.7)*.3); hg.add(fl); } }
  else if(ch==='L'){ mk(new THREE.CylinderGeometry(.14,.17,.1,18),toon(0xD8CFC4),g,[0,.05,0],.014);
    mk(new THREE.BoxGeometry(.09,.5,.09),m('plankDark'),g,[0,.3,0],.014);
    const wheel=new THREE.Group(); wheel.position.set(0,.5,.07); g.add(wheel); g.userData.wheel=wheel; g.userData.faceCam=true;
    mk(new THREE.TorusGeometry(.17,.03,10,28),m('plank'),wheel,null,.012);
    for(let i=0;i<3;i++){ const sp=new THREE.Mesh(new THREE.BoxGeometry(.34,.035,.035),m('plankDark')); sp.rotation.z=i*Math.PI/3; wheel.add(sp); }
    mk(sph(.045,12,10),m('key'),wheel,[0,0,.02],.012); mk(new THREE.CylinderGeometry(.02,.02,.12,8),m('key'),wheel,[.17,0,.06],.01).rotation.x=Math.PI/2; }
  else if(ch==='R'){ const st=mk(sph(.22,20,14),toon(0xC9C0B4),g,[0,.04,0],.016); st.scale.set(1,.45,.9);
    const moss=new THREE.Mesh(sph(.16,16,10),m('leaf')); moss.scale.set(1,.3,.8); moss.position.set(-.04,.11,0); g.add(moss);
    const cl=new THREE.Group(); cl.position.y=.6; cl.scale.setScalar(1.6); cl.rotation.x=-.6; g.add(cl); g.userData.bob=cl; g.userData.noSpin=true; g.userData.cloud=cl; g.userData.faceCam=true; const cm=toon(C.cloud);
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
  else return null;
  faceCamera(g); board.add(g); return g;
}
// Each patch builds its own meshes; free their GPU memory when the next patch replaces them.
// Cached and module-level geometries, materials and textures are shared, so they are kept.
function disposeTree(root){
  const keepG=new Set([...Object.values(GC),TURF,WATER,sparkGeo,ringGeo,glintGeo,rippleGeo,slimeGeo]);
  const keepM=new Set([...Object.values(MC),lineMat,tubeMat,capMat,waterMatH,waterMatV,lawnMat,sparkMat,glintMat]);
  const keepT=new Set([gradTex,turfTex,crackTex,swirlTex,lawnTex,flowH,flowV,blobTex,zTex,slimeTex]);
  root.traverse(o=>{ if(o.geometry&&!keepG.has(o.geometry)) o.geometry.dispose();
    for(const mt of o.material?[].concat(o.material):[]){ if(keepM.has(mt)) continue; if(mt.map&&!keepT.has(mt.map)) mt.map.dispose(); mt.dispose(); } }); }
function buildBoard(){
  disposeTree(board); disposeTree(fx); board.clear(); fx.clear(); cells=[]; flowTiles=[];
  for(let y=0;y<state.h;y++){ const row=[]; for(let x=0;x<state.w;x++){
    const ch=state.grid[y][x]; row.push({ch, tile: ch===' '?null:makeTile(x,y,ch), item: makeItem(x,y,ch)}); } cells.push(row); }
  buildGarden(); buildRain(); syncWeather(false); buildSnails(); syncHedges(false);
}
// hedges stand while no flower is held and sink while one is (or while the worm is inside them)
function syncHedges(animate){ if(!state) return; const open=hedgesOpen(state); let changed=false;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const it=cells[y]&&cells[y][x]&&cells[y][x].item; if(!it) continue; const u=it.userData;
    if(u.flower){ const want=occupied(x,y)?.35:1; if(u.pressed!==want){ u.pressed=want; const f=u.flower, s0=f.scale.y; if(animate) tween(180,e=>{ f.scale.y=s0+(want-s0)*e; }); else f.scale.y=want; } }
    if(u.hedge){ const want=open||occupied(x,y)?.06:1; if(u.hedgeH!==want){ if(u.hedgeH!==undefined) changed=true; u.hedgeH=want; const h=u.hedge, s0=h.scale.y;
        if(animate) tween(300,e=>{ h.scale.y=Math.max(.06,s0+(want-s0)*e); h.position.y=-(1-h.scale.y)*.06; }); else { h.scale.y=want; h.position.y=-(1-want)*.06; } } } }
  if(changed&&animate){ sfx(open?'hedgeOpen':'hedgeClose'); if(open) bumpStat('hedges'); } }
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
function buildSnails(){ snailMeshes.forEach(removeObj); snailMeshes=(state.snails||[]).map(n=>{ const s=makeSnail(); s.userData.inner.scale.setScalar(1); s.children[0].scale.setScalar(1.4); s.position.copy(wp(n.x,n.y,0)); s.rotation.y=snailYaw(n); return s; }); }
function syncSnails(animate,ev){ const ss=state.snails||[]; if(snailMeshes.length!==ss.length) return buildSnails();
  ss.forEach((n,i)=>{ const s=snailMeshes[i], to=wp(n.x,n.y,0), yaw=snailYaw(n);
    if(!animate||reduceMotion){ s.position.copy(to); s.rotation.y=yaw; return; }
    const from=s.position.clone(), r0=s.rotation.y; const turned=ev&&ev.snails&&ev.snails[i]&&ev.snails[i].turned;
    if(!turned){ trail(from,to); tween(260,(e,k)=>{ s.position.lerpVectors(from,to,e); s.userData.inner.scale.set(1.4,1.4*(1-Math.sin(k*Math.PI)*.08),1.4*(1+Math.sin(k*Math.PI)*.12)); },()=>s.userData.inner.scale.setScalar(1.4)); }
    else { sfx('snail'); let d=yaw-r0; d=((d+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; if(Math.abs(d)<.01) d=Math.PI;
      tween(380,(e,k)=>{ s.rotation.y=r0+d*e; s.userData.inner.position.y=Math.sin(k*Math.PI)*.05; },()=>{ s.rotation.y=yaw; s.userData.inner.position.y=0; }); } }); }
const slimeTex=(()=>{ const cv=document.createElement('canvas'); cv.width=128; cv.height=32; const c=cv.getContext('2d');
  const g=c.createLinearGradient(0,0,0,32); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.3,'rgba(235,248,255,.75)'); g.addColorStop(.5,'rgba(255,255,255,1)'); g.addColorStop(.7,'rgba(235,248,255,.75)'); g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g; c.beginPath(); c.roundRect?c.roundRect(2,0,124,32,16):c.rect(2,0,124,32); c.fill(); return new THREE.CanvasTexture(cv); })();
const slimeGeo=new THREE.PlaneGeometry(1,.2).translate(.5,0,0);
function trail(from,to){ if(reduceMotion) return; const dx=to.x-from.x, dz=to.z-from.z, len=Math.hypot(dx,dz)+.12;
  const mt=new THREE.MeshBasicMaterial({map:slimeTex,color:0xF2FAFF,transparent:true,opacity:.7,depthWrite:false});
  const t=new THREE.Group(); t.position.set(from.x-dx/Math.hypot(dx,dz)*.06,.01,from.z-dz/Math.hypot(dx,dz)*.06); t.rotation.y=Math.atan2(-dz,dx);
  const strip=new THREE.Mesh(slimeGeo,mt); strip.rotation.x=-Math.PI/2; strip.scale.x=.01; t.add(strip); board.add(t);
  const done=kill(t);
  tween(260,e=>{ strip.scale.x=Math.max(.01,e*len); },()=>tween(2600,(e,k)=>{ mt.opacity=.7*(1-k); },()=>{ mt.dispose(); done(); })); }
function dent(x,y){ const d=new THREE.Mesh(new THREE.CircleGeometry(.36,24),new THREE.MeshBasicMaterial({color:C.soilDark})); d.rotation.x=-Math.PI/2; d.position.copy(wp(x,y,-.215)); board.add(d); return d; }
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
      if(old==='G'){ sfx('gate'); const door=it.userData.door; tween(520,(e)=>{ door.rotation.y=-e*1.9; },()=>{ tween(260,(e)=>{ it.scale.setScalar(Math.max(.01,1-e)); },kill(it)); }); dying.add(it); }
      else { sfx(old==='+'?'grow':old==='-'?'shrink':'key'); react(old==='+'?'joy':old==='-'?'wow':'grin'); burst(it.position.clone().setY(.4), old==='+'?C.peach:old==='-'?C.cap:C.key);
        tween(240,(e)=>{ it.scale.setScalar(Math.max(.01,1+e*.5-e*1.4)); it.position.y=e*.35; },kill(it)); }
      continue; }
    removeObj(cell.tile); removeObj(cell.item);
    cell.tile = ch===' '?null:makeTile(x,y,ch); cell.item=makeItem(x,y,ch);
    const pops=[cell.tile,cell.item].filter(Boolean); pops.forEach(p=>p.scale.setScalar(.7));
    tween(220,(e)=>pops.forEach(p=>p.scale.setScalar(.7+.3*e)));
  }
}
let fxTimer=0; const sparkGeo=new THREE.OctahedronGeometry(.05,0), sparkMat=new THREE.MeshBasicMaterial({color:0xFFF4B0});
function sparkle(p){ const s=new THREE.Mesh(sparkGeo,sparkMat); s.position.set(p.x+(Math.random()-.5)*.4,.3+Math.random()*.4,p.z+(Math.random()-.5)*.4); fx.add(s);
  tween(600,(e,k)=>{ s.scale.setScalar(Math.sin(k*Math.PI)); s.rotation.y+=.1; },kill(s)); }
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
function dustPuff(pos){ if(reduceMotion) return; const mt=toon(0xE6D2A8,{transparent:true,opacity:.9});
  for(let i=0;i<7;i++){ const p=new THREE.Mesh(sph(.09,12,8),mt); const a=i/7*Math.PI*2; p.position.copy(pos).add(new THREE.Vector3(Math.cos(a)*.25,0,Math.sin(a)*.25)); fx.add(p);
    tween(600,(e)=>{ p.position.y=pos.y+e*.25; p.scale.setScalar(.6+e*.8); mt.opacity=.9*(1-e); },kill(p)); } }

// ---------- weather ----------
let wet=0, rainLines=null, rainGain=null, riverGain=null;
const hemi=scene.children.find(o=>o.isHemisphereLight), amb=scene.children.find(o=>o.isAmbientLight);
const lawnDry=new THREE.Color(C.lawn), lawnWet=new THREE.Color(0x6E9E63);
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
// time of day: soft morning, bright noon, golden evening, blue night with fireflies
const TOD={ morning:{sun:0xFFE9CF,si:.5,hemi:.38,amb:[1,.97,.93],lawn:[1,.99,.95]}, day:{sun:0xFFF1DC,si:.55,hemi:.38,amb:[1,.96,.89],lawn:[1,1,1]},
  evening:{sun:0xFFC58A,si:.5,hemi:.32,amb:[1,.86,.78],lawn:[1,.9,.8]}, night:{sun:0xC4D0FF,si:.36,hemi:.3,amb:[.74,.78,.98],lawn:[.74,.82,.95]} };
let todName='day', tod=TOD.day, fireflies=null;
function pickTod(){ if(typeof renderHome==='function'&&$('homeOv').classList.contains('show')) renderHome(); const h=new Date().getHours()+new Date().getMinutes()/60; todName= h>=6&&h<10?'morning' : h>=10&&h<17?'day' : h>=17&&h<20?'evening' : 'night'; tod=TOD[todName];
  sun.color.setHex(tod.sun); document.documentElement.dataset.tod=todName; buildFireflies(); }
function buildFireflies(){ if(fireflies){ removeObj(fireflies); fireflies=null; } if(todName!=='night'&&todName!=='evening') return;
  fireflies=new THREE.Group(); const mt=new THREE.MeshBasicMaterial({color:0xFFF3A0,transparent:true,opacity:.9}); const n=todName==='night'?18:8;
  for(let i=0;i<n;i++){ const f=new THREE.Mesh(sph(.035,8,6),mt.clone()); f.userData={ph:Math.random()*10,r:1+Math.random()*4,s:.2+Math.random()*.3,y:.4+Math.random()*1.2}; fireflies.add(f); } scene.add(fireflies); }
function updateRain(dt){
  wet+=((state&&state.raining?1:0)-wet)*(1-Math.exp(-dt/1000*2.5));
  lawnMat.color.setRGB(tod.lawn[0]*(1-.2*wet),tod.lawn[1]*(1-.12*wet),tod.lawn[2]*(1-.05*wet)); sun.intensity=tod.si-.22*wet; hemi.intensity=tod.hemi-.06*wet; amb.color.setRGB(tod.amb[0]*(1-.12*wet),tod.amb[1]*(1-.06*wet),tod.amb[2]);
  const lc=lawnDry.clone().lerp(lawnWet,wet).multiply(new THREE.Color(tod.lawn[0],tod.lawn[1],tod.lawn[2])); renderer.setClearColor(lc); syncThemeColor(lc);
  if(fireflies) fireflies.children.forEach((f,i)=>{ const u=f.userData, t=idleT*u.s+u.ph; f.position.set(Math.cos(t)*u.r,u.y+Math.sin(t*2.3)*.25,Math.sin(t*1.4)*u.r*.8); f.material.opacity=.35+.55*Math.max(0,Math.sin(idleT*2+u.ph*3)); });
  if(rainLines){ rainLines.material.opacity=.75*wet; rainLines.visible=wet>.02;
    if(rainLines.visible){ const a=rainLines.geometry.attributes.position, sp=rainLines.geometry.userData.sp, d=dt/1000;
      for(let i=0;i<sp.length;i++){ let y=a.array[i*6+1]-sp[i]*d; if(y<-.25) y+=5; a.array[i*6+1]=y; a.array[i*6+4]=y+.28; } a.needsUpdate=true; } }
  document.documentElement.style.setProperty('--wet',wet.toFixed(3));
}

// ---------- worm: smooth tapered body through the segment anchors ----------
const HEAD_R=.34;
function segR(i,n){ if(i===0) return .29; const t=(i-1)/Math.max(1,n-2); return .27-.1*t; }
function segY(i,n){ return i===0?HEAD_R:segR(i,n); }
function makeSeg(i,parent){
  const g=new THREE.Group();
  if(i===0){
    const head=new THREE.Mesh(sph(HEAD_R,36,28),m('head')); head.castShadow=true; outline(head,.03); g.add(head); g.userData.body=head;
    const face=new THREE.Group(); head.add(face);
    const F={eyes:[],arcs:[],pupils:[],mouths:{}}; g.userData.face=F;
    const dark=m('pupil');
    for(const s of [-1,1]){
      const e=new THREE.Mesh(sph(.11,24,18),m('eye')); e.position.set(s*.13,.14,.24); outline(e,.018); face.add(e); F.eyes.push(e);
      const pu=new THREE.Mesh(sph(.062,18,14),dark); pu.position.set(0,0,.064); e.add(pu); F.pupils.push(pu);
      const hl=new THREE.Mesh(sph(.022,10,8),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(.024,.03,.048); pu.add(hl);
      const arc=new THREE.Mesh(new THREE.TorusGeometry(.06,.016,8,18,Math.PI),dark); arc.position.set(s*.13,.13,.31); arc.visible=false; face.add(arc); F.arcs.push(arc);
      const ck=new THREE.Mesh(sph(.055,14,10),new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.55})); ck.position.set(s*.21,-.04,.25); ck.scale.set(1,.55,.4); face.add(ck);
    }
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,8,18,Math.PI),dark); smile.position.set(0,-.06,.325); smile.rotation.z=Math.PI; face.add(smile); F.mouths.smile=smile;
    const grin=new THREE.Group(); grin.position.set(0,-.05,.31); face.add(grin); F.mouths.grin=grin;
    const gm=new THREE.Mesh(new THREE.SphereGeometry(.075,20,12,0,Math.PI*2,Math.PI/2,Math.PI/2),dark); gm.scale.set(1,.85,.5); grin.add(gm);
    const tg=new THREE.Mesh(sph(.04,14,10),toon(0xFF6F8E)); tg.position.set(0,-.045,.015); tg.scale.set(1,.55,.6); grin.add(tg);
    const o=new THREE.Mesh(new THREE.TorusGeometry(.03,.014,8,18),dark); o.position.set(0,-.07,.33); face.add(o); F.mouths.o=o;
    const flat=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.075,8),dark); flat.rotation.z=Math.PI/2; flat.position.set(0,-.06,.33); face.add(flat); F.mouths.flat=flat;
    const tongue=new THREE.Mesh(sph(.035,14,10),toon(0xFF7A98)); tongue.position.set(.02,-.1,.31); tongue.scale.set(1,1.2,.5); tongue.visible=false; face.add(tongue); F.tongue=tongue;
    const hat=new THREE.Group(); hat.position.set(0,.27,-.02); hat.rotation.x=-.18; head.add(hat); g.userData.hatSlot=hat; dressHat(g);
    g.userData.expr='smile'; applyExpr(g,'smile');
  }
  (parent||wormG).add(g); return g;
}
const EXPRS=['grin','joy','wink','wow','sleepy','cheeky'];
let reactT=0, zT=0;
const zTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const c=cv.getContext('2d'); c.font='800 48px Grandstander, Nunito, sans-serif'; c.textAlign='center'; c.textBaseline='middle';
  c.lineWidth=8; c.strokeStyle='#FFF8EA'; c.strokeText('z',32,34); c.fillStyle='#5B4436'; c.fillText('z',32,34); return new THREE.CanvasTexture(cv); })();
function snore(h){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:zTex,transparent:true,depthWrite:false})); s.position.copy(h.position).add(new THREE.Vector3(.15,.45,0)); s.scale.setScalar(.01); fx.add(s);
  const x0=s.position.x; tween(1800,(e,k)=>{ s.position.y+=.004; s.position.x=x0+Math.sin(k*5)*.08; s.scale.setScalar(.12+k*.18); s.material.opacity=1-k; },kill(s)); }
function react(name,ms=900){ const h=segMeshes[0]; if(!h||!h.userData.face) return; applyExpr(h,name); reactT=ms/1000; }
function applyExpr(g,name){ const F=g.userData.face; if(!F) return; g.userData.expr=name;
  const open=[true,true], eyeY=[1,1], eyeS=1; let mouth='smile', tongue=false, pupilY=0;
  if(name==='grin') mouth='grin';
  if(name==='joy'){ open[0]=open[1]=false; mouth='grin'; }
  if(name==='wink'){ open[0]=false; tongue=true; }
  if(name==='wow'){ mouth='o'; }
  if(name==='sleepy'){ eyeY[0]=eyeY[1]=.4; mouth='flat'; pupilY=-.02; }
  if(name==='cheeky'){ tongue=true; mouth='flat'; }
  if(name==='oops'){ open[0]=open[1]=false; mouth='o'; }
  F.eyes.forEach((e,i)=>{ e.visible=open[i]; e.userData.baseY=eyeY[i]; e.userData.baseS=name==='wow'?1.15:1; });
  F.arcs.forEach((a,i)=>a.visible=!open[i]);
  F.pupils.forEach(p=>p.position.y=pupilY);
  for(const k in F.mouths) F.mouths[k].visible=(k===mouth);
  F.tongue.visible=tongue;
}
function snapWorm(){
  segMeshes.forEach(removeObj); segMeshes=[]; tailExtras=[];
  const n=state.segs.length;
  state.segs.forEach((p,i)=>{ const s=makeSeg(i); s.position.copy(wp(p[0],p[1],segY(i,n))); segMeshes.push(s); });
  if(n>1){ const a=state.segs[0], b=state.segs[1]; const dx=a[0]-b[0], dy=a[1]-b[1]; if(Math.abs(dx)+Math.abs(dy)===1) headDir=[dx,dy]; }
  segMeshes[0].rotation.y=Math.atan2(headDir[0],headDir[1]); wormG.visible=true; lookPhase='off';
}
let tailExtras=[];
const tubeMat=new THREE.MeshToonMaterial({color:0xffffff,vertexColors:true,gradientMap:gradTex});
const capMat=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:gradTex});
const COL_A=new THREE.Color(0xFFB3C8), tmpC=new THREE.Color();
// worm colours, earned with garden stars: [name, body, head, stars needed]
// hats, earned by finishing chapters: [id, name, chapter index that unlocks it]. Each is built once and cloned.
const HATS=[['none','No hat',-1],['crown','Flower crown',0],['straw','Straw hat',2],['leaf','Leaf cap',4],['acorn','Acorn cap',6],['party','Party hat',8],['beret','Dewdrop beret',10],['gold','Garden crown',12]];
const HAT_ICON={none:'&#10006;',crown:'&#127804;',straw:'&#128082;',leaf:'&#127811;',acorn:'&#127792;',party:'&#127881;',beret:'&#129698;',gold:'&#128081;'};
const hatProto={};
function buildHat(id){ const h=new THREE.Group();
  if(id==='crown'){ const ring=new THREE.Mesh(new THREE.TorusGeometry(.21,.04,8,28),m('leaf')); ring.rotation.x=Math.PI/2; ring.position.y=.05; outline(ring,.01); h.add(ring);
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2, f=new THREE.Group(); f.position.set(Math.cos(a)*.21,.1,Math.sin(a)*.21); f.rotation.z=Math.cos(a)*.5; f.rotation.x=-Math.sin(a)*.5; h.add(f); const col=i%2?m('petalB'):m('partyB');
      for(let k=0;k<5;k++){ const pt=new THREE.Mesh(sph(.045,8,6),col); const b=k/5*Math.PI*2; pt.position.set(Math.cos(b)*.05,0,Math.sin(b)*.05); pt.scale.y=.55; f.add(pt); }
      const c=new THREE.Mesh(sph(.03,8,6),m('key')); c.position.y=.015; f.add(c); } }
  else if(id==='straw'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.34,.36,.03,28),m('straw')); outline(brim,.012); h.add(brim);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.16,22),m('straw')); top.position.y=.09; outline(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.195,.195,.045,22),m('petalB')); band.position.y=.04; h.add(band);
    const fl=new THREE.Mesh(sph(.04,10,8),m('partyB')); fl.position.set(.17,.06,.08); h.add(fl); }
  else if(id==='leaf'){ const lf=new THREE.Mesh(sph(.32,18,10),m('leafBig')); lf.scale.set(1,.2,.72); lf.position.y=.1; lf.rotation.z=.25; outline(lf,.012); h.add(lf);
    const vein=new THREE.Mesh(new THREE.BoxGeometry(.5,.012,.022),m('leafVein')); vein.position.y=.165; vein.rotation.z=.25; h.add(vein);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.012,.015,.12,6),m('stem')); st.position.set(-.33,.03,0); st.rotation.z=1.1; h.add(st); }
  else if(id==='acorn'){ const cap=new THREE.Mesh(new THREE.SphereGeometry(.24,22,12,0,Math.PI*2,0,Math.PI/2),m('acornCap')); cap.scale.y=.7; outline(cap,.012); h.add(cap);
    for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; const d=new THREE.Mesh(sph(.025,6,5),m('acornNut')); d.position.set(Math.cos(a)*.17,.1,Math.sin(a)*.17); h.add(d); }
    const nub=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.08,8),m('acornCap')); nub.position.y=.2; h.add(nub); }
  else if(id==='party'){ const cone=new THREE.Mesh(new THREE.ConeGeometry(.17,.44,22),m('partyA')); cone.position.y=.24; outline(cone,.012); h.add(cone);
    for(const y of [.1,.26]){ const st=new THREE.Mesh(new THREE.TorusGeometry(.17*(1-(y-.02)/.44),.02,6,22),m('partyB')); st.rotation.x=Math.PI/2; st.position.y=y; h.add(st); }
    const pom=new THREE.Mesh(sph(.06,12,10),m('petalB')); pom.position.y=.47; h.add(pom); }
  else if(id==='beret'){ const b=new THREE.Mesh(sph(.24,22,14),m('beret')); b.scale.set(1,.32,1); b.position.set(.03,.03,0); b.rotation.z=-.2; outline(b,.012); h.add(b);
    const nub=new THREE.Mesh(sph(.035,10,8),m('beret')); nub.position.set(.05,.11,0); h.add(nub);
    const dew=new THREE.Mesh(sph(.04,10,8),m('dew')); dew.position.set(-.13,.07,.12); h.add(dew); }
  else if(id==='gold'){ const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.2,.09,24,1,true),m('crown')); band.position.y=.04; h.add(band);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const sp=new THREE.Mesh(new THREE.ConeGeometry(.045,.11,8),m('crown')); sp.position.set(Math.cos(a)*.19,.13,Math.sin(a)*.19); h.add(sp);
      const gm=new THREE.Mesh(sph(.025,8,6),i%2?m('petalB'):m('partyA')); gm.position.set(Math.cos(a)*.2,.04,Math.sin(a)*.2); h.add(gm); } }
  h.traverse(o=>{ if(o.isMesh&&o.material!==lineMat) o.castShadow=true; });
  return h; }
let hatId='none'; try{ hatId=localStorage.getItem('squirm-hat')||'none'; }catch(e){}
const chapterCleared=k=>{ const ch=CHAPTERS[k]; if(!ch) return false; for(let i=ch.from;i<=ch.to;i++) if(!isCleared(i)) return false; return true; };
const hatUnlocked=h=>h[2]<0||chapterCleared(h[2]);
function dressHat(g){ const slot=g&&g.userData.hatSlot; if(!slot) return; slot.clear();
  const h=HATS.find(x=>x[0]===hatId); if(!h||h[0]==='none'||!hatUnlocked(h)) return;
  if(!hatProto[hatId]) hatProto[hatId]=buildHat(hatId); slot.add(hatProto[hatId].clone()); }
const WORM_COLS=[['Blossom',0xFFB3C8,0xFFB0C6,0],['Mint',0x7FD9B0,0x74D3A6,15],['Butter',0xFFE08A,0xFFDA7A,45],['Lavender',0xCDB8F5,0xC5AEF2,90],['Sky',0xA9D8F5,0x9FD2F2,150]];
const starTotal=()=>LEVELS.reduce((a,l)=>a+(progress.stars[l.name]||0),0);
const coloursUnlocked=()=>WORM_COLS.filter(c=>starTotal()>=c[3]).length;
let wormCol=0; try{ wormCol=Math.max(0,Math.min(WORM_COLS.length-1,parseInt(localStorage.getItem('squirm-colour')||'0',10)||0)); }catch(e){}
function applyWormColour(){ if(wormCol>=coloursUnlocked()) wormCol=0; const c=WORM_COLS[wormCol]; COL_A.setHex(c[1]); m('head').color.setHex(c[2]); }
const tubePool=[], capPool=[];
function tubeGeo(geo,pts,rads,cols,extra){
  const S=pts.length, RS=20, verts=S*RS;
  let pos=geo.getAttribute('position');
  if(!pos||pos.count!==verts){
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    const idx=[]; for(let j=0;j<S-1;j++) for(let r=0;r<RS;r++){ const a=j*RS+r, b=j*RS+(r+1)%RS, c=(j+1)*RS+r, d=(j+1)*RS+(r+1)%RS; idx.push(a,c,b, b,c,d); }
    geo.setIndex(idx); pos=geo.getAttribute('position');
  }
  const nor=geo.getAttribute('normal'), col=geo.getAttribute('color');
  const up=new THREE.Vector3(0,1,0), T=new THREE.Vector3(), side=new THREE.Vector3(), U=new THREE.Vector3();
  for(let j=0;j<S;j++){
    const p=pts[j]; if(j<S-1) T.subVectors(pts[j+1],p); else T.subVectors(p,pts[j-1]); T.normalize();
    side.crossVectors(T,up); if(side.lengthSq()<1e-4) side.set(1,0,0); side.normalize(); U.crossVectors(side,T).normalize();
    const r=rads[j]+extra;
    for(let k=0;k<RS;k++){ const an=k/RS*Math.PI*2, ca=Math.cos(an), sa=Math.sin(an); const i=(j*RS+k)*3;
      const nx=side.x*ca+U.x*sa, ny=side.y*ca+U.y*sa, nz=side.z*ca+U.z*sa;
      pos.array[i]=p.x+nx*r; pos.array[i+1]=p.y+ny*r; pos.array[i+2]=p.z+nz*r;
      nor.array[i]=nx; nor.array[i+1]=ny; nor.array[i+2]=nz;
      if(cols){ col.array[i]=cols[j].r; col.array[i+1]=cols[j].g; col.array[i+2]=cols[j].b; } }
  }
  pos.needsUpdate=true; nor.needsUpdate=true; col.needsUpdate=true; geo.computeBoundingSphere();
}
function getTube(i){ if(!tubePool[i]){ const body=new THREE.Mesh(new THREE.BufferGeometry(),tubeMat), line=new THREE.Mesh(new THREE.BufferGeometry(),lineMat);
    body.castShadow=true; body.frustumCulled=false; line.frustumCulled=false; wormG.add(body,line); tubePool[i]={body,line}; } return tubePool[i]; }
function getCap(i){ if(!capPool[i]){ const c=new THREE.Mesh(sph(1,24,16),capMat.clone()); c.castShadow=true; const o=new THREE.Mesh(c.geometry,lineMat); c.add(o); c.userData.o=o; wormG.add(c); capPool[i]=c; } return capPool[i]; }
function colorAt(g,n){ tmpC.copy(COL_A); const f=(g*2)%1; if(g>.4 && f<.14) tmpC.multiplyScalar(.93+.07*(f/.14)); return tmpC.clone(); }
let crawlK=-1;
function radAt(g,n,anchors){ const i=Math.min(Math.floor(g),anchors.length-2), f=g-i;
  const sc=anchors[Math.max(0,i)].scale.x*(1-f)+anchors[Math.min(i+1,anchors.length-1)].scale.x*f;
  let r=(i===0? (segR(0,n)*(1-f)+segR(1,n)*f) : segR(i,n)*(1-f)+segR(i+1,n)*f);
  if(g>.4) r*=1+.04*Math.cos(g*4*Math.PI);
  if(crawlK>=0 && n>1){ const pos=(1-crawlK)*(n-1); r*=1+.15*Math.sin(Math.PI*crawlK)*Math.exp(-((g-pos)*(g-pos))/.35); }
  return r*sc; }
function portalAt(p){ const c=tileAt(state,p[0],p[1]); return c>='1'&&c<='9'; }
function updateWorm(){
  const anchors=segMeshes.concat(tailExtras); const n=anchors.length; let ti=0, ci=0;
  if(wormG.visible && n){
    const idle = !animating && state.status==='play' && !reduceMotion;
    const P=anchors.map((a,i)=>{ const v=a.position.clone(); if(idle) v.y+=Math.sin(idleT*3-i*.8)*.02; return v; });
    let chains=[], cur=[0];
    for(let i=1;i<n;i++){ if(P[i].distanceTo(P[i-1])>1.3){ chains.push(cur); cur=[i]; } else cur.push(i); }
    chains.push(cur);
    const segs=state.segs;
    for(const ch of chains){
      // control points with their position along the worm; ends next to a portal dive into it
      let pts=ch.map(i=>P[i]), G=ch.map(i=>i), diveFront=false, diveBack=false;
      const f=ch[0], l=ch[ch.length-1];
      if(f>0 && f<segs.length && portalAt(segs[f-1])){ const q=partner(state,segs[f-1][0],segs[f-1][1]);
        if(q && Math.abs(q[0]-segs[f][0])+Math.abs(q[1]-segs[f][1])===1){ pts=[wp(q[0],q[1],-.3),wp(q[0],q[1],.12),...pts]; G=[f,f,...G]; diveFront=true; } }
      if(l>0 && l<segs.length-1 && l+1<n && portalAt(segs[l]) && P[l+1].distanceTo(P[l])>1.3){ pts=[...pts,wp(segs[l][0],segs[l][1],-.3)]; G=[...G,l]; diveBack=true; }
      if(pts.length>=2){
        if(ch[0]===0 && !diveFront) pts[0]=pts[0].clone().setY(pts[0].y-.04);
        const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
        const S=(pts.length-1)*9+1, sp=[], rr=[], cc=[];
        for(let j=0;j<S;j++){ const u=j/(S-1); sp.push(curve.getPoint(u)); const fi=u*(pts.length-1), i0=Math.floor(Math.min(fi,pts.length-1.0001)), t=fi-i0;
          const gg=G[i0]*(1-t)+G[i0+1]*t; rr.push(radAt(gg,n,anchors)); cc.push(colorAt(gg,n)); }
        const tb=getTube(ti++); tb.body.visible=tb.line.visible=true; tubeGeo(tb.body.geometry,sp,rr,cc,0); tubeGeo(tb.line.geometry,sp,rr.map(r=>r+.03*Math.min(1,r/.15)),null,0);
      }
      const ends=[]; if(!diveFront && f!==0) ends.push(f); if(!diveBack && (l!==f || ch.length===1) && l!==0) ends.push(l);
      for(const end of ends){ const c=getCap(ci++); const r=Math.max(.001,radAt(Math.min(end,n-1),n,anchors));
        c.visible=true; c.position.copy(P[end]); c.scale.setScalar(r); c.userData.o.scale.setScalar(1+.03*Math.min(1,r/.15)/r); c.material.color.copy(colorAt(end,n)); }
    }
  }
  for(let i=ti;i<tubePool.length;i++){ tubePool[i].body.visible=tubePool[i].line.visible=false; }
  for(let i=ci;i<capPool.length;i++) capPool[i].visible=false;
}
// head: faces where it's going, then turns to look at you when resting
const angLerp=(a,b,t)=>{ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; };
let blinkT=1.5, lookPhase='off', phaseT=0, lastExpr='smile';
const LOOK_DELAY=2.6, LOOK_TIME=4.2, AWAY_TIME=3.8;
function updateHead(dt){
  const h=segMeshes[0]; if(!h||!h.userData.body) return;
  const asleep=!animating && state.status==='play' && idleT-lastMoveT>25 && reactT<=0;
  if(asleep){ if(h.userData.expr!=='sleepy') applyExpr(h,'sleepy'); lookPhase='sleep';
    h.rotation.y=angLerp(h.rotation.y,Math.atan2(headDir[0],headDir[1]),1-Math.exp(-dt/1000*3)); h.userData.body.rotation.x+=(.25-h.userData.body.rotation.x)*(1-Math.exp(-dt/1000*3));
    h.userData.face.eyes.forEach(e=>e.scale.set(1,.22,1)); zT-=dt/1000; if(zT<0&&!reduceMotion){ zT=1.3; snore(h); } return; }
  if(lookPhase==='sleep'){ lookPhase='off'; applyExpr(h,'smile'); }
  if(reactT>0){ reactT-=dt/1000; if(reactT<=0 && lookPhase!=='look') applyExpr(h,'smile'); }
  const idleNow=!animating && state.status==='play' && idleT-lastMoveT>LOOK_DELAY && reactT<=0;
  if(!idleNow){ if(lookPhase==='look') applyExpr(h,'smile'); lookPhase='off'; phaseT=0; }
  else { phaseT+=dt/1000;
    if(lookPhase==='off'){ lookPhase='look'; phaseT=0; newExpression(h); }
    else if(lookPhase==='look' && phaseT>LOOK_TIME){ lookPhase='away'; phaseT=0; applyExpr(h,'smile'); }
    else if(lookPhase==='away' && phaseT>AWAY_TIME){ lookPhase='look'; phaseT=0; newExpression(h); } }
  const looking=lookPhase==='look';
  const moveYaw=Math.atan2(headDir[0],headDir[1]);
  const camYawR=Math.atan2(camera.position.x-h.position.x,camera.position.z-h.position.z);
  const k=1-Math.exp(-dt/1000*(looking?4:lookPhase==='away'?3.5:16));
  h.rotation.y=angLerp(h.rotation.y,looking?camYawR:moveYaw,k);
  const tilt=looking?-.45:0; h.userData.body.rotation.x+=(tilt-h.userData.body.rotation.x)*k;
  blinkT-=dt/1000; let bl=1; if(blinkT<0){ bl=Math.max(.08,Math.abs(blinkT+.07)/.07); if(blinkT<-.14){ blinkT = Math.random()<.25 ? .18 : 1.8+Math.random()*2.5; } }
  h.userData.face.eyes.forEach(e=>{ const s=e.userData.baseS||1; e.scale.set(s,s*(e.userData.baseY||1)*bl,s); });
}
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
  if(!dir||anyOverlay()) return;
  if(animating){ if(queue.length<6) queue.push(dir); return; }
  const r=step(state,dir);
  if(r.blocked){ if(r.blocked==='over') return; queue.length=0; sfx('bump'); lastMoveT=idleT; react('oops',650);
    if(r.blocked==='locked') toast('This gate is locked. Find a key first.');
    if(r.blocked==='snail') toast('A snail is in the way. It will slide along soon.');
    if(r.blocked==='water') toast('Too wet to cross here. Look for a bridge.');
    if(r.blocked==='bridge') toast('Bridges only go along their planks.');
    if(r.blocked==='flooded') toast('That puddle is full of water. Wait for the sun.');
    if(r.blocked==='sprout') toast('Just a seedling. It needs rain to grow into a leaf.');
    if(r.blocked==='hedge') toast('The hedge only opens while part of you rests on a flower.');
    nudge(dir); return; }
  history.push(state); const prev=state; state=r.state; lastMoveT=idleT; clearHint(); saveResume(); dismissTutorial();
  if(r.ev.slide){ slideSteps=r.ev.slide.slice(1).map(x=>({state:x.state,ev:x.ev})).concat([{state:r.state,ev:r.ev}]); state=r.ev.slide[0].state; animateMove(prev,r.ev.slide[0].ev,dir); return; }
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
  syncBoard(true); syncWeather(true); syncHedges(true); if(ev.snails) syncSnails(true,ev);
  if(ev.swung){ sfx('creak'); const it=cells[state.segs[0][1]][state.segs[0][0]].item; if(it&&it.userData.wheel){ const w=it.userData.wheel, z0=w.rotation.z; tween(600,(e)=>{ w.rotation.z=z0-e*Math.PI*1.5; }); }
    if(!ev.swung.length) toast('Nothing turned. Bridges with you on them stay put.',2400); }
  if(ev.rain!==undefined){ sfx(ev.rain?'rainOn':'rainOff'); toast(ev.rain?'Rain is falling. Leaves grow, puddles fill.':'The sun is back. Puddles dry, leaves fold away.',2400); }
  const n=state.segs.length, on=prev.segs.length;
  while(segMeshes.length<n){ const t=prev.segs[on-1]; const s=makeSeg(segMeshes.length); s.position.copy(wp(t[0],t[1],.25)); s.scale.setScalar(.2); segMeshes.push(s); }
  const extras=segMeshes.splice(n); tailExtras=extras;
  const starts=segMeshes.map(s=>s.position.clone()), sc0=segMeshes.map(s=>s.scale.x);
  const targets=state.segs.map((p,i)=>wp(p[0],p[1],segY(i,n)));
  const viaP = ev.portal? wp(ev.via[0],ev.via[1],.36):null;
  const tele=segMeshes.map((s,i)=>{ if(i===0||starts[i].distanceTo(targets[i])<1.3) return null; const q=state.segs[i]; const pp=partner(state,q[0],q[1]);
    return pp ? {down:wp(pp[0],pp[1],-.3), up:wp(q[0],q[1],-.3)} : {down:starts[i].clone().setY(-.3), up:targets[i].clone().setY(-.3)}; });
  const ex0=extras.map(s=>s.position.clone()); const exT=extras.map((s,j)=>j===0?starts[n-1]:ex0[j-1]);
  const dur=sliding?95:queue.length?110:170;
  tween(dur,(e,k)=>{ crawlK=k;
    segMeshes.forEach((s,i)=>{
      const sc=sc0[i]+(1-sc0[i])*e;
      if(i===0 && viaP){ if(k<.5){ s.position.lerpVectors(starts[0],viaP,k*2); s.scale.setScalar(Math.max(.01,1-k*2));} else { s.position.copy(targets[0]); s.scale.setScalar((k-.5)*2);} return; }
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
    updateHUD(); if(state.status!=='won'&&checkBadges(null).length===0&&(sliding||ev.eaten)) save();
    if(state.status==='won') return winSeq();
    if(ev.exitNote) toast(ev.exitNote==='flags'?'The burrow opens once every flag is touched.':`This burrow fits a length of ${state.exitLen}. You're ${state.segs.length}.`);
    else if(!canMove()){ queue.length=0; sfx('stuck'); pulse($('undoBtn')); toast('No way forward from here. Undo or restart.',3600); }
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
function petals(){ if(reduceMotion) return; const box=$('petals'); box.innerHTML=''; const cols=['#F7B3C5','#FFD866','#C9B4F7','#FFC09A','#BDE5A3'];
  for(let i=0;i<36;i++){ const p=document.createElement('i'); p.style.left=Math.random()*100+'%'; p.style.background=cols[i%cols.length];
    p.style.animationDelay=(Math.random()*.9)+'s'; p.style.animationDuration=(2+Math.random()*1.5)+'s'; box.appendChild(p); }
  setTimeout(()=>box.innerHTML='',4200); }
function starsFor(mv,par,hinted){ let s = mv<=par?3 : mv<=Math.ceil(par*1.3)?2 : 1; if(hinted) s=Math.min(s,2); return s; }
const STAR=(on,i)=>`<svg class="star ${on?'on':''}" style="animation-delay:${.15+i*.18}s" width="44" height="44" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="${on?'#FFD866':'#EADCC4'}" stroke="#5B4436" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
let shareText='', newBest=false, chapterDone=null;
const shareLine=(what,mv,par,st)=>`Squirm, ${what}: ${mv} moves (par ${par}) ${'★'.repeat(st)}${'☆'.repeat(3-st)}`+(GAME_URL?'\n'+GAME_URL:'');
let winHats=[];
function onWin(){ shareText=''; newBest=false; chapterDone=null; const coloursBefore=coloursUnlocked(); winHats=HATS.filter(hatUnlocked).map(h=>h[0]);
  const par=curPar(), mv=state.moves; const st=starsFor(mv,par,hintsUsed>0); clearResume();
  const titles=['Snug as a bug!','Home sweet burrow!','Wiggle well done!','Cozy and curled up!'];
  let extra='';
  if(mode==='garden'){
    const nm=LEVELS[li].name, best=progress.best[nm]; if(best!=null&&mv<best) newBest=true; if(best==null||mv<best) progress.best[nm]=mv;
    const ch=CHAPTERS.find(c=>li>=c.from&&li<=c.to); const wasDone=ch&&best!=null; if(ch && best==null){ let all=true; for(let i=ch.from;i<=ch.to;i++) if(i!==li&&!isCleared(i)) all=false; if(all) chapterDone=ch.name; }
    progress.stars[nm]=Math.max(progress.stars[nm]||0,st);
    const last=li===LEVELS.length-1;
    $('winTitle').textContent = last ? 'The whole garden!' : chapterDone ? 'Chapter complete!' : titles[li%titles.length];
    if(chapterDone) extra=`<div class="stat-row"><span class="pill">${ICON.leaf} ${chapterDone} finished</span></div>`;
    if(!chapterDone && ch){ let left=0; for(let i=ch.from;i<=ch.to;i++) if(i!==li&&!isCleared(i)) left++; if(left) extra=`<div class="stat-row"><span class="pill">${ICON.leaf} ${left} more in ${ch.name}</span></div>`; }
    if(newBest) extra+='<span class="newbest">New best</span>';
    // 5. say so when the next patch opens a new chapter
    const nextCh=!last&&CHAPTERS.find(c=>c.from===li+1);
    $('winNext').textContent = last ? 'Back to patch 1' : nextCh ? 'Next chapter' : 'Next patch';
    if(nextCh) extra+=`<div class="stat-row"><span class="pill unlock">Next up: ${nextCh.name}</span></div>`;
    shareText=shareLine(`patch ${li+1} (${nm})`,mv,par,st);
  } else if(L.daily){
    const D=progress.daily, k=L.daily, prev=D.results[k];
    if(!prev){ const y=new Date(); y.setDate(y.getDate()-1); const yk=dateKey(y);
      D.streak = D.last===yk ? D.streak+1 : 1; D.best=Math.max(D.best,D.streak); D.last=k; }
    if(!prev||mv<prev.moves) D.results[k]={moves:mv,stars:Math.max(st,prev?prev.stars:0)};
    const old=new Date(); old.setDate(old.getDate()-90); const ok=dateKey(old); for(const d in D.results) if(d<ok) delete D.results[d];
    $('winTitle').textContent="Today's patch, done!"; $('winNext').textContent='Back home';
    extra=`<div class="stat-row"><span class="pill">Daily streak ${D.streak}</span><span class="pill">Best ${D.best}</span></div>`;
    shareText=shareLine(`daily patch ${k}`,mv,par,st);
  } else {
    const e=progress.endless[endlessDiff]; e.cleared++; e.streak++; e.best=Math.max(e.best,e.streak); e.stars+=st;
    $('winTitle').textContent = titles[e.cleared%titles.length];
    $('winNext').textContent = 'Grow another'; setTimeout(startPrefetch,900);
    shareText=shareLine(`${DIFF_NAME[endlessDiff].toLowerCase()} endless patch, streak ${e.streak}`,mv,par,st);
    extra=`<div class="stat-row"><span class="pill">${DIFF_NAME[endlessDiff]}: ${e.cleared} cleared</span><span class="pill">Streak ${e.streak}</span></div>`;
  }
  if(mode==='garden'&&!hintsUsed) progress.clean[LEVELS[li].name]=true;
  save(); askPersist();
  const hatsBefore=winHats;
  const earned=checkBadges({won:true,mv,par,secs:playT,hour:new Date().getHours()});
  if(earned.length) extra+=`<div class="stat-row">${earned.map(b=>`<span class="pill unlock">${b[1]} ${b[2]}</span>`).join('')}</div>`;
  const newHat=HATS.find(h=>h[2]>=0&&hatUnlocked(h)&&!hatsBefore.includes(h[0]));
  if(newHat) extra+=`<div class="stat-row"><span class="pill unlock">New hat: ${newHat[1]}</span></div>`;
  if(coloursUnlocked()>coloursBefore){ const c=WORM_COLS[coloursUnlocked()-1]; extra+=`<div class="stat-row"><span class="pill unlock">New worm colour: ${c[0]}</span></div>`; }
  $('winText').textContent = (mv<=par ? `${mv} moves. Right on par.` : `${mv} moves. Par is ${par}, so there's a shorter way.`)+` Time: ${playTime()}.`;
  $('winMedal').innerHTML = `<div class="stars">${[0,1,2].map(i=>STAR(i<st,i)).join('')}</div>` + (hintsUsed?`<p class="note">You used ${hintsUsed} ${hintsUsed===1?'hint':'hints'}. Solve it on your own for 3 stars.</p>`:'') + extra;
  for(let i=0;i<st;i++) setTimeout(()=>buzz(12),200+i*180);
  if(!reduceMotion) for(let i=0;i<st;i++) tone([784,988,1318][i],.25,{vol:.1,delay:.2+i*.18});
  $('winShare').hidden=!shareText; petals(); show('winOv'); pushLayer('win');
}
function undo(){
  if(!history.length) return; tweens.length=0; animating=0; queue.length=0; slideSteps.length=0; sfx('undo'); lastMoveT=idleT;
  clearDying(); clearHint(); const cur=state; state=history.pop(); syncBoard(false); syncWeather(false); syncSnails(false); syncHedges(false); updateHUD(true); saveResume();
  if(reduceMotion||cur.segs.length!==state.segs.length||segMeshes.length!==state.segs.length){ snapWorm(); return; }
  const n=state.segs.length, starts=segMeshes.map(s=>s.position.clone()), targets=state.segs.map((p,i)=>wp(p[0],p[1],segY(i,n)));
  const a=state.segs[0], b=state.segs[1]; if(b&&Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1) headDir=[a[0]-b[0],a[1]-b[1]];
  animating++; tween(150,(e)=>{ segMeshes.forEach((s,i)=>{ if(starts[i].distanceTo(targets[i])>1.3){ s.position.copy(targets[i]); return; } s.position.lerpVectors(starts[i],targets[i],e); }); },()=>{ animating--; if(queue.length) tryMove(queue.shift()); });
}
function restart(){ if(!L) return; clearHint(); tweens.length=0; clearDying(); animating=0; queue.length=0; slideSteps.length=0; hideAll(); sfx('undo');
  if(state.status==='play' && state.moves>0){ history.push(state); state=initState(L); syncBoard(false); snapWorm(); syncSnails(false); syncWeather(false); syncHedges(false); updateHUD(true); saveResume(); lastMoveT=idleT;
    toast('Fresh start. Undo brings your moves back.',2400); return; }
  clearResume(); hintsUsed=0; if(mode==='garden') loadLevel(li,false); else startLevel(L,false); }

// ---------- hints ----------
let hintsUsed=0, hintMesh=null, hintBusy=false;
function solveFrom(s0,cap=350000,ms=2500){ const until=performance.now()+ms;
  const key=s=>s.segs.map(p=>p[0]+','+p[1]).join(';')+'|'+s.grid.map(r=>r.join('')).join('')+'|'+s.keys+(s.raining?'r':'')+'|'+(s.snails||[]).map(n=>n.x+','+n.y+','+n.dx+','+n.dy).join(';');
  const seen=new Set([key(s0)]); let q=[[s0,null]];
  while(q.length){ const nq=[];
    for(const [s,first] of q){ for(const d of ['N','S','W','E']){ const r=step(s,d); if(r.blocked) continue; const f=first||d;
        if(r.state.status==='won') return f; const k=key(r.state); if(seen.has(k)) continue; seen.add(k); if(seen.size>cap||((seen.size&1023)===0&&performance.now()>until)) return undefined; nq.push([r.state,f]); } }
    q=nq; }
  return null; }
function clearHint(){ if(hintMesh){ removeObj(hintMesh); hintMesh=null; } }
function showHint(){
  if(animating&&!hintBusy){ setTimeout(showHint,250); return; }
  if(hintBusy||anyOverlay()||state.status!=='play') return; hintBusy=true; $('hintBtn').classList.add('busy');
  toast('Thinking about it...',1500);
  setTimeout(()=>{ const d=solveFrom(state); hintBusy=false; $('hintBtn').classList.remove('busy');
    if(d===null){ sfx('stuck'); toast('No way to win from here. Undo a few moves and try again.',3600); pulse($('undoBtn')); return; }
    if(d===undefined){ toast('This one is too tangled to work out from here. Try restarting.',3200); return; }
    hintsUsed++; saveResume(); clearHint(); const h=state.segs[0], dd=DIRS[d], tx=h[0]+dd[0], ty=h[1]+dd[1];
    hintMesh=new THREE.Group(); const am=m('key');
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.13,.26,20),am); cone.rotation.x=Math.PI; outline(cone,.02); hintMesh.add(cone);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,10,32),new THREE.MeshBasicMaterial({color:0xFFD866,transparent:true,opacity:.9})); ring.rotation.x=-Math.PI/2; ring.position.y=-.82; hintMesh.add(ring);
    hintMesh.position.copy(wp(tx,ty,.85)); fx.add(hintMesh);
    headDir=[dd[0],dd[1]]; lastMoveT=idleT; sfx('ready'); toast(`Try crawling ${({N:'up',S:'down',W:'left',E:'right'})[screenWord(d)]}.`,2600);
  },60);
}
function screenWord(d){ const v=screenVec(DIRS[d]); return Math.abs(v.x)>Math.abs(v.y) ? (v.x>0?'E':'W') : (v.y>0?'S':'N'); }
function pulse(el){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

// ---------- resume an unfinished patch after reload ----------
function saveResume(){ try{ localStorage.setItem('squirm-resume-'+mode,JSON.stringify({li,name:mode==='garden'?LEVELS[li].name:null,diff:endlessDiff,def:mode==='endless'?L:null,hints:hintsUsed,states:history.concat([state]).slice(-120)})); }catch(e){} }
function clearResume(){ try{ localStorage.removeItem('squirm-resume-'+mode); }catch(e){} }
function readResume(m){ try{ return JSON.parse(localStorage.getItem('squirm-resume-'+m)||'null'); }catch(e){ return null; } }
function tryResume(){ try{ const r=readResume(mode); if(!r||!r.states||!r.states.length) return false; if(mode==='garden'&&r.name!==LEVELS[li].name) return false; if(mode==='endless'&&(!r.def||r.def.seed!==L.seed)) return false;
    const sts=r.states; const last=sts[sts.length-1]; if(last.status!=='play'||sts.length<2) return false;
    state=last; history=sts.slice(0,-1); hintsUsed=r.hints||0;
    syncBoard(false); snapWorm(); syncWeather(false); syncSnails(false); updateHUD(true); return true; }catch(e){ return false; } }

// ---------- HUD ----------
const $=id=>document.getElementById(id);
const ICON={
  star:'<svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="#FFD866" stroke="#5B4436" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  sun:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="#FFD866"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
  rain:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 6.5 4 4 0 0 1 17.5 15z" fill="#C9D6EA"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" stroke="#6FA9D6"/></svg>',
  flag:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h12l-3 4 3 4H5" fill="#F27DA2"/></svg>',
  key:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="4.5" fill="#F7C64F"/><path d="M11 11l8 8M16 16l2-2M18.5 18.5l2-2"/></svg>',
  worm:'<svg width="20" height="18" viewBox="0 0 26 22" fill="none" stroke="#5B4436" stroke-width="2" stroke-linecap="round"><path d="M3 15c3-6 6-6 8 0s5 6 8 0" stroke="#FF97B4" stroke-width="5"/><circle cx="21" cy="11" r="4" fill="#FF8FAF"/><circle cx="22" cy="10" r="1" fill="#5B4436" stroke="none"/></svg>',
  steps:'<svg width="18" height="18" viewBox="0 0 24 24" fill="#E8B98F" stroke="#5B4436" stroke-width="1.8"><ellipse cx="8.5" cy="9" rx="3.2" ry="4.6" transform="rotate(-12 8.5 9)"/><ellipse cx="15.5" cy="15.5" rx="3.2" ry="4.6" transform="rotate(12 15.5 15.5)"/></svg>',
  burrow:'<svg width="18" height="18" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.8"><ellipse cx="12" cy="14" rx="9.5" ry="6" fill="#B07B57"/><ellipse cx="12" cy="13.6" rx="5.2" ry="2.9" fill="#3A2A22" stroke="none"/></svg>',
  hedge:'<svg width="18" height="18" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.8" stroke-linejoin="round"><path d="M3 20V11a3 3 0 0 1 3-3 3.5 3.5 0 0 1 6-1.5A3.5 3.5 0 0 1 18 8a3 3 0 0 1 3 3v9z" fill="#5FA64F"/><circle cx="8" cy="12" r="1.2" fill="#F7A8C4" stroke="none"/><circle cx="15" cy="14" r="1.2" fill="#F7A8C4" stroke="none"/></svg>',
  leaf:'<svg width="18" height="18" viewBox="0 0 24 24" fill="#78B65C" stroke="#5B4436" stroke-width="2" stroke-linejoin="round"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-15 15z"/><path d="M5 19l8-8" fill="none"/></svg>'
};
const sticker=svg=>`<span class="ic" aria-hidden="true">${svg}</span>`;
function hudSub(){ if(mode==='garden'){ const ch=CHAPTERS.find(c=>li>=c.from&&li<=c.to); return ch?ch.name:''; }
  if(L.daily) return 'Daily patch'; const k=progress.endless[endlessDiff].streak; return 'Endless · '+DIFF_NAME[endlessDiff]+(k?` · streak ${k}`:''); }
function statTip(k){ const par=curPar(), len=state.segs.length, fruit=/[+-]/.test(state.grid.map(r=>r.join('')).join(''));
  if(k==='moves') return `Par is ${par}. Finish in ${par} moves for 3 stars, or within ${Math.ceil(par*1.3)} for 2.`;
  if(k==='flags') return 'Touch every flag before the burrow will let you in.';
  if(k==='keys') return 'Each key opens one gate, then it is used up.';
  if(k==='hedges') return hedgesOpen(state)?'You are resting on a flower, so every hedge is open.':'Hedges open while any part of you rests on a flower.';
  if(k==='weather') return state.raining?'Raining: leaves are up and puddles are full. A cloud stone stops it.':'Sunny: seedlings are small and puddles are dry. A cloud stone brings rain.';
  if(len===state.exitLen) return 'You are just the right length for the burrow.';
  return `The burrow fits a worm of ${state.exitLen}. You are ${len}.`+(fruit?(len<state.exitLen?' A peach makes you longer.':' A mushroom makes you shorter.'):''); }
document.querySelector('.hud-stats').addEventListener('click',e=>{ const st=e.target.closest('.stat'); if(!st||!state) return; sfx('tap'); toast(statTip(st.dataset.tip||'moves'),3400); });
function updateHUD(silent){
  $('lvlNum').style.fontSize=String(mode==='garden'?li+1:0).length>2?'16px':''; $('lvlNum').textContent= mode==='garden' ? li+1 : L.daily ? new Date().getDate() : (progress.endless[endlessDiff].cleared+1); $('lvlName').textContent=L.name;
  $('lvlSub').textContent=hudSub(); document.body.dataset.mode=mode;
  const tabTitle=(mode==='garden'?`${li+1} · `:'')+L.name+' · Squirm'; if(document.title!==tabTitle&&!$('homeOv').classList.contains('show')) document.title=tabTitle;
  const now=starsFor(state.moves,curPar(),hintsUsed>0), meter=[0,1,2].map(j=>`<i class="${j<now?'on':''}"></i>`).join('');
  const mv=$('moves'), mvHtml=`${sticker(ICON.steps)}<b>${state.moves}</b><span class="par">par ${curPar()}</span><em class="mini" aria-hidden="true">${meter}</em>`;
  if(mv.innerHTML!==mvHtml){ mv.innerHTML=mvHtml; if(!silent) pulse(mv); }
  mv.setAttribute('aria-label',`${state.moves} ${state.moves===1?'move':'moves'}, par ${curPar()}, on track for ${now} ${now===1?'star':'stars'}`); mv.classList.toggle('over',state.moves>curPar());
  const chips=[];
  const flagsTotal=L.map.join('').split('C').length-1;
  if(flagsTotal){ const left=countChar(state,'C'); chips.push(`<span class="stat ${left===0?'done':''}" data-tip="flags" aria-label="Flags ${flagsTotal-left} of ${flagsTotal}">${sticker(ICON.flag)}<b>${flagsTotal-left}</b><small>/${flagsTotal}</small></span>`); }
  if(L.map.join('').includes('K')) chips.push(`<span class="stat" data-tip="keys" aria-label="${state.keys} ${state.keys===1?'key':'keys'}">${sticker(ICON.key)}<b>${state.keys}</b></span>`);
  if(L.map.join('').includes('H')){ const op=hedgesOpen(state); chips.push(`<span class="stat ${op?'done':''}" data-tip="hedges" aria-label="Hedges ${op?'open':'closed'}">${sticker(ICON.hedge)}<small>${op?'Open':'Shut'}</small></span>`); }
  if(L.map.join('').includes('R')) chips.push(`<span class="stat wx" data-tip="weather" aria-label="${state.raining?'Raining':'Sunny'}">${sticker(state.raining?ICON.rain:ICON.sun)}<small>${state.raining?'Rain':'Sun'}</small></span>`);
  const ok=state.segs.length===state.exitLen;
  chips.push(`<span class="stat ${ok?'done':''}" data-tip="length" aria-label="Length ${state.segs.length}, burrow fits ${state.exitLen}">${sticker(ICON.worm)}<b>${state.segs.length}</b><span class="to" aria-hidden="true">${ok?'=':'&rarr;'}</span>${sticker(ICON.burrow)}<b>${state.exitLen}</b></span>`);
  const html=chips.join(''); if($('chips').innerHTML!==html){ const old=[...$('chips').children].map(c=>c.textContent); $('chips').innerHTML=html; if(!silent) [...$('chips').children].forEach((c,i)=>{ if(old[i]!==c.textContent) pulse(c); }); }
  $('undoBtn').disabled=!history.length; $('restartBtn').disabled=state.moves===0;
  const ready = countChar(state,'C')===0 && ok;
  if(ready && !wasReady && !silent && state.status==='play') sfx('ready');
  wasReady=ready;
  for(const row of cells) for(const c of row) if(c.item&&c.item.userData.rim){ c.item.userData.rim.material = ready? m('ready') : toon(C.mound); c.item.userData.ready=ready; if(c.item.userData.signBoard) c.item.userData.signBoard.material = ready? m('ready') : m('plank'); }
}
let toastTimer=0;
$('toast').addEventListener('click',()=>$('toast').classList.remove('show'));
function toast(msg,ms=2600){ const t=$('toast'); t.innerHTML=sticker(ICON.leaf)+'<span class="msg"></span>'; t.querySelector('.msg').textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),ms); }
function show(id){ $(id).classList.add('show'); if(id==='homeOv'){ document.body.classList.add('at-home'); return; } const b=$(id).querySelector('.primary')||$(id).querySelector('button'); b&&b.focus({preventScroll:true}); }
function hide(id){ $(id).classList.remove('show'); if(id==='homeOv') document.body.classList.remove('at-home'); }
function hideAll(){ ['winOv','lvOv','homeOv','endlessOv','setOv','wardOv','badgeOv'].forEach(hide); }
function anyOverlay(){ return ['winOv','lvOv','homeOv','genOv','endlessOv','introOv','resetOv','setOv','wardOv','badgeOv'].some(id=>$(id).classList.contains('show')); }
function renderMute(){ if($('homeSound')){ const hb=$('homeSound'); hb.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off'); setTimeout(()=>{ hb.innerHTML=$('muteBtn').innerHTML; },0); } const b=$('muteBtn'); b.setAttribute('aria-pressed',String(muted)); b.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');
  b.innerHTML = muted
   ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
   : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>'; }

// ---------- endless meadow ----------
const DIFF_NAME={easy:'Easy',medium:'Medium',hard:'Hard'};
const FEATURES=[['flags','Flags'],['buttons','Flower buttons'],['leaves','Wet leaves'],['fruit','Fruit'],['keys','Keys & gates'],['portals','Tunnels'],['dry','Dry patches'],['rain','Rain'],['rivers','Rivers'],['snails','Snails']];
const ADJ=['Clover','Mossy','Sunny','Dewy','Puddle','Bramble','Tulip','Daisy','Mint','Fern','Pebble','Willow','Honey','Petal','Thistle','Bluebell','Acorn','Buttercup'];
const NOUN=['Corner','Patch','Hollow','Nook','Lane','Bend','Meadow','Path','Dell','Knoll','Row','Glade'];
function analyzeCapped(Ld,cap){
  const key=s=>s.segs.map(p=>p[0]+','+p[1]).join(';')+'|'+s.grid.map(r=>r.join('')).join('')+'|'+s.keys+(s.raining?'r':'')+'|'+(s.snails||[]).map(n=>n.x+','+n.y+','+n.dx+','+n.dy).join(';');
  const s0=initState(Ld), id=new Map([[key(s0),0]]), states=[s0], edges=[[]], par=[-1], pd=[''], wins=[]; let best=-1;
  for(let i=0;i<states.length;i++){ if(states.length>cap) return null; const s=states[i];
    for(const d of ['N','S','W','E']){ const r=step(s,d); if(r.blocked) continue;
      if(r.state.status==='won'){ wins.push(i); if(best<0) best=i*4+'NSWE'.indexOf(d); continue; }
      const k=key(r.state); let j=id.get(k); if(j===undefined){ j=states.length; id.set(k,j); states.push(r.state); edges.push([]); par.push(i); pd.push(d); } edges[i].push(j); } }
  if(best<0) return {par:0};
  let i=Math.floor(best/4), sol='NSWE'[best%4]; while(i>0){ sol=pd[i]+sol; i=par[i]; }
  const rev=states.map(()=>[]); edges.forEach((es,i)=>es.forEach(j=>rev[j].push(i)));
  const good=new Set(wins), st=[...wins]; while(st.length){ const x=st.pop(); for(const q of rev[x]) if(!good.has(q)){ good.add(q); st.push(q); } }
  return {par:sol.length, sol, states:states.length, good:good.size};
}
function genCandidate(r,diff,o){
  const ri=n=>Math.floor(r()*n), pick=a=>a[ri(a.length)];
  const cfg={easy:{w:[5,6],h:[5,7],fill:.5,len:3,flags:1,dry:.14,cap:12000},medium:{w:[6,7],h:[6,8],fill:.56,len:3,flags:2,dry:.2,cap:25000},hard:{w:[7,8],h:[7,9],fill:.5,len:r()<.6?4:3,flags:2,dry:.3,cap:12000}}[diff];
  if(o.size){ cfg.w=o.size.w; cfg.h=o.size.h; } if(o.fill) cfg.fill=o.fill; if(o.dryRate!=null) cfg.dry=o.dryRate;
  const W=cfg.w[0]+ri(cfg.w[1]-cfg.w[0]+1), H=cfg.h[0]+ri(cfg.h[1]-cfg.h[0]+1);
  const g=Array.from({length:H},()=>Array(W).fill(' ')); const target=Math.floor(W*H*cfg.fill); let cnt=0;
  const walkers=[[W>>1,H>>1],[W>>1,H>>1],[ri(W),ri(H)]];
  for(let t=0;t<4000&&cnt<target;t++){ const w=walkers[t%walkers.length]; if(g[w[1]][w[0]]===' '){ g[w[1]][w[0]]='.'; cnt++; }
    const d=pick([[1,0],[-1,0],[0,1],[0,-1]]); const nx=w[0]+d[0], ny=w[1]+d[1]; if(nx>=0&&ny>=0&&nx<W&&ny<H){ w[0]=nx; w[1]=ny; } }
  const at=(x,y)=>(x<0||y<0||x>=W||y>=H)?' ':g[y][x];
  if(o.rivers){ const vert=r()<.5; const N=vert?W:H, M=vert?H:W; const idx=1+ri(N-2);
    for(let k=0;k<M;k++){ if(vert) g[k][idx]='~'; else g[idx][k]='~'; }
    const spots=[]; for(let k=0;k<M;k++){ const a=vert?at(idx-1,k):at(k,idx-1), b=vert?at(idx+1,k):at(k,idx+1); if(a!==' '&&b!==' ') spots.push(k); }
    if(!spots.length) return null; const nb=Math.min(spots.length,1+ri(2));
    for(let i=0;i<nb;i++){ const k=spots.splice(ri(spots.length),1)[0]; const ch=r()<.5?'=':'|'; if(vert) g[k][idx]=ch; else g[idx][k]=ch; } }
  const floor=()=>{ const f=[]; for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(g[y][x]==='.') f.push([x,y]); return f; };
  // worm in a straight line
  let worm=null; for(let t=0;t<120&&!worm;t++){ const f=floor(); if(!f.length) return null; const s=pick(f), d=pick([[1,0],[-1,0],[0,1],[0,-1]]);
    const segs=[]; for(let i=0;i<cfg.len;i++){ const x=s[0]+d[0]*i, y=s[1]+d[1]*i; if(at(x,y)!=='.') break; segs.push([x,y]); } if(segs.length===cfg.len) worm=segs; }
  if(!worm) return null; const used=new Set(worm.map(p=>p+''));
  // exit far from the head
  const dist={}; const q=[worm[0]]; dist[worm[0]+'']=0;
  while(q.length){ const c=q.shift(); for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){ const n=[c[0]+d[0],c[1]+d[1]], ch=at(n[0],n[1]); if(ch===' '||ch==='~'||dist[n+'']!==undefined) continue; dist[n+'']=dist[c+'']+1; q.push(n); } }
  const reach=floor().filter(p=>dist[p+'']!==undefined&&!used.has(p+'')).sort((a,b)=>dist[b+'']-dist[a+'']);
  if(reach.length<6) return null; const ex=reach[ri(Math.max(1,Math.floor(reach.length*.2)))]; g[ex[1]][ex[0]]='E'; used.add(ex+'');
  const free=(filter)=>{ const f=floor().filter(p=>!used.has(p+'')&&(!filter||filter(p))); if(!f.length) return null; const p=pick(f); used.add(p+''); return p; };
  const put=(c,filter)=>{ const p=free(filter); if(p) g[p[1]][p[0]]=c; return p; };
  const corridor=p=>{ let n=0; for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){ const ch=at(p[0]+d[0],p[1]+d[1]); if(ch!==' '&&ch!=='~') n++; } return n===2; };
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
    for(let t=0;t<30&&made<(diff==='easy'?1:2);t++){ const f=floor().filter(p=>!used.has(p+'')); if(!f.length) break; const p=pick(f), d=pick([[1,0],[-1,0],[0,1],[0,-1]]); const run=[];
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
  return {name:pick(ADJ)+' '+pick(NOUN), exitLen, worm, map:g.map(row=>row.join('')), rain:false};
}
function usage(Ld,sol){ let s=initState(Ld); const u=new Set();
  for(const d of sol){ const r=step(s,d); const ev=r.ev||{}; if(ev.slide) u.add('leaves'); const hd=r.state&&r.state.segs[0]; if(hd&&tileAt(s,hd[0],hd[1])==='H') u.add('buttons'); if(ev.portal) u.add('portals'); if(ev.rain!==undefined) u.add('rain'); if(ev.swung&&ev.swung.length) u.add('rivers');
    if(ev.eaten==='+'||ev.eaten==='-') u.add('fruit'); const h0=r.state&&r.state.segs[0]; if(h0&&r.state.snails&&r.state.snails.some(n=>Math.abs(n.x-h0[0])+Math.abs(n.y-h0[1])<=1)) u.add('snails'); if(ev.eaten==='G') u.add('keys'); if(ev.crumbled&&ev.crumbled.length) u.add('dry'); s=r.state; } return u; }
async function generateEndless(diff,o,seed,fixedTries){
  const r=rng(seed); const budget={easy:1400,medium:2600,hard:4800}[diff]; const t0=performance.now(); let best=null, bestScore=-1e9, n=0;
  const enabled=['fruit','keys','portals','dry','rain','rivers','snails','buttons','leaves'].filter(k=>o[k]); const needUse=Math.min(enabled.length,diff==='easy'?1:2);
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
  const feats=FEATURES.filter(([k])=>k!=='flags'&&o[k]&&best.map.join('').match({buttons:/H/,leaves:/i/,fruit:/[+-]/,keys:/K/,portals:/1/,dry:/x/,rain:/R/,rivers:/L|=|\|/,snails:/[<>^v]/}[k])).map(([,n])=>n.toLowerCase());
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
  let def=null; try{ const c=JSON.parse(localStorage.getItem('squirm-daily-patch')||'null'); if(c&&c.daily===k) def=c; }catch(e){}
  if(!def){ def=await generateEndless('medium',{...DAILY_OPTS},seed,30); def.daily=k; try{ localStorage.setItem('squirm-daily-patch',JSON.stringify(def)); }catch(e){} } def.name="Today's patch"; def.hint='The same patch for every gardener today.';
  hide('genOv'); generating=false; mode='endless'; startLevel(def,true); enterGame(); }
let generating=false, prefetch=null;
const optsKey=()=>endlessDiff+JSON.stringify(endlessOpts);
function startPrefetch(){ const k=optsKey(); const seed=(Math.random()*2**31)|0; prefetch={k,p:generateEndless(endlessDiff,{...endlessOpts},seed)}; }
async function newEndless(){ if(generating) return; generating=true; hideAll(); clearResume();
  try{ localStorage.setItem('squirm-endless-opts',JSON.stringify({opts:endlessOpts,diff:endlessDiff})); }catch(e){}
  let def; if(prefetch&&prefetch.k===optsKey()){ const p=prefetch.p; prefetch=null; show('genOv'); def=await p; }
  else { prefetch=null; show('genOv'); $('genText').textContent=endlessDiff==='hard'?'Hard patches take a moment to grow...':'Planting seeds...'; def=await generateEndless(endlessDiff,{...endlessOpts},(Math.random()*2**31)|0); }
  hide('genOv'); generating=false;
  mode='endless'; startLevel(def,true); saveResume(); enterGame(); }
function continueEndless(){ const r=readResume('endless'); if(r&&r.def&&r.diff&&!r.def.daily){ endlessDiff=r.diff; mode='endless'; hideAll(); startLevel(r.def,false); enterGame(); return true; } return false; }

// ---------- home ----------
// ---------- native back button: a small stack of layers mirrored in browser history ----------
const layers=[]; let ignorePop=0;
function pushLayer(n){ layers.push(n); try{ window.history.pushState({squirm:layers.length},''); }catch(e){} }
function popLayer(n){ const i=layers.lastIndexOf(n); if(i<0) return; const k=layers.length-i; layers.length=i; ignorePop++; try{ window.history.go(-k); }catch(e){ ignorePop--; } }
function enterGame(){ const top=layers[layers.length-1];
  if(top==='game') return;
  if(layers.includes('game')){ popLayer(layers[layers.indexOf('game')+1]); return; }
  if(top==='list'||top==='endless'){ layers[layers.length-1]='game'; try{ window.history.replaceState({squirm:layers.length},''); }catch(e){} return; }
  pushLayer('game'); }
window.addEventListener('popstate',()=>{ if(ignorePop>0){ ignorePop--; return; } const top=layers.pop();
  if(top==='intro') closeIntro(true);
  else if(top==='reset') hide('resetOv');
  else if(top==='settings') hide('setOv');
  else if(top==='wardrobe') hide('wardOv');
  else if(top==='badges') hide('badgeOv');
  else if(top==='endless') hide('endlessOv');
  else if(top==='list') hide('lvOv');
  else if(top==='win'){ hide('winOv'); if(layers.includes('game')) popLayer('game'); showHome(); }
  else if(top==='game'){ hideAll(); showHome(); } });

// ---------- home ----------
function showHome(){ if(updateReady){ location.reload(); return; } document.title='Squirm'; renderHome(); show('homeOv'); }
function renderHome(){
  const cleared=LEVELS.filter((l,i)=>isCleared(i)).length, stars=LEVELS.reduce((a,l)=>a+(progress.stars[l.name]||0),0);
  $('gSub').textContent=`${cleared} of ${LEVELS.length} patches, ${stars} of ${LEVELS.length*3} stars`;
  const tot=['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0);
  $('eSub').textContent= tot ? `${tot} patches grown and cleared` : 'Fresh patches, forever';
  const k=todayKey(), dr=progress.daily.results[k]; $('dailyDay').textContent=new Date().getDate();
  const mid=new Date(); mid.setHours(24,0,0,0); const left=Math.max(1,Math.ceil((mid-new Date())/60000)), wait=left>=60?`${Math.floor(left/60)}h ${left%60}m`:`${left}m`;
  $('dailyBtn').classList.toggle('done',!!dr); $('dailySub').textContent = dr ? `Done in ${dr.moves} moves. Next one in ${wait}.` : (progress.daily.streak?`Keep your ${progress.daily.streak} day streak going`:'One patch for everyone today');
  $('dailyWeek').innerHTML=[6,5,4,3,2,1,0].map(n=>{ const d=new Date(); d.setDate(d.getDate()-n); return `<i class="${progress.daily.results[dateKey(d)]?'on':''} ${n?'':'today'}"></i>`; }).join('');
  const ni=nextGardenIndex(), started=LEVELS.some((l,i)=>isCleared(i));
  $('playTitle').textContent=started?'Continue':'Play'; $('playSub').textContent=`Patch ${ni+1} · ${LEVELS[ni].name}`;
  renderMute(); renderHaptic();
}
function renderWardrobe(){ renderSwatches();
  $('hatGrid').innerHTML=HATS.map(h=>{ const ok=hatUnlocked(h), ch=CHAPTERS[h[2]];
    return `<button data-h="${h[0]}" class="hat ${h[0]===hatId?'on':''} ${ok?'':'locked'}" aria-pressed="${h[0]===hatId}"><span class="hat-ico" aria-hidden="true">${ok?HAT_ICON[h[0]]:'&#128274;'}</span><b>${h[1]}</b><small>${ok?(h[0]===hatId?'Wearing':'Tap to wear'):`Finish ${ch?ch.name:'a chapter'}`}</small></button>`; }).join('');
  $('hatGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{ const h=HATS.find(x=>x[0]===b.dataset.h);
    if(!hatUnlocked(h)){ sfx('bump'); toast(`Finish every patch in ${CHAPTERS[h[2]].name} to earn the ${h[1].toLowerCase()}.`,2800); return; }
    hatId=h[0]; try{ localStorage.setItem('squirm-hat',hatId); }catch(e){} dressHat(hHead); dressHat(segMeshes[0]); if(hHead) homeReact(hatId==='none'?'wow':'joy'); sfx('ready'); renderWardrobe(); }); }
$('wardBtn').onclick=()=>{ ensureAudio(); renderWardrobe(); show('wardOv'); pushLayer('wardrobe'); };
$('wardClose').onclick=()=>{ hide('wardOv'); popLayer('wardrobe'); };
function renderSwatches(){ const have=coloursUnlocked();
  $('swatches').innerHTML=WORM_COLS.map((c,i)=>{ const locked=i>=have, hex='#'+c[1].toString(16).padStart(6,'0');
    return `<button data-i="${i}" class="${i===wormCol?'on':''} ${locked?'locked':''}" style="--sw:${hex}" aria-pressed="${i===wormCol}" aria-label="${c[0]} worm${locked?`, unlocks at ${c[3]} stars`:''}">${locked?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="3" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="#FFF8EA"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>':''}</button>`; }).join('');
  $('swatches').querySelectorAll('button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i, c=WORM_COLS[i];
    if(i>=coloursUnlocked()){ sfx('bump'); toast(`${c[0]} unlocks at ${c[3]} stars. You have ${starTotal()}.`,2600); return; }
    wormCol=i; try{ localStorage.setItem('squirm-colour',String(i)); }catch(e){} applyWormColour(); if(hHead) homeReact('joy'); renderWardrobe(); }); }
function renderEndless(){
  $('diffSeg').innerHTML=['easy','medium','hard'].map(d=>`<button role="radio" aria-checked="${d===endlessDiff}" data-d="${d}" class="${d===endlessDiff?'on':''}"><b>${DIFF_NAME[d]}</b><small>${progress.endless[d].cleared} cleared</small></button>`).join('');
  $('diffSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{ endlessDiff=b.dataset.d; buzz(8); renderEndless(); });
  $('featGrid').innerHTML=FEATURES.map(([k,n])=>`<button role="checkbox" aria-checked="${!!endlessOpts[k]}" data-k="${k}" class="feat ${endlessOpts[k]?'on':''}"><span class="box">${endlessOpts[k]?'&#10003;':''}</span>${n}</button>`).join('');
  $('featGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{ endlessOpts[b.dataset.k]=!endlessOpts[b.dataset.k]; buzz(8); renderEndless(); });
  const e=progress.endless[endlessDiff];
  $('eStats').innerHTML=`<span class="pill">Streak ${e.streak}</span><span class="pill">Best streak ${e.best}</span><span class="pill">${ICON.star} ${e.stars}</span>`;
  const r=readResume('endless'); $('homeEndlessCont').hidden=!(r&&r.def&&!r.def.daily&&r.diff===endlessDiff);
}
// the patch to continue with: the current one, or the next if the current one is already cleared
function nextGardenIndex(){ const i=currentGardenIndex(); if(!isCleared(i)) return i;
  for(let j=i+1;j<LEVELS.length;j++) if(!isCleared(j)&&isUnlocked(j)) return j; return i; }
$('homePlay').onclick=()=>{ ensureAudio(); hideAll(); loadLevel(nextGardenIndex()); enterGame(); };
$('homeGarden').onclick=()=>{ ensureAudio(); renderLevelList(); show('lvOv'); pushLayer('list'); };
$('homeEndless').onclick=()=>{ ensureAudio(); renderEndless(); show('endlessOv'); pushLayer('endless'); };
$('endlessClose').onclick=()=>{ hide('endlessOv'); popLayer('endless'); };
$('endlessGo').onclick=()=>{ hide('endlessOv'); newEndless(); };
$('surprise').onclick=()=>{ const ks=['fruit','keys','portals','dry','rain','rivers','snails','buttons','leaves']; ks.forEach(k=>endlessOpts[k]=false); endlessOpts.flags=Math.random()<.8;
  const n=2+Math.floor(Math.random()*2); for(let i=0;i<n;i++) endlessOpts[ks[Math.floor(Math.random()*ks.length)]]=true; sfx('ready'); renderEndless(); };
$('dailyBtn').onclick=()=>{ ensureAudio(); const r=readResume('endless'); if(r&&r.def&&r.def.daily===todayKey()){ mode='endless'; hideAll(); startLevel(r.def,false); enterGame(); return; } startDaily(); };
$('homeEndlessCont').onclick=()=>{ hide('endlessOv'); continueEndless(); };
$('lvClose').onclick=()=>{ hide('lvOv'); popLayer('list'); };
$('homeSound').onclick=()=>$('muteBtn').onclick();
// colour theme: follow the system, or force light or dark
const THEMES=['auto','light','dark'];
let theme='auto'; try{ theme=localStorage.getItem('squirm-theme')||'auto'; }catch(e){} if(!THEMES.includes(theme)) theme='auto';
function applyTheme(){ if(theme==='auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=theme;
  $('setTheme').querySelectorAll('button').forEach(b=>{ const on=b.dataset.t===theme; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); }); }
$('setTheme').querySelectorAll('button').forEach(b=>b.onclick=()=>{ theme=b.dataset.t; try{ localStorage.setItem('squirm-theme',theme); }catch(e){} applyTheme(); });
applyTheme();

// ---------- settings: toggles, save backup, start over ----------
function renderSettings(){ $('setMusic').setAttribute('aria-checked',String(musicOn)); $('setMusicVol').value=Math.round(musicVol*100); $('setMusicVol').disabled=!musicOn; $('setSound').setAttribute('aria-checked',String(!muted)); $('setHaptic').setAttribute('aria-checked',String(hapticsOn)); applyTheme();
  $('saveCode').hidden=true; $('saveCode').value=''; $('saveLoad').textContent='Restore'; }
$('settingsBtn').onclick=()=>{ ensureAudio(); renderSettings(); show('setOv'); pushLayer('settings'); };
$('setClose').onclick=()=>{ hide('setOv'); popLayer('settings'); renderHome(); };
$('setSound').onclick=()=>{ $('muteBtn').onclick(); renderSettings(); };
$('setHaptic').onclick=()=>{ $('hapticBtn').onclick(); renderSettings(); };
$('setMusicVol').oninput=e=>{ musicVol=e.target.value/100; try{ localStorage.setItem('squirm-music-vol',String(musicVol)); }catch(err){} ensureAudio(); musicTick(); };
$('setMusic').onclick=()=>{ musicOn=!musicOn; try{ localStorage.setItem('squirm-music',musicOn?'1':'0'); }catch(e){} ensureAudio(); renderSettings(); if(musicOn&&muted) toast('Turn sound on to hear the music.',2400); };
$('setReset').onclick=()=>{ hide('setOv'); popLayer('settings'); askReset(); };
// a save code is every squirm- key (except throwaway ones) as base64 JSON with a version prefix
const SAVE_PREFIX='SQUIRM1:', SAVE_SKIP=['squirm-quality','squirm-offline-told','squirm-daily-patch'];
function saveCode(){ const d={}; try{ for(const k of Object.keys(localStorage)) if(k.startsWith('squirm-')&&!SAVE_SKIP.includes(k)) d[k]=localStorage.getItem(k); }catch(e){}
  return SAVE_PREFIX+btoa(unescape(encodeURIComponent(JSON.stringify(d)))); }
function readSaveCode(code){ code=String(code||'').trim(); if(!code.startsWith(SAVE_PREFIX)) return null;
  try{ const d=JSON.parse(decodeURIComponent(escape(atob(code.slice(SAVE_PREFIX.length))))); if(!d||typeof d!=='object'||!d['squirm-progress']) return null;
    for(const k in d) if(!k.startsWith('squirm-')||typeof d[k]!=='string') return null; JSON.parse(d['squirm-progress']); return d; }catch(e){ return null; } }
$('saveCopy').onclick=async()=>{ const c=saveCode(); try{ await navigator.clipboard.writeText(c); toast('Save code copied. Keep it somewhere safe.',2600); }
  catch(e){ const t=$('saveCode'); t.hidden=false; t.value=c; t.focus(); t.select(); toast('Copy the code from the box.',2600); } };
$('saveLoad').onclick=()=>{ const t=$('saveCode');
  if(t.hidden||!t.value.trim()){ t.hidden=false; t.value=''; t.focus(); $('saveLoad').textContent='Load it'; return; }
  const d=readSaveCode(t.value); if(!d){ sfx('bump'); toast("That code doesn't look right. Check it was copied in full.",3000); return; }
  try{ Object.keys(localStorage).filter(k=>k.startsWith('squirm-')&&!SAVE_SKIP.includes(k)).forEach(k=>localStorage.removeItem(k)); for(const k in d) localStorage.setItem(k,d[k]); }catch(e){ toast("Couldn't save on this device.",2600); return; }
  buzz([20,40,20]); location.reload(); };

// ---------- badges: small goals, checked after wins and after moves that bump a counter ----------
progress.badges=progress.badges||{}; progress.stats=Object.assign({slides:0,hedges:0,fruit:0},progress.stats||{}); progress.clean=progress.clean||{};
const anyChapter=f=>CHAPTERS.some(ch=>{ for(let i=ch.from;i<=ch.to;i++) if(!f(i)) return false; return true; });
const BADGES=[
  ['first','&#127793;','First wiggle','Finish your first patch.',c=>c&&c.won],
  ['par','&#127919;','Right on par','Finish a patch in par moves or fewer.',c=>c&&c.won&&c.mv<=c.par],
  ['chapter','&#128215;','Chapter done','Finish every patch in a chapter.',()=>anyChapter(isCleared)],
  ['clean','&#128161;','All by myself','Finish a whole chapter without using a hint.',()=>anyChapter(i=>progress.clean[LEVELS[i].name])],
  ['stars50','&#11088;','Star gazer','Collect 50 stars in the garden.',()=>starTotal()>=50],
  ['stars150','&#127775;','Constellation','Collect 150 stars in the garden.',()=>starTotal()>=150],
  ['garden','&#127969;','The whole garden','Finish every garden patch.',()=>LEVELS.every((l,i)=>isCleared(i))],
  ['daily','&#128197;','Early bird','Finish a daily patch.',()=>Object.keys(progress.daily.results).length>0],
  ['streak7','&#128467;','Week of wiggles','Keep a seven day daily streak.',()=>progress.daily.best>=7],
  ['meadow','&#127806;','Meadow wanderer','Clear ten endless patches.',()=>['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0)>=10],
  ['brave','&#128170;','Brave little worm','Clear a hard endless patch.',()=>progress.endless.hard.cleared>0],
  ['slides','&#127811;','Slip and slide','Slide across 50 wet leaves.',()=>progress.stats.slides>=50],
  ['hedges','&#127795;','Green thumb','Open hedges 20 times.',()=>progress.stats.hedges>=20],
  ['snacks','&#127825;','Snack attack','Eat 30 peaches and mushrooms.',()=>progress.stats.fruit>=30],
  ['owl','&#129417;','Night owl','Finish a patch between 10 pm and 5 am.',c=>c&&c.won&&(c.hour>=22||c.hour<5)],
  ['quick','&#9889;','Quick crawl','Finish a patch with a par of 10 or more in under 30 seconds.',c=>c&&c.won&&c.par>=10&&c.secs<30]];
// returns the badges earned just now; quiet ones (earned before badges existed) don't celebrate
function checkBadges(ctx,quiet){ const got=[];
  for(const b of BADGES){ if(progress.badges[b[0]]) continue; let ok=false; try{ ok=!!b[4](ctx); }catch(e){} if(ok){ progress.badges[b[0]]=Date.now(); got.push(b); } }
  if(got.length){ save(); if(!quiet) setTimeout(()=>{ sfx('badge'); toast(`Badge earned: ${got[0][2].replace(/&[^;]+;/g,'')}${got.length>1?` and ${got.length-1} more`:''}!`,3200); },ctx&&ctx.won?1400:200); }
  return got; }
function bumpStat(k,n=1){ progress.stats[k]=(progress.stats[k]||0)+n; }
function renderBadges(){ const n=Object.keys(progress.badges).length;
  $('badgeCount').textContent=`${n} of ${BADGES.length} earned`;
  $('badgeGrid').innerHTML=BADGES.map(b=>{ const t=progress.badges[b[0]];
    return `<div class="badge-card ${t?'on':''}"><span class="medal" aria-hidden="true">${t?b[1]:'&#128274;'}</span><span><b>${b[2]}</b><small>${b[3]}${t?` <i>${new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</i>`:''}</small></span></div>`; }).join(''); }
$('badgeBtn').onclick=()=>{ ensureAudio(); renderBadges(); show('badgeOv'); pushLayer('badges'); };
$('badgeClose').onclick=()=>{ hide('badgeOv'); popLayer('badges'); };

// ---------- secret reset ----------
function askReset(){ sfx('stuck'); show('resetOv'); pushLayer('reset'); }
$('resetNo').onclick=()=>{ hide('resetOv'); popLayer('reset'); if(hHead) applyExpr(hHead,'joy'); };
$('resetYes').onclick=()=>{ try{ Object.keys(localStorage).filter(k=>k.startsWith('squirm-')).forEach(k=>localStorage.removeItem(k)); }catch(e){}
  buzz([40,60,40]); location.reload(); };

// ---------- the worm on the home screen: just the head, full of personality ----------
const homeCanvas=$('homeWorm'); let homeR=null, hScene, hCam, hHead, hExprT=0, hBlink=2, hReactT=0;
function initHomeWorm(){ try{ homeR=new THREE.WebGLRenderer({canvas:homeCanvas,antialias:true,alpha:true}); }catch(e){ return; }
  homeR.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); homeR.setSize(220,150,false);
  hScene=new THREE.Scene(); hScene.add(new THREE.HemisphereLight(0xfffaf0,0xb7d79a,.32)); hScene.add(new THREE.AmbientLight(0xfff4e2,.2));
  const d=new THREE.DirectionalLight(0xfff1dc,.6); d.position.set(-2,4,3); hScene.add(d);
  hCam=new THREE.PerspectiveCamera(24,220/150,.1,50); hCam.position.set(0,.4,3.5); hCam.lookAt(0,.4,0);
  hHead=makeSeg(0,hScene); hHead.position.set(0,.34,0); hHead.scale.setScalar(1.45); applyExpr(hHead,'grin');
  // tap: a happy reaction. Hold for 3 seconds: the secret reset (the worm gets more and more worried)
  let holdT=null, holdStart=0, held=false;
  const endHold=()=>{ clearInterval(holdT); holdT=null; if(hHead) hHead.userData.shake=0; };
  homeCanvas.addEventListener('pointerdown',e=>{ ensureAudio(); held=false; holdStart=performance.now(); clearInterval(holdT);
    holdT=setInterval(()=>{ const t=(performance.now()-holdStart)/1000; if(t<.6) return;
      if(hHead){ hHead.userData.shake=Math.min(1,(t-.6)/2.4); if(hHead.userData.expr!=='wow') applyExpr(hHead,'wow'); }
      if(Math.floor(t*4)!==Math.floor((t-.05)*4)) buzz(Math.round(6+t*6));
      if(t>=3){ endHold(); held=true; askReset(); } },50); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>homeCanvas.addEventListener(ev,()=>{ const short=holdT && performance.now()-holdStart<600; endHold();
    if(short&&!held){ homeReact(EXPRS[Math.floor(Math.random()*EXPRS.length)]); sfx('grow'); } else if(!held && hHead) applyExpr(hHead,'smile'); }));
  homeCanvas.addEventListener('contextmenu',e=>e.preventDefault());
  homeCanvas.addEventListener('keydown',e=>{ if(e.key!=='Enter'&&e.key!==' ') return; e.preventDefault(); ensureAudio(); homeReact(EXPRS[Math.floor(Math.random()*EXPRS.length)]); sfx('grow'); });
}
function homeReact(e){ if(!hHead) return; applyExpr(hHead,e); hReactT=1.4; hExprT=0; const b=hHead.userData.body;
  tween(380,(x,k)=>{ const s=1+Math.sin(k*Math.PI)*.14; b.scale.set(s,1/s,s); b.position.y=Math.sin(k*Math.PI)*.12; },()=>{ b.scale.set(1,1,1); b.position.y=0; }); }
function renderHomeWorm(dt){ if(!homeR) return; const t=idleT;
  const sk=hHead.userData.shake||0; hHead.position.x=Math.sin(t*60)*.03*sk;
  hHead.position.y=.34+Math.sin(t*2.2)*.03; hHead.rotation.y=Math.sin(t*.8)*.28; hHead.rotation.z=Math.sin(t*1.1)*.06; hHead.userData.body.rotation.x=-.1+Math.sin(t*.6)*.08;
  hExprT+=dt/1000; if(hReactT>0) hReactT-=dt/1000; else if(hExprT>2.8){ hExprT=0; let e; do{ e=EXPRS[Math.floor(Math.random()*EXPRS.length)]; }while(e===hHead.userData.expr); applyExpr(hHead,Math.random()<.3?'smile':e); }
  hBlink-=dt/1000; let bl=1; if(hBlink<0){ bl=Math.max(.08,Math.abs(hBlink+.07)/.07); if(hBlink<-.14) hBlink=1.6+Math.random()*2.5; }
  hHead.userData.face.eyes.forEach(e=>{ const s=e.userData.baseS||1; e.scale.set(s,s*(e.userData.baseY||1)*bl,s); });
  homeR.render(hScene,hCam); }

// ---------- first time you meet a mechanic ----------
const MECH={
  basics:{t:'Crawl to the burrow',d:'Swipe to crawl. The burrow only fits a worm of the exact length on its sign.',k:/E/,i:'<svg width="40" height="40" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="10" cy="16.5" rx="8" ry="4.6" fill="#B07B57"/><ellipse cx="10" cy="16.2" rx="4.8" ry="2.5" fill="#3A2A22" stroke="none"/><path d="M18.5 15V9.5" fill="none"/><rect x="14.5" y="3" width="8" height="6.5" rx="1.5" fill="#D9A56E"/><text x="18.5" y="8.1" font-size="5.5" font-family="sans-serif" font-weight="800" text-anchor="middle" fill="#5B4436" stroke="none">3</text></svg>'},
  flags:{t:'Flags',d:'Touch every flag before the burrow will let you in.',k:/C/,i:'<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V3"/><path d="M6 4h12l-3 4 3 4H6" fill="#F27DA2"/></svg>'},
  fruit:{t:'Peaches and mushrooms',d:'A peach makes you one longer. A mushroom makes you one shorter. Shorter worms can turn in tight spots.',k:/[+-]/,i:'<svg width="40" height="40" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><circle cx="7.5" cy="14.5" r="5.3" fill="#FFA27C"/><path d="M7.5 9.2c0-1.4.5-2.5 1.4-3.1" fill="none"/><path d="M8.9 6.6c1.5-1.3 3.3-1.2 4-.3-1.1 1.3-2.7 1.5-4 .3z" fill="#6CC97A"/><rect x="16.4" y="13.6" width="3.2" height="6" rx="1.2" fill="#FFF1DE"/><path d="M13.2 14.2a4.8 4.8 0 0 1 9.6 0z" fill="#B79CF2"/><circle cx="16.4" cy="11.6" r=".8" fill="#fff" stroke="none"/><circle cx="19.4" cy="10.9" r=".9" fill="#fff" stroke="none"/></svg>'},
  keys:{t:'Keys and gates',d:'Pick up a key to open one wooden gate. Each key works once.',k:/[KG]/,i:'<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="8" r="4.5" fill="#F7C64F"/><path d="M11 11l8 8M16 16l2-2M18.5 18.5l2-2"/></svg>'},
  dry:{t:'Dry patches',d:'Cracked ground sinks into the soil once your tail leaves it. You only get one visit.',k:/x/,i:'<svg width="40" height="40" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#EBD59C" stroke="#5B4436" stroke-width="1.6"/><path d="M6 8l5 3 2 6 4 2M11 11l6-3" fill="none" stroke="#9A6E52" stroke-width="1.6" stroke-linecap="round"/></svg>'},
  portals:{t:'Tunnels',d:'Worms dig! Crawl into a tunnel and come out of the one marked with the same flowers.',k:/[1-9]/,i:'<svg width="40" height="40" viewBox="0 0 24 24"><ellipse cx="12" cy="14" rx="9" ry="6" fill="#A9744F" stroke="#5B4436" stroke-width="1.5"/><ellipse cx="12" cy="14" rx="5" ry="3.2" fill="#2E2019"/><circle cx="5" cy="9" r="2" fill="#7FCFEA" stroke="#5B4436" stroke-width="1"/><circle cx="19" cy="9" r="2" fill="#7FCFEA" stroke="#5B4436" stroke-width="1"/></svg>'},
  rain:{t:'Rain',d:'Step on a cloud stone to start or stop the rain. Rain grows seedlings into leaves you can cross, and fills puddles so you can\'t.',k:/[Rsw]/,i:'<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5B4436" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 5.5 4 4 0 0 1 17.5 14z" fill="#C9D6EA"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" stroke="#6FA9D6"/></svg>'},
  snails:{t:'Snails',d:'A snail slides one tile every time you move and turns around when something blocks it. You cannot crawl through a snail, so time your moves.',k:/[<>^v]/,i:'<svg width="40" height="40" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M18.6 11.4l-.8-3.6M20.6 11.4l1.2-3.3" fill="none"/><circle cx="17.8" cy="7.6" r="1" fill="#5B4436" stroke="none"/><circle cx="21.9" cy="7.9" r="1" fill="#5B4436" stroke="none"/><path d="M2.5 19.6c0-1 .8-1.6 1.8-1.6h12.6l.7-3.6a2.4 2.4 0 0 1 4.7.5V18c0 1-.8 1.6-1.8 1.6z" fill="#F6E2B0"/><circle cx="10" cy="12.6" r="5.6" fill="#C9A0E6"/><path d="M10.2 12.8a1.2 1.2 0 1 1 1.3-1.5 2.6 2.6 0 0 1-2.4 3.7 3.6 3.6 0 0 1-2.5-6" fill="none" stroke="#7D5A9E"/></svg>'},
  buttons:{t:'Flower buttons',d:'Hedges open while any part of you rests on a big flower. Keep your tail on the flower while your head slips through.',k:/[BH]/,i:'<svg width="40" height="40" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M12 21V12.5a2.6 2.6 0 0 1 2.6-2.6 3 3 0 0 1 5.4-1 2.6 2.6 0 0 1 2.5 2.6V21z" fill="#5FA64F"/><g fill="#F7A8C4"><circle cx="5" cy="13.5" r="2.4"/><circle cx="8.6" cy="16" r="2.4"/><circle cx="7.3" cy="20" r="2.4"/><circle cx="2.7" cy="20" r="2.4"/><circle cx="1.4" cy="16" r="2.4"/></g><circle cx="5" cy="17.2" r="1.9" fill="#F7C64F"/></svg>'},
  leaves:{t:'Wet leaves',d:'Dewy leaves are slippery. Crawl onto one and you slide along until you reach dry grass or bump into something.',k:/i/,i:'<svg width="40" height="40" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M3 13c2-6 9-9 18-8-1 9-7 14-14 13-2 0-3.5-2.5-4-5z" fill="#8EE0B4"/><path d="M5 17L17 8" fill="none" stroke="#5DBA8A"/><circle cx="12.5" cy="15.5" r="1.4" fill="#EAF8FF"/><circle cx="16" cy="12" r="1" fill="#EAF8FF"/><path d="M1 21h5M8.5 21h3" fill="none" stroke="#6FA9D6"/></svg>'},
  rivers:{t:'Rivers and bridges',d:'Water blocks the way. Bridges only go along their planks, and a crank swings every bridge you are not standing on.',k:/[~=|L]/,i:'<svg width="40" height="40" viewBox="0 0 24 24" stroke="#5B4436" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><rect x="1.5" y="8" width="21" height="8" rx="2.5" fill="#8CCFEA"/><path d="M3.5 12c1-.8 2-.8 3 0M17.5 12c1-.8 2-.8 3 0" fill="none" stroke="#fff"/><rect x="8.5" y="3.5" width="7" height="17" rx="1.4" fill="#D9A56E"/><path d="M8.5 8h7M8.5 12h7M8.5 16h7" fill="none" stroke="#B98352"/></svg>'},
};
let seenMech={}; try{ seenMech=JSON.parse(localStorage.getItem('squirm-seen')||'{}'); }catch(e){}
let introDone=null;
function newMechanics(){ const m=L.map.join(''); return Object.keys(MECH).filter(k=>!seenMech[k]&&MECH[k].k.test(m)); }
function showIntro(list,done){ $('introBody').innerHTML=`<h2>${list.length===1?'Something new':'New in this patch'}</h2>`+list.map(k=>`<div class="intro-item"><span class="ico">${MECH[k].i}</span><div><b>${MECH[k].t}</b><span>${MECH[k].d}</span></div></div>`).join('');
  list.forEach(k=>seenMech[k]=1); try{ localStorage.setItem('squirm-seen',JSON.stringify(seenMech)); }catch(e){}
  introDone=done; show('introOv'); pushLayer('intro'); sfx('ready'); }
function closeIntro(fromBack){ hide('introOv'); if(!fromBack) popLayer('intro'); const d=introDone; introDone=null; if(d) d(); }
$('introOk').onclick=()=>closeIntro(false);

// ---------- first-time tutorial ----------
function maybeTutorial(){ let done=false; try{ done=localStorage.getItem('squirm-tutorial')==='1'; }catch(e){} if(done||mode!=='garden'||li!==0||history.length) return false; $('tutorial').classList.add('show'); return true; }
function dismissTutorial(){ const t=$('tutorial'); if(!t.classList.contains('show')) return; t.classList.remove('show'); try{ localStorage.setItem('squirm-tutorial','1'); }catch(e){} }

// ---------- levels ----------
function loadLevel(i,withHint=true){ mode='garden'; li=i; startLevel(LEVELS[i],withHint); try{ localStorage.setItem('squirm-current-name',LEVELS[i].name); }catch(e){} }
let nudged=false, playT=0;
const playTime=()=>{ const s=Math.round(playT); return s<60?`${s}s`:`${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`; };
function startLevel(def,withHint=true){ nudged=false; playT=0; pulse(document.querySelector('.plaque'));
  L=def; state=initState(L); history=[]; queue.length=0; slideSteps.length=0; wasReady=false; hintsUsed=0; clearHint();
  buildBoard(); snapWorm(); fitCamera(); updateHUD(true); lastMoveT=idleT;
  const resumed=tryResume(); if(!resumed) clearResume();
  introAnim();
  if(resumed) toast('Picking up where you left off.',2400);
  else if(withHint){ const nm=newMechanics(); if(nm.length) setTimeout(()=>{ if(!$('homeOv').classList.contains('show')&&!$('lvOv').classList.contains('show')) showIntro(nm,()=>maybeTutorial()); },reduceMotion?0:900); else maybeTutorial(); }
  $('skipBtn').hidden = mode!=='endless' || !!L.daily;
}
function introAnim(){ if(reduceMotion) return;
  const items=snailMeshes.map(s=>({o:s,d:.3,y0:s.position.y})); snailMeshes.forEach(s=>s.scale.setScalar(.01)); for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y][x]; [c.tile,c.item].forEach((o,j)=>{ if(o){ items.push({o,d:(x+y)*.035+j*.08,y0:o.position.y}); o.scale.setScalar(.01); } }); }
  const worm=segMeshes.slice(); worm.forEach(s=>s.scale.setScalar(.01)); wormG.visible=false;
  const total=.55+(state.w+state.h)*.035+.35; animating++;
  const back=t=>{ const c1=1.70158, c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
  tween(total*1000,(e,k)=>{ const tt=k*total;
    items.forEach(it=>{ const t=Math.max(0,Math.min(1,(tt-it.d)/.4)); it.o.scale.setScalar(Math.max(.01,back(t))); it.o.position.y=it.y0-(1-t)*.5; });
    const wt=Math.max(0,Math.min(1,(tt-(total-.45))/.4)); wormG.visible=wt>0; worm.forEach(s=>s.scale.setScalar(Math.max(.01,back(wt)))); },
    ()=>{ items.forEach(it=>{ it.o.scale.setScalar(1); it.o.position.y=it.y0; }); worm.forEach(s=>s.scale.setScalar(1)); wormG.visible=true; animating--; if(queue.length) tryMove(queue.shift()); });
}
const CHAPTERS=CHAPTER_NAMES.map((name,k)=>({name,from:k*10,to:Math.min(LEVELS.length-1,k*10+9)}));
const THUMB_COL={'B':'#F7A8C4','H':'#4E8F40','i':'#8EE0B4','<':'#C9A0E6','>':'#C9A0E6','^':'#C9A0E6','v':'#C9A0E6','.':'#B9E49E','x':'#EBD59C','~':'#8CCFEA','=':'#D9A56E','|':'#D9A56E','E':'#3A2A22','C':'#F27DA2','K':'#F7C64F','G':'#C88A55','+':'#FFA27C','-':'#B79CF2','R':'#C9D6EA','w':'#9ED6EF','s':'#7CC95F','L':'#B98352'};
function drawThumb(cv,lv){ const g=cv.getContext('2d'); const h=lv.map.length, w=Math.max(...lv.map.map(r=>r.length)); const s=Math.floor(80/Math.max(w,h)), ox=(88-w*s)/2, oy=(88-h*s)/2;
  g.fillStyle='#9A6A4C'; g.fillRect(0,0,88,88);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const c=lv.map[y][x]||' '; if(c===' ') continue; g.fillStyle=THUMB_COL[c]||(c>='1'&&c<='9'?'#7FCFEA':'#B9E49E'); g.fillRect(ox+x*s+1,oy+y*s+1,s-2,s-2); }
  g.fillStyle='#FF8FAF'; lv.worm.forEach(p=>{ g.fillRect(ox+p[0]*s+2,oy+p[1]*s+2,s-4,s-4); }); }
function renderLevelList(){
  const g=$('lvGrid'); g.innerHTML=''; const stars={}, bests={}; LEVELS.forEach((l,i)=>{ stars[i]=progress.stars[l.name]||0; bests[i]=progress.best[l.name]; });
  const total=Object.values(stars).reduce((a,b)=>a+b,0); $('lvTotal').innerHTML=`${STAR(true,0).replace('width="44" height="44"','width="20" height="20"')} ${total} of ${LEVELS.length*3} stars`;
  CHAPTERS.forEach(ch=>{ const h=document.createElement('div'); h.className='chapter'; let cs=0; for(let i=ch.from;i<=ch.to;i++) cs+=stars[i]||0;
    let allDone=true; for(let i=ch.from;i<=ch.to;i++) if(!isCleared(i)) allDone=false;
    let fresh=ch.from>0&&isUnlocked(ch.from); for(let i=ch.from;i<=ch.to;i++) if(isCleared(i)) fresh=false;
    h.innerHTML=`<span>${ch.name}${allDone?' <small class="done">&#10003;</small>':''}${fresh?' <small class="new">New</small>':''}</span><small>${cs} of ${(ch.to-ch.from+1)*3}</small>`; g.appendChild(h);
    for(let i=ch.from;i<=ch.to;i++){ const lv=LEVELS[i]; const b=document.createElement('button'); b.className='lv'+(i===li?' cur':'');
      const best=bests[i], s=stars[i]||0; if(s===3) b.classList.add('par'); const locked=!isUnlocked(i); if(locked){ b.classList.add('locked'); b.setAttribute('aria-disabled','true'); }
      const mini=[0,1,2].map(j=>`<i class="${j<s?'on':''}"></i>`).join('');
      b.innerHTML=`<canvas class="thumb" width="88" height="88"></canvas><span>${i+1}. ${lv.name}<em class="mini">${mini}</em></span><small>${best?`best ${best}<br>par ${lv.par}`:(locked?'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>':`par ${lv.par}`)}</small>`;
      b.onclick=()=>{ if(locked){ b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); sfx('bump'); const sm=b.querySelector('small'); if(sm) sm.textContent='Clear the one before'; return; } hideAll(); loadLevel(i); enterGame(); }; g.appendChild(b); drawThumb(b.querySelector('canvas'),lv); } });
  setTimeout(()=>{ const c=g.querySelector('.lv.cur'); if(c) c.scrollIntoView({block:'center'}); },30);
}

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
function fitCamera(refit){
  const W=window.innerWidth, H=window.innerHeight; renderer.setSize(W,H,false);
  if(!state) return;
  const top=document.querySelector('header').getBoundingClientRect().bottom+6;
  const bot=document.querySelector('nav').getBoundingClientRect().top-6;
  const availW=W-16, availH=Math.max(120,bot-top); const pts=boardCorners();
  if(refit!==false){ const a=fitFor(TILT,pts,W,H,availW,availH), b=fitFor(90+TILT,pts,W,H,availW,availH); camYaw = b<a*0.95 ? 90+TILT : TILT; }
  const d=fitFor(camYaw,pts,W,H,availW,availH); const bb=measure(camYaw,d,pts,W,H);
  basePos.copy(camera.position);
  const offX=(bb.x0+bb.x1)/2-W/2, offY=(bb.y0+bb.y1)/2-(top+bot)/2;
  camera.setViewOffset(W,H,offX,offY,W,H); camera.updateProjectionMatrix();
  for(const row of cells) for(const c of row) if(c.item) faceCamera(c.item);
  if(refit!==false) placeTrees();
}
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
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('.ov button,.home button,.lv'); if(b&&!b.closest('#homeWorm')) sfx('tap'); });
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
function tapMove(e){
  const ndc=new THREE.Vector2((e.clientX/window.innerWidth)*2-1,-(e.clientY/window.innerHeight)*2+1); camera.updateMatrixWorld();
  ray.setFromCamera(ndc,camera); const p=new THREE.Vector3(); if(!ray.ray.intersectPlane(plane,p)) return; const h=state.segs[0];
  const gx=Math.round(p.x+(state.w-1)/2), gy=Math.round(p.z+(state.h-1)/2); const dx=gx-h[0], dy=gy-h[1];
  if(Math.abs(dx)+Math.abs(dy)!==1) return;
  tryMove(Object.keys(DIRS).find(k=>DIRS[k][0]===dx&&DIRS[k][1]===dy));
}
const KEYMAP={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
window.addEventListener('keydown',e=>{ if(e.ctrlKey||e.metaKey||e.altKey||(e.target&&/^(TEXTAREA|INPUT)$/.test(e.target.tagName))) return; ensureAudio();
  if((e.code==='Enter'||e.code==='Space') && $('winOv').classList.contains('show')){ e.preventDefault(); $('winNext').click(); return; }
  if(e.code==='KeyR' && $('winOv').classList.contains('show')){ e.preventDefault(); $('winReplay').click(); return; }
  if(e.code==='Enter' && calmMoment() && (document.activeElement===document.body||!document.activeElement)){ e.preventDefault(); $('homePlay').click(); return; }
  if((e.code==='Enter'||e.code==='Space') && $('introOv').classList.contains('show')){ e.preventDefault(); closeIntro(false); return; }
  if(KEYMAP[e.code] && !anyOverlay()){ e.preventDefault(); tryMove(dirFromScreen(...KEYMAP[e.code])); }
  else if((e.code==='KeyZ'||e.code==='Backspace'||e.code==='KeyU') && !anyOverlay()){ e.preventDefault(); undo(); }
  else if(e.code==='KeyR' && !anyOverlay()) restart();
  else if(e.code==='KeyH' && !anyOverlay()) showHint();
  else if(e.code==='KeyM') $('muteBtn').onclick();
  else if(e.code==='Escape'){ if(layers.length&&!generating) window.history.back(); }
});

// ---------- buttons ----------
let undoHold=null, undoHeld=false;
$('undoBtn').addEventListener('pointerdown',()=>{ undoHeld=false; clearTimeout(undoHold); undoHold=setTimeout(function rep(){ if(!history.length) return; undoHeld=true; undo(); undoHold=setTimeout(rep,140); },450); });
['pointerup','pointerleave','pointercancel'].forEach(ev=>$('undoBtn').addEventListener(ev,()=>clearTimeout(undoHold)));
$('undoBtn').onclick=()=>{ if(undoHeld){ undoHeld=false; return; } undo(); }; $('hintBtn').onclick=showHint; $('tutorial').onclick=dismissTutorial; $('restartBtn').onclick=restart;
$('levelsBtn').onclick=()=>{ hideAll(); popLayer('game'); showHome(); };
$('skipBtn').onclick=()=>{ if(mode!=='endless'||animating) return; const e=progress.endless[endlessDiff]; e.streak=0; save(); clearResume(); toast('Skipped. Your streak starts over.',2000); newEndless(); };
$('winShare').onclick=async()=>{ try{ if(navigator.share){ await navigator.share({text:shareText}); return; } }catch(e){ return; }
  try{ await navigator.clipboard.writeText(shareText); toast('Result copied. Paste it anywhere.',2200); }catch(e){ toast(shareText,5000); } };
$('winReplay').onclick=()=>{ hideAll(); popLayer('win'); if(mode==='garden') loadLevel(li,false); else startLevel(L,false); };
$('winNext').onclick=()=>{ hideAll(); if(L.daily){ popLayer('game'); showHome(); return; } popLayer('win'); if(mode==='garden') loadLevel(li===LEVELS.length-1?0:li+1); else newEndless(); };
$('muteBtn').onclick=()=>{ ensureAudio(); muted=!muted; try{ localStorage.setItem('squirm-muted',muted?'1':'0'); }catch(e){} renderMute(); if(state) syncWeather(false); if(!muted) sfx('ready'); };
renderMute();
function renderHaptic(){ const b=$('hapticBtn'); b.setAttribute('aria-pressed',String(hapticsOn)); b.setAttribute('aria-label',hapticsOn?'Turn vibration off':'Turn vibration on');
  b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="7.5" y="4" width="9" height="16" rx="2.5"/>'+(hapticsOn?'<path d="M4 9v6M20 9v6M1.5 10.5v3M22.5 10.5v3"/>':'<path d="M3 3l18 18"/>')+'</svg>'; }
$('hapticBtn').onclick=()=>{ hapticsOn=!hapticsOn; try{ localStorage.setItem('squirm-haptics',hapticsOn?'1':'0'); }catch(e){} renderHaptic(); buzz([15,40,15]); };
renderHaptic();

// ---------- loop ----------
let last=performance.now(), last0=last, frameN=0, slowT=0, sampleT=0;
function watchSpeed(ms){ if(quality===0||ms>250) return; sampleT+=ms; if(ms>28) slowT+=ms;
  if(sampleT<4000) return; const slow=slowT/sampleT>.5; sampleT=slowT=0; if(!slow) return;
  quality--; try{ localStorage.setItem('squirm-quality',String(quality)); }catch(e){}
  renderer.setPixelRatio(pixelRatio()); sun.shadow.mapSize.setScalar(1024); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } fitCamera(false); }
function frame(now){
  const dt=Math.min(50,now-last); last=now; idleT+=dt/1000;
  for(let i=tweens.length-1;i>=0;i--){ const t=tweens[i]; if(!t) continue; t.t+=dt; const k=Math.min(1,t.t/t.dur); t.fn(ease(k),k); if(k>=1){ const j=tweens.indexOf(t); if(j>=0) tweens.splice(j,1); t.done&&t.done(); } }
  if(!reduceMotion){
    for(const row of cells) for(const c of row){ const it=c.item; if(!it) continue; const u=it.userData;
      if(u.bob){ u.bob.position.y=Math.sin(idleT*2.4+it.position.x)*.05; if(u.noSpin){ if(u.keyBody) u.keyBody.rotation.z=Math.sin(idleT*1.8+it.position.z)*.25; } else u.bob.rotation.y+=dt*.0012; }
      if(u.swirl) u.swirl.rotation.z-=dt*.003;
      if(u.drops&&u.drops.visible) u.drops.children.forEach(d=>{ const k=(idleT*1.4+d.userData.ph)%1; d.position.y=-.12-k*.3; d.material.opacity=1-k; d.material.transparent=true; });
      if(u.flag){ const pa=u.flag.geometry.attributes.position, b=u.flagBase;
        for(let v=0;v<pa.count;v++){ const x=b[v*3]; pa.array[v*3+2]=Math.sin(x*13-idleT*6)*.04*(x/.42); } pa.needsUpdate=true; }
      if(u.rim){ const s=u.ready?1+Math.sin(idleT*5)*.07:1; u.rim.scale.set(s,s,.8*s); }
    }
    flyers.children.forEach((b,i)=>{ const u=b.userData, t=idleT*.35+u.ph;
      const x=u.c[0]+Math.cos(t)*u.R, z=u.c[1]+Math.sin(t*1.3)*u.R*.7, y=1.3+Math.sin(t*3)*.25;
      const nx=u.c[0]+Math.cos(t+.05)*u.R, nz=u.c[1]+Math.sin((t+.05)*1.3)*u.R*.7;
      b.position.set(x,y,z); b.rotation.y=Math.atan2(nx-x,nz-z);
      const sh=b.userData.shadow; if(sh){ const inBed=Math.abs(x-bedBox.cx)<bedBox.hw&&Math.abs(z-bedBox.cz)<bedBox.hd; const gx=Math.round(x+(state.w-1)/2), gz=Math.round(z+(state.h-1)/2), onTile=tileAt(state,gx,gz)!==' '; sh.position.set(x,onTile?.02:inBed?-.2:-.33,z); const k=1.15-(y-1.05)*.6; sh.scale.setScalar(k); sh.material.opacity=.55+.25*(1.55-y); }
      const f=Math.sin(idleT*22+i)*1.0; b.userData['w-1'].rotation.z=-f; b.userData['w1'].rotation.z=f; });
  }
  if(state&&state.status==='play'&&!anyOverlay()&&!document.hidden) playT+=dt/1000;
  if(!reduceMotion && state) for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y]&&cells[y][x]; if(!c||c.ch!=='x'||!c.tile) continue;
    const on=state.status==='play'&&occupied(x,y); c.tile.rotation.z=on?Math.sin(idleT*31+x*3+y)*.012:0; c.tile.rotation.x=on?Math.cos(idleT*27+x+y*2)*.012:0; }
  if(!nudged && state && state.status==='play' && state.moves>0 && idleT-lastMoveT>45 && !anyOverlay() && !document.body.classList.contains('at-home')){
    nudged=true; toast('Stuck? Tap the bulb for a hint.',3200); pulse($('hintBtn')); }
  if(segMeshes[0]){ const hp=segMeshes[0].position; camTgt.set(THREE.MathUtils.clamp(hp.x*.06,-.35,.35),0,THREE.MathUtils.clamp(hp.z*.06,-.35,.35)); if(reduceMotion) camTgt.set(0,0,0);
    camOff.lerp(camTgt,1-Math.exp(-dt/1000*1.6)); camera.position.copy(basePos).add(camOff); }
  if(!reduceMotion){ fxTimer-=dt;
    if(fxTimer<0){ fxTimer=90;
      for(const row of cells) for(const c of row){ const u=c.item&&c.item.userData; if(u&&c.item.userData.kind==='K'&&Math.random()<.08) sparkle(c.item.position); }
      if(wet>.5) for(let i=0;i<3;i++) splash(); } }
  for(const s of swayers){ const a=(s.amp||1)*.07; s.o.rotation.z=Math.sin(idleT*1.6+s.ph)*a; s.o.rotation.x=Math.cos(idleT*1.3+s.ph)*a*.5; }
  const hp0=segMeshes[0]&&segMeshes[0].position;
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
  updateRain(dt); ambient(dt);
  updateWorm();
  // behind menus the garden is blurred, so a third of the frames is plenty
  const behind=anyOverlay(); frameN++;
  if(!$('genOv').classList.contains('show') && (!behind || frameN%3===0)) renderer.render(scene,camera);
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

// ---------- offline play and install ----------
// A new deploy installs a new worker in the background. Installed apps are usually resumed rather
// than relaunched, so check for one whenever the app comes back to the foreground, and reload into
// the new version at a calm moment: right away on the home screen, otherwise on the way back home.
let updateReady=false;
const calmMoment=()=>$('homeOv').classList.contains('show') && !generating && !['winOv','lvOv','genOv','endlessOv','introOv','resetOv','setOv','wardOv','badgeOv'].some(id=>$(id).classList.contains('show'));
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  const hadWorker=!!navigator.serviceWorker.controller; let controlled=hadWorker, reg=null;
  const check=()=>{ if(reg&&navigator.onLine!==false) reg.update().catch(()=>{}); };
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!controlled){ controlled=true; return; } // first install taking over, same version as this page
    if(updateReady) return; updateReady=true;
    if(calmMoment()) location.reload(); else toast('New patches arrived. They load when you head home.',4000); });
  navigator.serviceWorker.ready.then(()=>{ let told=false; try{ told=localStorage.getItem('squirm-offline-told')==='1'; localStorage.setItem('squirm-offline-told','1'); }catch(e){}
    if(!told&&!hadWorker) setTimeout(()=>toast('Squirm is saved on this device. It plays offline too.',3200),1500); });
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{ reg=r; }).catch(()=>{}));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
  setInterval(check,30*60*1000); }
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; $('installBtn').hidden=false; });
window.addEventListener('appinstalled',()=>{ installEvt=null; $('installBtn').hidden=true; });
$('installBtn').onclick=async()=>{ const e=installEvt; if(!e) return; installEvt=null; $('installBtn').hidden=true; try{ await e.prompt(); }catch(err){} };

// ---------- boot ----------
const start=()=>{ const i=currentGardenIndex(); applyWormColour(); checkBadges(null,true); pickTod(); setInterval(pickTod,60000); initHomeWorm();
  mode='garden'; li=i; startLevel(LEVELS[i],false); requestAnimationFrame(frame); showHome();
  if(new URLSearchParams(location.search).get('play')==='daily'){ try{ window.history.replaceState(null,'',location.pathname); }catch(e){} $('dailyBtn').onclick(); } };
(document.fonts&&document.fonts.ready? document.fonts.ready : Promise.resolve()).then(start);
})();
