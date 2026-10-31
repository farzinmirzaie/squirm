// ---------- photo mode ----------
// from the win dialog: the HUD steps aside, the worm pops its head out of the burrow and looks at you, and
// Snap saves (or shares) the garden with a little caption. Back returns to the win dialog.
let photoOn=false, photoInfo=null, photoFrom='win';
const photoFrame=()=>({top:Math.max(24,window.innerHeight*.06),bot:window.innerHeight-130});
function enterPhoto(){ if(photoOn) return; photoOn=true; orbit=null; ptrs.clear(); $('photoReset').hidden=true;
  setTimeout(()=>{ if(photoOn) toast(matchMedia('(pointer: coarse)').matches?'Drag to look around. Pinch to zoom, two fingers to move.':'Drag to look around. Right-drag to move, scroll to zoom.',3200); },700);
  photoFrom=isOpen('winOv')?'win':'game'; hide('winOv'); pushLayer('photo'); document.body.classList.add('photo'); $('photoBar').hidden=false;
  glideCamera(photoFrame());
  stagger(qa($('photoBar'),'button'),'rise',120,60);
  if(photoFrom==='game'){ const h=segMeshes[0]; if(h){ applyExpr(h,'joy'); reactT=1e6; } return; }
  const ex=state.segs[0], at=wp(ex[0],ex[1],0), h=segMeshes[0]; wormG.visible=true;
  segMeshes.forEach((sg,i)=>{ sg.position.copy(at).setY(-.3-i*.05); sg.scale.setScalar(i<3?1:.02); });
  if(h){ h.scale.setScalar(1); applyExpr(h,'joy'); reactT=1e6;
    tween(650,(e,k)=>{ const b=1-Math.pow(1-k,3); h.position.y=-.3+(.5+Math.sin(k*Math.PI)*.08)*b; }); } }
function exitPhoto(){ if(!photoOn) return; photoOn=false; orbit=null; ptrs.clear(); document.body.classList.remove('photo'); $('photoBar').hidden=true;
  reactT=0; glideCamera(); if(photoFrom==='win') show('winOv'); else { const h=segMeshes[0]; if(h) applyExpr(h,'smile'); lastMoveT=idleT; } }
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
  for(let i=0;i<3;i++){ g.save(); g.translate(px+14*u+i*21*u,py+33*u); g.scale(.85*u,.85*u); g.fillStyle=i<st?'#F5C14E':'#E7CFA8'; g.fill(star);
    g.lineWidth=1.6; g.strokeStyle='#5B4436'; g.stroke(star); g.restore(); }
  g.font=`800 ${Math.round(13*u)}px Grandstander, sans-serif`; g.textAlign='right'; g.fillStyle='rgba(255,248,234,.92)'; g.strokeStyle='rgba(91,68,54,.55)'; g.lineWidth=4*u;
  g.strokeText('Squirm',W-16*u,H-20*u); g.fillText('Squirm',W-16*u,H-20*u);
  sfx('shutter'); buzz(18); if(!reduceMotion) animOnce($('flash'),'go'); bumpStat('photos'); checkBadges(null); save();
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); if(!blob){ toast('That photo didn\'t work. Try again?'); return; }
  const file=new File([blob],`squirm-${title.replace(/^\d+\.\s*/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garden'}.png`,{type:'image/png'});
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file]}); return;
    } }catch(e){ if(e&&e.name==='AbortError') return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000); toast('Photo saved to your downloads.'); }
// free camera. Touch: one finger orbits; two fingers pinch to zoom, move together to pan and twist to turn.
// Mouse: drag orbits, right-drag or Shift-drag pans, the wheel zooms. Keys: arrows pan. The point the camera
// looks at (orbit.t, mirrored in camLook) stays over the bed, and tilt and distance stay in range.
let orbit=null; const ptrs=new Map(), camLook=new THREE.Vector3();
function orbitStart(){ if(orbit) return; const p=basePos.clone().sub(camLook), d=p.length();
  orbit={yaw:Math.atan2(p.x,p.z),pitch:Math.asin(p.y/d),d,d0:d,t:camLook.clone()}; }
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
function photoKeyPan(code){ const d={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[code]; if(!d) return false; orbitStart();
  orbitPan(d[0]*40,d[1]*40); orbitApply(); return true; }
function resetView(){ orbit=null; ptrs.clear(); $('photoReset').hidden=true; glideCamera(photoFrame()); }
$('photoReset').onclick=resetView;
$('photoBtn').onclick=()=>{ if(!state||state.status!=='play'||animating||anyOverlay()) return; clearHint();
  const st=mode==='garden'?(progress.stars[LEVELS[li].name]||0):0; photoInfo={title:mode==='garden'?`${li+1}. ${LEVELS[li].name}`:L.daily?"Today's patch":'A meadow patch',st}; enterPhoto(); };
$('winHome').onclick=()=>window.history.back();
$('photoBack').onclick=()=>window.history.back();
$('photoSnap').onclick=snapPhoto;
$('photoPose').onclick=posePhoto;
function undo(){
  if(!history.length) return; bumpStat('undos'); undosHere++; checkBadges(null); save(); tweens.length=0; animating=0; queue.length=0; slideSteps.length=0;
    sfx('undo'); lastMoveT=idleT;
  clearDying(); clearHint(); const cur=state; state=history.pop(); syncBoard(false); syncWeather(false); syncSnails(false); snapBeetles(); syncHedges(false);
    updateHUD(true); saveResume();
  if(reduceMotion||cur.segs.length!==state.segs.length||segMeshes.length!==state.segs.length){ snapWorm(); return; }
  const n=state.segs.length, starts=segMeshes.map(s=>s.position.clone()), targets=state.segs.map((p,i)=>wp(p[0],p[1],segY(i,n)));
  const a=state.segs[0], b=state.segs[1]; if(b&&Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1) headDir=[a[0]-b[0],a[1]-b[1]];
  animating++;
    tween(150,(e)=>{ segMeshes.forEach((s,i)=>{ if(starts[i].distanceTo(targets[i])>1.3){ s.position.copy(targets[i]); return; } s.position.lerpVectors(starts[i],targets[i],e); }); },()=>{ animating--; if(queue.length) tryMove(queue.shift()); });
}
function restart(){ if(!L) return; if(state&&state.moves>0) bumpStat('restarts'); clearHint(); tweens.length=0; clearDying(); animating=0; queue.length=0;
  slideSteps.length=0; hideAll(); sfx('undo');
  if(state.status==='play' && state.moves>0){ history=[]; state=initState(L); syncBoard(false); snapWorm(); syncSnails(false); snapBeetles();
    syncWeather(false); syncHedges(false); updateHUD(true); saveResume(); lastMoveT=idleT;
    toast('Fresh start.',1800); return; }
  clearResume(); hintsUsed=0; undosHere=0; if(mode==='garden') loadLevel(li,false); else startLevel(L,false); }

