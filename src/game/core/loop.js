// ---------- loop ----------
let drawn=false, last=performance.now(), last0=last, frameN=0, slowT=0, fastT=0, sampleT=0, raisedOnce=false;
// steps quality down when frames run under ~25 fps (a phone in low power mode capped at 30 fps is fine),
// and back up once frames are quick again, so one rough patch doesn't leave the garden blurry for good
function watchSpeed(ms){ if(ms>250||gfx!=='auto') return; sampleT+=ms; if(ms>40) slowT+=ms; if(ms<20) fastT+=ms;
  if(sampleT<4000) return; const slow=slowT/sampleT>.5, fast=fastT/sampleT>.9; sampleT=slowT=fastT=0;
  if(slow&&quality>0) setQuality(quality-1);
  else if(fast&&quality<2&&!raisedOnce){ raisedOnce=true; setQuality(quality+1); } }
function setQuality(q){ quality=q; store.set('squirm-quality',String(quality));
  renderer.setPixelRatio(pixelRatio()); sun.shadow.mapSize.setScalar(quality===2?2048:1024); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null;
    } fitCamera(false); }
function frame(now){
  const dt=Math.min(50,now-last); last=now; idleT+=dt/1000;
  for(let i=tweens.length-1;i>=0;i--){ const t=tweens[i]; if(!t) continue; t.t+=dt; const k=Math.min(1,t.t/t.dur); t.fn(ease(k),k);
    if(k>=1){ const j=tweens.indexOf(t); if(j>=0) tweens.splice(j,1); t.done&&t.done(); } }
  if(!reduceMotion){
    for(const row of cells) for(const c of row){ const it=c.item; if(!it) continue; const u=it.userData;
      if(u.bob){ u.bob.position.y=(u.bobBase||0)+Math.sin(idleT*2.4+it.position.x)*.05;
        if(u.noSpin){ if(u.keyBody) u.keyBody.rotation.z=Math.sin(idleT*1.8+it.position.z)*.25; } else u.bob.rotation.y+=dt*.0012; }
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
      const sh=b.userData.shadow; if(sh){ const inBed=Math.abs(x-bedBox.cx)<bedBox.hw&&Math.abs(z-bedBox.cz)<bedBox.hd;
        const gx=Math.round(x+(state.w-1)/2), gz=Math.round(z+(state.h-1)/2), onTile=tileAt(state,gx,gz)!==' '; sh.position.set(x,onTile?.02:inBed?-.2:-.33,z);
        const k=1.15-(y-1.05)*.6; sh.scale.setScalar(k); sh.material.opacity=.55+.25*(1.55-y); }
      const f=Math.sin(idleT*22+i)*1.0; b.userData['w-1'].rotation.z=-f; b.userData['w1'].rotation.z=f; });
  }
  // a cloud floats above its stone and drifts up out of the way while the worm is under it
  if(state) for(const row of cells) for(const c of row){ const u=c.item&&c.item.userData; if(!u||!u.cloud) continue;
    const want=occupied(u.at[0],u.at[1])?1.12:.76; u.bobBase+=(want-u.bobBase)*(reduceMotion?1:1-Math.exp(-dt/1000*6));
      if(reduceMotion) u.cloud.position.y=u.bobBase; }
  if(state&&state.status==='play'&&!anyOverlay()&&!document.hidden) playT+=dt/1000;
  if(!reduceMotion && state) for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y]&&cells[y][x]; if(!c||c.ch!=='x'||!c.tile) continue;
    const on=state.status==='play'&&occupied(x,y); c.tile.rotation.z=on?Math.sin(idleT*31+x*3+y)*.012:0; c.tile.rotation.x=on?Math.cos(idleT*27+x+y*2)*.012:0; }
  if(!nudged && state && state.status==='play' && state.moves>0 && idleT-lastMoveT>45 && !anyOverlay() && !document.body.classList.contains('at-home')){
    nudged=true; wormSays('Stuck? The bulb has ideas.',3200); pulse($('hintBtn')); }
  if(segMeshes[0]){ const hp=segMeshes[0].position; camTgt.set(THREE.MathUtils.clamp(hp.x*.06,-.35,.35),0,THREE.MathUtils.clamp(hp.z*.06,-.35,.35));
    if(reduceMotion) camTgt.set(0,0,0);
    if(photoOn) camTgt.set(0,0,0); camOff.lerp(camTgt,1-Math.exp(-dt/1000*1.6)); camera.position.copy(basePos).add(camOff); }
  if(!reduceMotion){ fxTimer-=dt;
    if(fxTimer<0){ fxTimer=90;
      for(const row of cells) for(const c of row){ const u=c.item&&c.item.userData;
        if(u&&c.item.userData.kind==='K'&&Math.random()<.08) sparkle(c.item.position); }
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
    if(f.leaf){ const u=((idleT*.25+f.ph/6.28)%1+1)%1, a=-.5+u, k=Math.min(1,(.5-Math.abs(a))*6); f.leaf.position[f.along]=a;
      f.leaf.position[f.along==='x'?'z':'x']=Math.sin(idleT*1.3+f.ph)*.12;
      f.leaf.rotation.y=f.ph+idleT*.6; f.leaf.position.y=-.125+Math.sin(idleT*3+f.ph)*.008; f.leaf.scale.setScalar(Math.max(.01,k)); }
    { const t=(idleT*.45+f.ph*.37)%2.4; if(t<1.2){ const k=t/1.2; if(k<.05){ f.ripple.position.x=(Math.sin(f.ph*9+Math.floor(idleT*.45))*.25);
      f.ripple.position.z=(Math.cos(f.ph*7+Math.floor(idleT*.45))*.25); }
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
let paused=false;
  document.addEventListener('visibilitychange',()=>{ if(ac){ try{ document.hidden?ac.suspend():ac.resume(); }catch(e){} } if(!document.hidden&&paused){ paused=false; last=performance.now(); requestAnimationFrame(frame); } if(rainGain&&ac) rainGain.gain.setTargetAtTime(document.hidden?0:(state&&state.raining&&!muted?.07:0),ac.currentTime,.2); });

// ---------- unexpected errors: tell the player instead of failing silently ----------
let errorShown=false;
const onGameError=src=>{ if(errorShown||(src&&!String(src).startsWith(location.origin))) return; errorShown=true;
  try{ animating=0; queue.length=0; toast('Oops, the garden hiccupped. If something looks stuck, restart the patch.',4200); }catch(e){} };
window.addEventListener('error',e=>onGameError(e.filename));
window.addEventListener('unhandledrejection',()=>onGameError(null));

