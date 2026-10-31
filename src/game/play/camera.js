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
  for(const p of pts){ v.copy(p).project(camera); const px=(v.x+1)/2*W, py=(1-v.y)/2*H; x0=Math.min(x0,px); x1=Math.max(x1,px); y0=Math.min(y0,py);
    y1=Math.max(y1,py); }
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
  fitCamera(false,frame); if(reduceMotion){ camLook.set(0,0,0); return; } const p1=basePos.clone(), o1=[camera.view.offsetX,camera.view.offsetY];
    basePos.copy(p0);
  const l0=camLook.clone();
    tween(700,(e,k)=>{ const t=ease(k); basePos.lerpVectors(p0,p1,t); camLook.copy(l0).multiplyScalar(1-t); camera.position.copy(basePos); camera.lookAt(camLook); camera.setViewOffset(W,H,o0[0]+(o1[0]-o0[0])*t,o0[1]+(o1[1]-o0[1])*t,W,H); camera.updateProjectionMatrix(); });
    }
let resizeQueued=false;
window.addEventListener('resize',()=>{ if(resizeQueued) return; resizeQueued=true; requestAnimationFrame(()=>{ resizeQueued=false; fitCamera(); }); });

