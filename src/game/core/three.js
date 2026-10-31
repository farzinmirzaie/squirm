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

