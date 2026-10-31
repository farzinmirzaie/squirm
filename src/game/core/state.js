// ---------- state ----------
let mode='garden', endlessDiff='medium', li=0, L=null, state=null, history=[], cells=[], segMeshes=[];
let animating=0, queue=[], headDir=[1,0], idleT=0, lastMoveT=0, wasReady=false;
let progress={v:2,best:{},stars:{}};
{ const p=store.json('squirm-progress'); if(p&&p.best) progress=Object.assign(progress,p); }
const isCleared=i=>progress.best[LEVELS[i].name]!=null;
const isUnlocked=i=>i===0||isCleared(i)||isCleared(i-1);
function currentGardenIndex(){ const n=store.get('squirm-current-name'), i=LEVELS.findIndex(l=>l.name===n); return i>=0&&isUnlocked(i)?i:0; }
progress.endless=progress.endless||{};
  ['easy','medium','hard'].forEach(d=>{ progress.endless[d]=Object.assign({cleared:0,streak:0,best:0,stars:0},progress.endless[d]||{}); });
let endlessOpts={flags:true,fruit:true,keys:true,portals:false,dry:true,rain:false,rivers:false};
{ const o=store.json('squirm-endless-opts'); if(o){ Object.assign(endlessOpts,o.opts||{}); if(o.diff) endlessDiff=o.diff; } }
const curPar=()=> L.par;
function askPersist(){ try{ const st=navigator.storage; if(st&&st.persist) st.persisted().then(p=>p||st.persist()).catch(()=>{}); }catch(e){} }
const save=()=>{ store.set('squirm-progress',JSON.stringify(progress)); };
function wp(x,y,yy=0){ return new THREE.Vector3(x-(state.w-1)/2, yy, y-(state.h-1)/2); }

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
  for(let i=0;i<1040;i++){ const x=Math.random()*256,y=Math.random()*256; g.fillStyle=Math.random()<.5?'rgba(80,140,60,.16)':'rgba(255,255,255,.5)';
    g.beginPath(); g.ellipse(x,y,1.2+Math.random()*1.6,3+Math.random()*3,Math.random()*3,0,Math.PI*2); g.fill(); } },1.6);
MC.turf1=toon(C.turf1,{map:turfTex}); MC.turf2=toon(C.turf2,{map:turfTex});
const crackTex=canvasTex(128,128,g=>{
  g.strokeStyle='rgba(150,110,70,.85)'; g.lineWidth=5; g.lineCap='round'; g.lineJoin='round';
  g.beginPath(); g.moveTo(18,36); g.lineTo(50,56); g.lineTo(62,90); g.lineTo(98,108); g.moveTo(50,56); g.lineTo(90,42); g.lineTo(110,22); g.moveTo(62,90);
    g.lineTo(30,106); g.stroke(); });
const swirlTex=canvasTex(128,128,g=>{
  g.translate(64,64); g.strokeStyle='rgba(255,255,255,.95)'; g.lineWidth=7; g.lineCap='round';
  for(let a=0;a<3;a++){ g.beginPath(); for(let t=0;t<1;t+=.02){ const r=6+t*52, an=a*2.094+t*4.2; const px=Math.cos(an)*r, py=Math.sin(an)*r;
    t?g.lineTo(px,py):g.moveTo(px,py);} g.stroke(); } });
const lawnTex=canvasTex(64,8,g=>{
  g.fillStyle='#8CC673'; g.fillRect(0,0,64,8); g.fillStyle='#84BF6B'; g.fillRect(32,0,32,8); },60);

