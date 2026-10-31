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

