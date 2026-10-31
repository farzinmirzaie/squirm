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
function wormEmote(){ const h=segMeshes[0]; if(!h||animating||state.status!=='play') return; bumpStat('taps'); checkBadges(null); save();
  react(EXPRS[Math.floor(Math.random()*EXPRS.length)],1200); lastMoveT=idleT;
  sfx('tap'); tone(660+Math.random()*300,.18,{type:'sine',vol:.08,slide:1.4}); buzz(10); const b=h.userData.body;
  if(!reduceMotion) tween(420,(e,k)=>{ const s=1+Math.sin(k*Math.PI)*.16; b.scale.set(s,1/s,s); b.rotation.z=Math.sin(k*Math.PI*3)*.25*(1-k); },()=>{ b.scale.set(1,1,1); b.rotation.z=0; });
    }
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
  if(photoOn){ if(e.code==='Escape') window.history.back(); else if(e.code==='Enter'||e.code==='Space'){ e.preventDefault(); snapPhoto();
    } else if(e.code==='KeyP') posePhoto(); else if(e.code==='KeyR') resetView(); else if(photoKeyPan(e.code)) e.preventDefault(); return; }
  if((e.code==='Enter'||e.code==='Space') && isOpen('winOv')){ e.preventDefault(); $('winNext').click(); return; }
  if(e.code==='KeyR' && isOpen('winOv')){ e.preventDefault(); $('winReplay').click(); return; }
  if(e.code==='Enter' && calmMoment() && curTab==='play' && (document.activeElement===document.body||!document.activeElement)){ e.preventDefault();
    $('homePlay').click(); return; }
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
$('skipBtn').onclick=()=>{ if(mode!=='endless'||animating) return; const e=progress.endless[endlessDiff]; e.streak=0; save(); clearResume();
  toast('Skipped. Your streak starts over.',2000); newEndless(); };
$('winShare').onclick=async()=>{ try{ if(navigator.share){ await navigator.share({text:shareText}); return; } }catch(e){ return; }
  try{ await navigator.clipboard.writeText(shareText); toast('Result copied. Paste it anywhere.',2200); }catch(e){ toast(shareText,5000); } };
$('winReplay').onclick=()=>{ hideAll(); popLayer('win'); if(mode==='garden') loadLevel(li,false); else startLevel(L,false); };
$('winNext').onclick=()=>{ hideAll(); if(L.daily){ popLayer('game'); showHome(); return; }
  if(mode==='garden'&&li===LEVELS.length-1&&allCleared()){ swapLayers(layers.includes('game')?'game':'win','finale'); showHome(true); showFinale(false); return;
    } popLayer('win'); if(mode==='garden') loadLevel(li===LEVELS.length-1?0:li+1); else newEndless(); };
function toggleMute(el){ ensureAudio(); muted=!muted; if(el) settle(el); store.set('squirm-muted',muted?'1':'0'); renderMute(); if(state) syncWeather(false);
  sfx(muted?'off':'on'); }
$('muteBtn').onclick=()=>toggleMute($('muteBtn'));
renderMute();
function renderHaptic(){ const b=$('hapticBtn'); b.setAttribute('aria-pressed',String(hapticsOn));
  b.setAttribute('aria-label',hapticsOn?'Turn vibration off':'Turn vibration on');
  b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7.5" y="4" width="9" height="16" rx="2.5"/>'+(hapticsOn?'<path d="M4 9v6M20 9v6M1.5 10.5v3M22.5 10.5v3"/>':'<path d="M3 3l18 18"/>')+'</svg>';
    }
$('hapticBtn').onclick=()=>{ hapticsOn=!hapticsOn; store.set('squirm-haptics',hapticsOn?'1':'0'); renderHaptic(); sfx(hapticsOn?'on':'off'); };
renderHaptic();

