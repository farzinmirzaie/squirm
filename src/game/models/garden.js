// ---------- garden scenery ----------
const lawnMat=toon(0xffffff,{map:lawnTex});
// the camera looks at the ground at a slant, where plain mipmapping smears textures; anisotropic filtering keeps them crisp
{ const an=Math.min(8,renderer.capabilities.getMaxAnisotropy()); for(const t of [turfTex,crackTex,lawnTex]) t.anisotropy=an; }
const PETAL=[0xF57FA4,0xFFB05E,0xB89CF5,0xFFD95A,0xFF8C8C];
function tulip(r,col){ const g=new THREE.Group(); const h=.22+r()*.12;
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,h,8),m('leaf')); st.position.y=h/2; g.add(st);
  const lf=new THREE.Mesh(sph(.07,14,10),m('leaf')); lf.scale.set(.5,1.4,.25); lf.position.set(.05,.08,0); lf.rotation.z=-.5; g.add(lf);
  // the bloom: three petals leaning out a little, so the top of the cup is notched like a tulip's
  const pm=toon(col); for(let i=0;i<3;i++){ const pv=new THREE.Group(); pv.rotation.y=-i/3*Math.PI*2; g.add(pv);
    const p=new THREE.Mesh(sph(.06,10,8),pm); p.scale.set(.62,1.5,.9); p.position.set(.03,h+.06,0); p.rotation.z=-.22; outline(p,.012); p.castShadow=true;
      pv.add(p); }
  return g; }
function daisy(r,col){ const g=new THREE.Group(); const h=.16+r()*.1;
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.015,.018,h,8),m('leaf')); st.position.y=h/2; g.add(st);
  const head=new THREE.Group(); head.position.y=h; head.rotation.x=-.5; g.add(head);
  const pm=toon(col||0xFFFFFF); for(let i=0;i<7;i++){ const p=new THREE.Mesh(sph(.045,12,8),pm); const a=i/7*Math.PI*2;
    p.position.set(Math.cos(a)*.065,0,Math.sin(a)*.065); p.scale.set(1,.35,.6); p.rotation.y=-a; head.add(p); }
  const c=new THREE.Mesh(sph(.04,14,10),toon(0xFFC93C)); c.scale.y=.6; c.position.y=.01; head.add(c); return g; }
function tree(r,s=1){ const g=new THREE.Group(); const h=1.1+r()*.5;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.15,h,12),toon(0x9B6B47)); trunk.position.y=h/2; trunk.castShadow=true; outline(trunk,.02);
    g.add(trunk);
  const greens=[0x6FB45A,0x7CC062,0x86C96B,0x5FA64F]; const n=4+Math.floor(r()*3);
  for(let i=0;i<n;i++){ const c=new THREE.Mesh(sph(.42+r()*.22,16,12),toon(greens[Math.floor(r()*greens.length)])); const a=r()*Math.PI*2, d=i?.25+r()*.25:0;
    c.position.set(Math.cos(a)*d,h+.15+r()*.35,Math.sin(a)*d); c.castShadow=true; outline(c,.026); g.add(c); }
  if(r()<.5){ const fc=toon(r()<.5?0xFF9E9E:0xFFF0A8); for(let i=0;i<6;i++){ const f=new THREE.Mesh(sph(.05,10,8),fc); const a=r()*Math.PI*2;
    f.position.set(Math.cos(a)*.5,h+.2+r()*.5,Math.sin(a)*.5); g.add(f); } }
  g.scale.setScalar(s); return g; }
const trees=new THREE.Group(); scene.add(trees);
function placeTrees(){ disposeTree(trees); trees.clear(); treeObstacles=[]; swayers=swayers.filter(w=>w.o.parent); if(!state) return;
  const scen=new THREE.Group(); const r=rng((mode==='garden'?li*31+7:(L.seed|0))+99);
  const yaw=camYaw*Math.PI/180, fx=Math.sin(yaw), fz=Math.cos(yaw), sx=Math.cos(yaw), sz=-Math.sin(yaw);
  const hw=(camYaw%180===0?state.w:state.h)/2+1.4, hd=(camYaw%180===0?state.h:state.w)/2+1.4;
  for(let t=0;t<(quality===0?9:16);t++){ let side,along;
    if(r()<.55){ side=(r()-.5)*2*(hw+4); along=-(hd+1.3+r()*4); } else { side=(r()<.5?-1:1)*(hw+1.3+r()*3); along=-hd-3+r()*(hd*1.4+3); }
    const x=sx*side+fx*along, z=sz*side+fz*along;
    const big=r()<.55; const o= big? tree(r,.8+r()*.5) : bush(r,1.2+r()*.9); o.position.set(x,-.34,z); treeObstacles.push({x,z,r:(big?.95:.5)*o.scale.x});
      o.rotation.y=r()*6; scen.add(o); swayers.push({o,ph:r()*6,amp:big?.12:.025}); }
  batchScenery(scen,trees);
}
function bush(r,s=1){ const g=new THREE.Group(); const bm=toon(r()>.5?0x6FB45A:0x7CC062);
  const n=3+Math.floor(r()*2); for(let i=0;i<n;i++){ const b=new THREE.Mesh(sph(.22+r()*.12,14,10),bm); b.position.set((r()-.5)*.4,.16+r()*.12,(r()-.5)*.35);
    b.castShadow=true; outline(b,.025); g.add(b); }
  if(r()>.5){ const bm2=toon(PETAL[Math.floor(r()*PETAL.length)]); for(let i=0;i<4;i++){ const f=new THREE.Mesh(sph(.04,10,8),bm2);
    f.position.set((r()-.5)*.5,.3+r()*.15,(r()-.5)*.4+.12); g.add(f); } }
  g.scale.setScalar(s); return g; }
function pebbles(r){ const g=new THREE.Group(); const pm=toon(0xD8CFC4);
  for(let i=0;i<2+Math.floor(r()*2);i++){ const p=new THREE.Mesh(sph(.06+r()*.04,14,10),pm); p.scale.y=.55; p.position.set((r()-.5)*.4,.02,(r()-.5)*.4);
  outline(p,.015); g.add(p); } return g; }
function sprout(r){ const g=new THREE.Group(); for(const s of [-1,1]){ const l=new THREE.Mesh(sph(.06,14,10),m('leaf')); l.scale.set(1.3,.3,.7);
  l.position.set(s*.06,.1,0); l.rotation.z=s*.5; g.add(l); }
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.012,.015,.1,6),m('leaf')); st.position.y=.05; g.add(st); return g; }
function bloom(s=1){ const r=Math.random; const f=r()<.5?daisy(r,0xFFFFFF):tulip(r,PETAL[Math.floor(r()*PETAL.length)]); f.scale.setScalar(s);
  f.position.set(-.18,0,.16); shade(f); return f; }
function shade(o){ o.traverse(c=>{ if(c.isMesh && c.material!==lineMat) c.castShadow=true; }); return o; }
let swayers=[];
// ---------- scenery batching ----------
// The plants around the bed are hundreds of small meshes. They're merged into one mesh (plus one for
// their outlines) with per-vertex colours, and their swaying moves into the vertex shader, so the
// lawn costs a few draw calls instead of hundreds. Batches are cut into chunks of lawn so the ones
// off screen are still skipped.
const windU={value:0}, gustU={value:1};
function windify(mt){ mt.onBeforeCompile=sh=>{ sh.uniforms.uWind=windU; sh.uniforms.uGust=gustU;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 sway;\nuniform float uWind, uGust;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n{ float h=max(0.,position.y-sway.z), a=sway.y*.07*uGust; transformed.x-=h*sin(uWind*1.6+sway.x)*a; transformed.z+=h*cos(uWind*1.3+sway.x)*a*.5; }');
        };
  mt.customProgramCacheKey=()=>'wind'; return mt; }
const batchMat=windify(toon(0xffffff,{vertexColors:true})), batchLine=windify(new THREE.MeshBasicMaterial({color:C.line,side:THREE.BackSide}));
function batchScenery(src,dst){ src.updateMatrixWorld(true);
  const swayOf=new Map(swayers.map(w=>[w.o,w])), parts={}, wp0=new THREE.Vector3();
  src.traverse(o=>{ if(!o.isMesh) return; const mt=o.material, line=mt===lineMat;
    if(!line&&!(mt.isMeshToonMaterial&&!mt.map&&!mt.transparent&&mt.side===THREE.FrontSide)) return;
    let a=o, w=null; while(a&&a!==src&&!w){ w=swayOf.get(a)||null; if(!w) a=a.parent; }
    let sw=[0,0,1e4]; if(w){ a.getWorldPosition(wp0); sw=[w.ph,w.amp||1,wp0.y]; } else o.getWorldPosition(wp0);
    const key=(line?'l':'b')+Math.floor(wp0.x/5)+','+Math.floor(wp0.z/5); (parts[key]=parts[key]||[]).push({o,col:line?null:mt.color,sw}); });
  Object.entries(parts).forEach(([key,list])=>{ const mat=key[0]==='l'?batchLine:batchMat;
    let nv=0, ni=0; for(const {o} of list){ const g=o.geometry; nv+=g.attributes.position.count; ni+=g.index?g.index.count:g.attributes.position.count; }
    const P=new Float32Array(nv*3), N=new Float32Array(nv*3), Cc=mat===batchMat?new Float32Array(nv*3):null, S=new Float32Array(nv*3), I=nv>65535?new Uint32Array(ni):new Uint16Array(ni);
    const v=new THREE.Vector3(), nm=new THREE.Matrix3(); let vo=0, io=0;
    for(const {o,col,sw} of list){ const g=o.geometry, pa=g.attributes.position, na=g.attributes.normal, n=pa.count; nm.getNormalMatrix(o.matrixWorld);
      for(let k=0;k<n;k++){ v.fromBufferAttribute(pa,k).applyMatrix4(o.matrixWorld); P.set([v.x,v.y,v.z],(vo+k)*3);
        if(na){ v.fromBufferAttribute(na,k).applyMatrix3(nm).normalize(); N.set([v.x,v.y,v.z],(vo+k)*3); }
        if(Cc) Cc.set([col.r,col.g,col.b],(vo+k)*3); S.set(sw,(vo+k)*3); }
      if(g.index){ const ix=g.index.array; for(let k=0;k<ix.length;k++) I[io++]=ix[k]+vo; } else for(let k=0;k<n;k++) I[io++]=vo+k;
      vo+=n; }
    const bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.BufferAttribute(P,3)); bg.setAttribute('normal',new THREE.BufferAttribute(N,3));
    if(Cc) bg.setAttribute('color',new THREE.BufferAttribute(Cc,3)); bg.setAttribute('sway',new THREE.BufferAttribute(S,3));
      bg.setIndex(new THREE.BufferAttribute(I,1));
    bg.computeBoundingSphere(); const mesh=new THREE.Mesh(bg,mat); mesh.castShadow=mat===batchMat&&quality>0; dst.add(mesh); });
  disposeTree(src); swayers=swayers.filter(w=>!swayOf.has(w.o)||!isUnder(w.o,src)); }
const isUnder=(o,root)=>{ for(let a=o;a;a=a.parent) if(a===root) return true; return false; };
const blobTex=canvasTex(64,64,c=>{ const gr=c.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(40,30,25,.32)'); gr.addColorStop(1,'rgba(40,30,25,0)'); c.fillStyle=gr; c.fillRect(0,0,64,64); });
let flyShadows=[], bedBox={cx:0,cz:0,hw:1,hd:1};
// things standing on the lawn, so the bird hops around them instead of through them
let lawnObstacles=[], treeObstacles=[];
function buildGarden(){ swayers=[]; lawnObstacles=[];
  disposeTree(garden); garden.clear(); const r=rng(mode==='garden'?li*97+13:(L.seed|0));
  const lawn=new THREE.Mesh(new THREE.PlaneGeometry(240,240),lawnMat); lawn.rotation.x=-Math.PI/2; lawn.rotation.z=.12; lawn.position.y=-.34;
    lawn.receiveShadow=true; garden.add(lawn);
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++) if(state.grid[y][x]!==' '){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y);
    }
  const c0=wp(x0,y0), c1=wp(x1,y1); const cx=(c0.x+c1.x)/2, cz=(c0.z+c1.z)/2, bw=c1.x-c0.x+1+.9, bd=c1.z-c0.z+1+.9;
  const soil=new THREE.Mesh(slab(bw,bd,.45,.14,.05),m('soil')); soil.position.set(cx,-.29,cz); soil.receiveShadow=true; garden.add(soil);
  // wooden border around the bed
  const outer=rrShape(bw+.42,bd+.42,.6); outer.holes.push(rrShape(bw-.02,bd-.02,.45));
  const fg=new THREE.ExtrudeGeometry(outer,{depth:.18,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:4,curveSegments:10});
    fg.rotateX(-Math.PI/2);
  const frame=new THREE.Mesh(fg,m('wood')); frame.position.set(cx,-.3,cz); frame.castShadow=true; frame.receiveShadow=true; garden.add(frame);
  const fo=new THREE.Mesh(fg,lineMat); fo.scale.set(1.006,1.15,1.006); fo.position.y=-.01; frame.add(fo);
  const scen=new THREE.Group();
  // plants in the soil wherever the worm cannot go
  for(let y=Math.floor(y0-.0);y<=y1;y++) for(let x=x0;x<=x1;x++){ if(state.grid[y][x]!==' ') continue; const roll=r(); if(roll<.22) continue;
    const p=roll<.5?tulip(r,PETAL[Math.floor(r()*PETAL.length)]):roll<.7?daisy(r):roll<.85?sprout(r):pebbles(r);
    const pos=wp(x,y,-.22); p.position.set(pos.x+(r()-.5)*.22,-.22,pos.z+(r()-.5)*.22); p.rotation.y=r()*6; p.scale.setScalar(1.5); shade(p);
      if(roll<.85) swayers.push({o:p,ph:r()*6}); scen.add(p);
    if(roll>=.22 && roll<.5 && r()>.4){ const q=tulip(r,PETAL[Math.floor(r()*PETAL.length)]); q.position.set(pos.x+(r()-.5)*.3,-.22,pos.z+(r()-.5)*.3);
      q.scale.setScalar(1.3); shade(q); swayers.push({o:q,ph:r()*6}); scen.add(q); } }
  // a loose hedge of bushes hugging the bed's wooden border
  const lite=quality===0;
  for(let i=0;i<(lite?8:14);i++){ const t=r(); const side=Math.floor(r()*4); const hx=bw/2+.75, hz=bd/2+.75; let x,z;
    if(side<2){ x=cx+(t-.5)*bw; z=cz+(side?hz:-hz); } else { z=cz+(t-.5)*bd; x=cx+(side===2?hx:-hx); }
    const b=bush(r,.8+r()*.5); b.position.set(x,-.34,z); shade(b); lawnObstacles.push({x,z,r:.5*b.scale.x}); swayers.push({o:b,ph:r()*6,amp:.02}); scen.add(b);
      }
  // lawn scenery around the bed
  const R=Math.max(bw,bd)/2;
  for(let i=0;i<(lite?24:54);i++){ const a=r()*Math.PI*2, d=R+1+r()*6;
    const x=cx+Math.cos(a)*d*(bw/Math.max(bw,bd)+.2), z=cz+Math.sin(a)*d*(bd/Math.max(bw,bd)+.2);
    if(Math.abs(x-cx)<bw/2+.6 && Math.abs(z-cz)<bd/2+.6) continue;
    const k=r();
      const o = k<.35? bush(r,1+r()*.8) : k<.75? (r()>.5?tulip(r,PETAL[Math.floor(r()*PETAL.length)]):daisy(r,r()>.6?0xFFE27A:0xFFFFFF)) : pebbles(r);
    o.position.set(x,-.34,z); o.rotation.y=r()*6; shade(o); lawnObstacles.push({x,z,r:k<.35?.5*o.scale.x:.24});
      if(k<.75) swayers.push({o,ph:r()*6,amp:k<.35?.025:1}); if(k>=.35&&k<.75) o.scale.setScalar(2.1); else if(k>=.75) o.scale.setScalar(1.6); scen.add(o); }
  batchScenery(scen,garden);
  const s=Math.max(bw,bd)*.75+2;
  Object.assign(sun.shadow.camera,{left:-s,right:s,top:s,bottom:-s,near:.5,far:40}); sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(cx,0,cz); sun.position.set(cx-4,10,cz+5);
  // butterflies
  disposeTree(flyers); flyers.clear(); flyShadows.forEach(o=>{ disposeTree(o); removeObj(o); }); flyShadows=[]; bedBox={cx,cz,hw:bw/2,hd:bd/2};
    for(let i=0;i<2;i++){ const b=new THREE.Group(); const col=[0xFFB3C9,0xFFE07A][i];
    const body=new THREE.Mesh(sph(.025,10,8),m('pupil')); body.scale.set(1,1,3); b.add(body);
    // each wing is a big forewing and a smaller hindwing, outlined like everything else
    const wm=toon(col,{side:THREE.DoubleSide}), fore=new THREE.CircleGeometry(.085,16), hind=new THREE.CircleGeometry(.06,14);
    for(const sd of [-1,1]){ const piv=new THREE.Group(); b.add(piv); b.userData['w'+sd]=piv;
      for(const [geo,x,y,z,sx,sz] of [[fore,.08,0,.03,1,1.15],[hind,.06,-.004,-.05,1,1]]){ const w=new THREE.Mesh(geo,wm); w.position.set(sd*x,y,z);
        w.scale.set(sx,sz,1); w.rotation.x=-Math.PI/2; piv.add(w);
        const o=new THREE.Mesh(geo,flatLineMat); o.scale.setScalar(1.2); w.add(o); } }
    b.userData.ph=r()*10; b.userData.c=[cx,cz]; b.userData.R=R*.8+.5; flyers.add(b);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(.32,.32),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false}));
      sh.rotation.x=-Math.PI/2; scene.add(sh); flyShadows.push(sh); b.userData.shadow=sh; }
  buildCritters(r,cx,cz,bw,bd);
}
