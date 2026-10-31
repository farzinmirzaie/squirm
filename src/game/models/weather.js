// ---------- weather ----------
let wet=0, rainLines=null, rainGain=null, riverGain=null;
const hemi=scene.children.find(o=>o.isHemisphereLight), amb=scene.children.find(o=>o.isAmbientLight);
const lawnDry=new THREE.Color(C.lawn), lawnWet=new THREE.Color(0x6E9E63); const cloudDry=new THREE.Color(C.cloud), cloudWet=new THREE.Color(C.rainCloud);
function buildRain(){
  if(rainLines){ removeObj(rainLines); rainLines=null; }
  if(!L.map.join('').includes('R')) return;
  const N=420, pos=new Float32Array(N*6), sp=new Float32Array(N); const W=state.w+4, D=state.h+4;
  for(let i=0;i<N;i++){ const x=(Math.random()-.5)*W, z=(Math.random()-.5)*D, y=Math.random()*5; pos.set([x,y,z,x+.03,y+.28,z+.03],i*6);
    sp[i]=5+Math.random()*3; }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.userData.sp=sp;
  rainLines=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xEAF6FF,transparent:true,opacity:0})); rainLines.frustumCulled=false;
    scene.add(rainLines);
}
function occupied(x,y){ return state.segs.some(p=>p[0]===x&&p[1]===y); }
function syncWeather(animate){
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y][x]; if(!c.tile) continue; const u=c.tile.userData;
    if(u.leaf){ const want=state.raining||occupied(x,y); if(u.leafOn!==want){ u.leafOn=want; const leaf=u.leaf, s0=leaf.scale.x, s1=want?1:.01;
      leaf.visible=true;
        if(animate){ tween(want?420:300,(e)=>{ leaf.scale.setScalar(s0+(s1-s0)*e); },()=>{ if(!want) leaf.visible=false; }); } else { leaf.scale.setScalar(s1);
          leaf.visible=want; } u.sprout.visible=true; } }
    if(u.water){ const want=state.raining&&!occupied(x,y); if(u.waterOn!==want){ u.waterOn=want; const w=u.water, s0=w.scale.x, s1=want?1:.01; w.visible=true;
        if(animate){ tween(500,(e)=>{ w.scale.setScalar(s0+(s1-s0)*e); },()=>{ if(!want) w.visible=false; }); } else { w.scale.setScalar(s1); w.visible=want;
          } } }
  }
  for(const row of cells) for(const c of row){ const u=c.item&&c.item.userData; if(u&&u.cloudMat){ u.cloudMat.color.set(state.raining?C.rainCloud:C.cloud);
    u.drops.visible=state.raining; if(u.cloudMouth) u.cloudMouth.rotation.z=state.raining?0:Math.PI; } }
  if(ac){ if(!rainGain){ const s=ac.createBufferSource(); if(!noiseBuf){ noise(.01,{vol:.0001}); } s.buffer=noiseBuf; s.loop=true;
    const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1400; rainGain=ac.createGain(); rainGain.gain.value=0; s.connect(f);
    f.connect(rainGain); rainGain.connect(master); s.start(); }
    rainGain.gain.setTargetAtTime(state.raining&&!muted?.07:0,ac.currentTime,.4);
    // a soft babble on patches with a river: band-passed noise whose level drifts slowly
    if(!riverGain){ const s2=ac.createBufferSource(); s2.buffer=noiseBuf; s2.loop=true; const f=ac.createBiquadFilter(); f.type='bandpass';
      f.frequency.value=650; f.Q.value=.8;
      const lfo=ac.createOscillator(), depth=ac.createGain(); lfo.frequency.value=.23; depth.gain.value=180; lfo.connect(depth); depth.connect(f.frequency);
        lfo.start();
      riverGain=ac.createGain(); riverGain.gain.value=0; s2.connect(f); f.connect(riverGain); riverGain.connect(master); s2.start(); }
    riverGain.gain.setTargetAtTime(flowTiles.length&&!muted?.035:0,ac.currentTime,.6); }
}
const themeMeta=document.querySelector('meta[name="theme-color"]'); let themeHex='';
function syncThemeColor(c){ const h='#'+c.getHexString(); if(h!==themeHex&&themeMeta){ themeHex=h; themeMeta.setAttribute('content',h); } }
// the garden is always lit like a bright day; the time of day sets the music's mood and
// brings out fireflies in the evening and at night
const tod={si:.55,hemi:.38,amb:[1,.96,.89],lawn:[1,1,1]};
let todName='day', fireflies=null;
function pickTod(){ if(typeof renderHome==='function'&&$('homeOv').classList.contains('show')) renderHome();
  const h=new Date().getHours()+new Date().getMinutes()/60;
  const was=todName; todName= h>=6&&h<10?'morning' : h>=10&&h<17?'day' : h>=17&&h<20?'evening' : 'night'; if(was!==todName||!fireflies) buildFireflies(); }
// a soft round glow with a bright core, shared by every firefly
const glowTex=canvasTex(64,64,c=>{ const gr=c.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.18,'rgba(255,250,200,.95)'); gr.addColorStop(.45,'rgba(255,230,120,.35)');
    gr.addColorStop(1,'rgba(255,220,100,0)'); c.fillStyle=gr; c.fillRect(0,0,64,64); });
function buildFireflies(){ if(fireflies){ disposeTree(fireflies); removeObj(fireflies); fireflies=null; } if(todName!=='night'&&todName!=='evening') return;
  fireflies=new THREE.Group(); const n=todName==='night'?18:8;
  for(let i=0;i<n;i++){ const f=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xFFF0A0,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));
    f.scale.setScalar(.26); f.userData={ph:Math.random()*10,r:1+Math.random()*4,s:.2+Math.random()*.3,y:.4+Math.random()*1.2}; fireflies.add(f);
    } scene.add(fireflies); }
function updateRain(dt){
  if(fireflies) fireflies.children.forEach(f=>{ const u=f.userData, t=idleT*u.s+u.ph; f.position.set(Math.cos(t)*u.r,u.y+Math.sin(t*2.3)*.25,Math.sin(t*1.4)*u.r*.8); f.material.opacity=.35+.55*Math.max(0,Math.sin(idleT*2+u.ph*3)); });
  wet+=((state&&state.raining?1:0)-wet)*(1-Math.exp(-dt/1000*2.5));
  lawnMat.color.setRGB(tod.lawn[0]*(1-.2*wet),tod.lawn[1]*(1-.12*wet),tod.lawn[2]*(1-.05*wet)); sun.intensity=tod.si-.22*wet; hemi.intensity=tod.hemi-.06*wet;
    amb.color.setRGB(tod.amb[0]*(1-.12*wet),tod.amb[1]*(1-.06*wet),tod.amb[2]);
  const lc=lawnDry.clone().lerp(lawnWet,wet).multiply(new THREE.Color(tod.lawn[0],tod.lawn[1],tod.lawn[2])); renderer.setClearColor(lc); syncThemeColor(lc);
  if(rainLines){ rainLines.material.opacity=.75*wet; rainLines.visible=wet>.02;
    if(rainLines.visible){ const a=rainLines.geometry.attributes.position, sp=rainLines.geometry.userData.sp, d=dt/1000;
      for(let i=0;i<sp.length;i++){ let y=a.array[i*6+1]-sp[i]*d; if(y<-.25) y+=5; a.array[i*6+1]=y; a.array[i*6+4]=y+.28; } a.needsUpdate=true; } }
  document.documentElement.style.setProperty('--wet',wet.toFixed(3));
}

