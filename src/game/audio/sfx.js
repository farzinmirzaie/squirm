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
