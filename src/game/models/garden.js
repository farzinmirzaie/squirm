// ---------- garden scenery ----------
const lawnMat=toon(0xffffff,{map:lawnTex});
// the camera looks at the ground at a slant, where plain mipmapping smears textures; anisotropic filtering keeps them crisp
{ const an=Math.min(8,renderer.capabilities.getMaxAnisotropy()); for(const t of [turfTex,crackTex,lawnTex]) t.anisotropy=an; }
const PETAL=[0xF57FA4,0xFFB05E,0xB89CF5,0xFFD95A,0xFF8C8C];
// Scenery is merged into a few big meshes (batchScenery), so every triangle counts: plants use low-poly spheres
// (toon shading and outlines hide the facets), and shared shapes are cached in GC so freeing a patch keeps them.
const gGeo=(k,make)=>GC[k]||(GC[k]=make());
const stemGeo=()=>gGeo('gdStem',()=>new THREE.CylinderGeometry(.018,.022,1,6,1,true).translate(0,.5,0));
const bladeGeo=()=>gGeo('gdBlade',()=>new THREE.ConeGeometry(.032,1,3,1,true).translate(0,.5,0));
const pick=(r,a)=>a[Math.floor(r()*a.length)];
function tulip(r,col){ const g=new THREE.Group(); const h=.22+r()*.12;
  const st=new THREE.Mesh(stemGeo(),m('leaf')); st.scale.y=h+.04; g.add(st);
  const lf=new THREE.Mesh(sph(.07,8,6),m('leaf')); lf.scale.set(.5,1.4,.25); lf.position.set(.05,.08,0); lf.rotation.z=-.5; g.add(lf);
  // the bloom: three petals leaning out a little, so the top of the cup is notched like a tulip's
  const pm=toon(col); for(let i=0;i<3;i++){ const pv=new THREE.Group(); pv.rotation.y=-i/3*Math.PI*2; g.add(pv);
    const p=new THREE.Mesh(sph(.06,9,7),pm); p.scale.set(.62,1.5,.9); p.position.set(.03,h+.06,0); p.rotation.z=-.22; outline(p,.012); p.castShadow=true;
      pv.add(p); }
  return g; }
function daisy(r,col){ const g=new THREE.Group(); const h=.16+r()*.1;
  const st=new THREE.Mesh(stemGeo(),m('leaf')); st.scale.set(.85,h,.85); g.add(st);
  const head=new THREE.Group(); head.position.y=h; head.rotation.x=-.5; g.add(head);
  const pm=toon(col||0xFFFFFF); for(let i=0;i<7;i++){ const p=new THREE.Mesh(sph(.045,7,5),pm); const a=i/7*Math.PI*2;
    p.position.set(Math.cos(a)*.065,0,Math.sin(a)*.065); p.scale.set(1,.35,.6); p.rotation.y=-a; head.add(p); }
  const c=new THREE.Mesh(sph(.04,9,7),m('gdSun')); c.scale.y=.6; c.position.y=.01; head.add(c); return g; }
// a clump of lavender: a few spikes of little lilac buds leaning out from the middle
function lavender(r){ const g=new THREE.Group(), n=3+Math.floor(r()*2);
  for(let i=0;i<n;i++){ const pv=new THREE.Group(), a=i/n*Math.PI*2+r()*.8, lean=.15+r()*.2, h=.24+r()*.1; pv.rotation.set(Math.sin(a)*lean,0,-Math.cos(a)*lean); g.add(pv);
    const st=new THREE.Mesh(stemGeo(),m('leaf')); st.scale.set(.7,h,.7); pv.add(st);
    for(let k=0;k<5;k++){ const b=new THREE.Mesh(sph(.022,6,5),m('gdLavender')); b.scale.set(1,1.5,1); b.position.y=h-.01-k*.042; b.position.x=(k%2-.5)*.014; pv.add(b); } }
  g.add(tuft(r,3,.7)); return g; }
// a tuft of grass: a few thin blades fanning out
function tuft(r,n,s=1){ const g=new THREE.Group(), mt=m(r()<.5?'gdTuft1':'gdTuft2'); n=n||5+Math.floor(r()*3);
  for(let i=0;i<n;i++){ const b=new THREE.Mesh(bladeGeo(),mt), a=i/n*Math.PI*2+r()*.7, lean=.25+r()*.3;
    b.scale.set(s*.8,(.11+r()*.08)*s,s*.8); b.position.set(Math.cos(a)*.025*s,-.01,Math.sin(a)*.025*s); b.rotation.set(Math.sin(a)*lean,0,-Math.cos(a)*lean); g.add(b); }
  return g; }
// little dots (blossoms, berries) sitting on the upper surface of round blobs
// (a spot that falls inside a neighbouring blob is tried again, so none are lost inside the foliage)
function dotsOn(r,g,blobs,n,mt,rad,lift=0){ const p=new THREE.Vector3(), rOf=b=>b.geometry.parameters.radius*b.scale.x;
  for(let i=0,t=0;i<n&&t<n*6;t++){ const b=pick(r,blobs), R=rOf(b), a=r()*Math.PI*2, el=.2+r()*1.1;
    p.set(b.position.x+Math.cos(el)*Math.cos(a)*R,b.position.y+Math.sin(el)*R*b.scale.y/b.scale.x,b.position.z+Math.cos(el)*Math.sin(a)*R);
    if(blobs.some(o=>o!==b&&o.scale.y===o.scale.x&&p.distanceTo(o.position)<rOf(o)*.97)) continue;
    const d=new THREE.Mesh(sph(rad,lift?9:7,lift?7:5),mt); d.position.copy(p); if(lift) outline(d,.012); g.add(d); i++; } }
function tree(r,s=1){ const g=new THREE.Group(), kind=r();
  if(kind<.2){ // a soft little fir: three stacked cones on a short trunk
    const t=new THREE.Mesh(stemGeo(),m('gdTrunk')); t.scale.set(5,.4,5); g.add(t);
    const w=.75+r()*.15, h=1.5+r()*.5;
    for(let i=0;i<3;i++){ const k=i/3, c=new THREE.Mesh(gGeo('gdCone',()=>new THREE.ConeGeometry(1,1,11,1)),m(i%2?'gdPine2':'gdPine1'));
      const cr=w*(1-k*.32), ch=h*.48*(1-k*.18); c.scale.set(cr,ch,cr); c.position.y=.3+h*k*.52+ch/2; c.castShadow=true; outline(c,.03); g.add(c); }
    g.scale.setScalar(s); return g; }
  const h=1+r()*.5, poplar=kind>.82, blossom=kind>.6&&!poplar;
  const trunk=new THREE.Mesh(gGeo('gdTrunkG',()=>new THREE.CylinderGeometry(.09,.15,1,9,1,true).translate(0,.5,0)),m('gdTrunk'));
    trunk.scale.y=h+.1; trunk.castShadow=true; outline(trunk,.02,.15); g.add(trunk);
  // roots spreading into the lawn
  for(let i=0;i<3;i++){ const a=i/3*Math.PI*2+r(), rt=new THREE.Mesh(sph(.08,8,6),m('gdTrunk')); rt.scale.set(1.6,.5,.75); rt.rotation.y=-a;
    rt.position.set(Math.cos(a)*.13,.02,Math.sin(a)*.13); g.add(rt); }
  // a short branch poking out with a puff of leaves
  const greens=blossom?['gdBloom1','gdBloom2']:poplar?['gdPoplar','gdLeaf4']:r()<.5?['gdLeaf1','gdLeaf3']:['gdLeaf2','gdLeaf4'];
  if(!poplar&&r()<.6){ const a=r()*Math.PI*2, br=new THREE.Group(); br.position.y=h*.55; br.rotation.y=-a; g.add(br);
    const b=new THREE.Mesh(stemGeo(),m('gdTrunk')); b.scale.set(2.2,.42,2.2); b.rotation.z=-1; br.add(b);
    const pf=new THREE.Mesh(sph(.17,10,7),m(greens[1])); pf.position.set(.36,.26,0); pf.castShadow=true; outline(pf,.02); br.add(pf); }
  const blobs=[];
  if(poplar){ for(let i=0;i<3;i++){ const c=new THREE.Mesh(sph(i?.3:.42,11,9),m(greens[i?1:0])); const a=i*2.3+r();
      c.scale.set(1,1.8,1); c.position.set(i?Math.cos(a)*.24:0,h+.55+(i?-.1+r()*.2:.15),i?Math.sin(a)*.24:0); c.castShadow=true; outline(c,.026); g.add(c); blobs.push(c); } }
  else { const n=4+Math.floor(r()*3);
    for(let i=0;i<n;i++){ const rad=i?.36+r()*.16:.52+r()*.1, c=new THREE.Mesh(sph(rad,11,8),m(greens[i%2]));
      const a=i/(n-1)*Math.PI*2+r()*.6, d=i?.3+r()*.18:0;
      c.position.set(Math.cos(a)*d,h+.2+(i?r()*.25:.35),Math.sin(a)*d); c.castShadow=true; outline(c,.026); g.add(c); blobs.push(c); } }
  if(blossom) dotsOn(r,g,blobs,12,m('gdWhite'),.06);
  else if(!poplar&&r()<.45) dotsOn(r,g,blobs,7,m(r()<.5?'gdBerry':'gdCream'),.06);
  g.scale.setScalar(s); return g; }
const trees=new THREE.Group(); scene.add(trees);
function placeTrees(){ disposeTree(trees); trees.clear(); treeObstacles=[]; swayers=swayers.filter(w=>w.o.parent); if(!state) return;
  const scen=new THREE.Group(); const r=rng((mode==='garden'?li*31+7:(L.seed|0))+99);
  const yaw=camYaw*Math.PI/180, fx=Math.sin(yaw), fz=Math.cos(yaw), sx=Math.cos(yaw), sz=-Math.sin(yaw);
  const hw=(camYaw%180===0?state.w:state.h)/2+1.4, hd=(camYaw%180===0?state.h:state.w)/2+1.4;
  for(let t=0,k=0;t<(quality===0?9:16)&&k<60;k++){ let side,along;
    if(r()<.55){ side=(r()-.5)*2*(hw+4); along=-(hd+1.3+r()*4); } else { side=(r()<.5?-1:1)*(hw+1.3+r()*3); along=-hd-3+r()*(hd*1.4+3); }
    const x=sx*side+fx*along, z=sz*side+fz*along, big=r()<.55, sc=big?.8+r()*.5:1.2+r()*.9, rad=(big?.95:.5)*sc;
    // keep trees from growing into each other
    if(treeObstacles.some(o=>Math.hypot(x-o.x,z-o.z)<(o.r+rad)*.75)) continue;
    // and a trunk never comes up through a stone or a shrub on the lawn
    if(big&&lawnObstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r*.8+.3*sc)) continue;
    const o= big? tree(r,sc) : bush(r,sc); o.position.set(x,-.34,z); treeObstacles.push({x,z,r:rad});
      o.rotation.y=r()*6; scen.add(o); swayers.push({o,ph:r()*6,amp:big?.12:.025}); t++;
    if(big) for(let i=0;i<2;i++){ const a=r()*6, d=.45*sc+r()*.3, tf=tuft(r,0,1.6); tf.position.set(x+Math.cos(a)*d,-.34,z+Math.sin(a)*d); scen.add(tf); swayers.push({o:tf,ph:r()*6}); } }
  batchScenery(scen,trees,-.34);
}
// a shrub: a mound of leafy puffs, sometimes with blossoms or berries; or a hydrangea with big flower heads; or a hosta
function bush(r,s=1,plain){ const g=new THREE.Group(), kind=plain?r()*.8:r();
  if(kind>=.82){ const n=6+Math.floor(r()*2); // a hosta: broad round leaves arching out of the middle
    for(let i=0;i<n;i++){ const pv=new THREE.Group(); pv.rotation.y=i/n*Math.PI*2+r()*.4; g.add(pv); const tl=new THREE.Group(); tl.rotation.x=-(.3+r()*.35); pv.add(tl);
      const L=.15+r()*.04, f=new THREE.Mesh(sph(.08,9,6),m(i%2?'gdFern':'gdLeaf2')); f.scale.set(1.45,.24,L/.08); f.position.set(0,.02,L*.85); f.castShadow=true; outline(f,.012);
        tl.add(f); }
    g.scale.setScalar(s); return g; }
  const base=pick(r,[['gdLeaf1','gdLeaf3'],['gdLeaf2','gdLeaf3'],['gdLeaf4','gdLeaf1']]), n=3+Math.floor(r()*2), blobs=[];
  for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+r()*.5, d=i?.16+r()*.08:0, rad=i?.18+r()*.08:.27+r()*.05;
    const b=new THREE.Mesh(sph(rad,9,7),m(base[i?(i%2):1])); b.position.set(Math.cos(a)*d,rad*.62+(i?0:.06),Math.sin(a)*d);
    b.castShadow=true; outline(b,.022); g.add(b); blobs.push(b); }
  if(kind>=.62) dotsOn(r,g,blobs,5+Math.floor(r()*2),m(pick(r,['gdHydra1','gdHydra2','gdHydra3'])),.095,1);
  else if(kind>=.3) dotsOn(r,g,blobs,5+Math.floor(r()*3),kind>=.48?m('gdBerry'):toon(pick(r,PETAL)),.04);
  g.scale.setScalar(s); return g; }
function pebbles(r){ const g=new THREE.Group(); const pm=m('gdPebble');
  for(let i=0;i<2+Math.floor(r()*2);i++){ const p=new THREE.Mesh(sph(.06+r()*.04,8,6),pm); p.scale.y=.55; p.position.set((r()-.5)*.4,.02,(r()-.5)*.4);
  outline(p,.015); g.add(p); } return g; }
// a mossy stone settled into the lawn, with a pebble or two beside it
function rock(r){ const g=new THREE.Group();
  const st=new THREE.Mesh(gGeo('gdRock',()=>new THREE.IcosahedronGeometry(.24,1)),m(r()<.5?'gdRock1':'gdRock2')); st.scale.set(1.2+r()*.2,.62,1);
    st.rotation.y=r()*6; st.position.y=.07; st.castShadow=true; outline(st,.02); g.add(st);
  if(r()<.85){ const ms=new THREE.Mesh(sph(.17,10,7),m('gdMoss')); ms.scale.set(1.1,.36,.92); ms.position.set(.03,.205,-.02); outline(ms,.012); g.add(ms); }
  for(let i=0;i<1+Math.floor(r()*2);i++){ const a=r()*6, p=new THREE.Mesh(sph(.055,8,6),m('gdPebble')); p.scale.y=.55; p.position.set(Math.cos(a)*.38,.01,Math.sin(a)*.32);
    outline(p,.012); g.add(p); }
  return g; }
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
// off screen are still skipped. With `ground` set, parts close to that height are shaded a little
// darker, so plants look rooted in the lawn instead of pasted on it.
const windU={value:0}, gustU={value:1};
function windify(mt){ mt.onBeforeCompile=sh=>{ sh.uniforms.uWind=windU; sh.uniforms.uGust=gustU;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 sway;\nuniform float uWind, uGust;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n{ float h=max(0.,position.y-sway.z), a=sway.y*.07*uGust; transformed.x-=h*sin(uWind*1.6+sway.x)*a; transformed.z+=h*cos(uWind*1.3+sway.x)*a*.5; }');
        };
  mt.customProgramCacheKey=()=>'wind'; return mt; }
const batchMat=windify(toon(0xffffff,{vertexColors:true})), batchLine=windify(new THREE.MeshBasicMaterial({color:C.line,side:THREE.BackSide}));
function batchScenery(src,dst,ground){ src.updateMatrixWorld(true);
  const swayOf=new Map(swayers.map(w=>[w.o,w])), parts={}, wp0=new THREE.Vector3();
  src.traverse(o=>{ if(!o.isMesh) return; const mt=o.material, line=mt===lineMat;
    if(!line&&!(mt.isMeshToonMaterial&&!mt.map&&!mt.transparent&&mt.side===THREE.FrontSide)) return;
    let a=o, w=null; while(a&&a!==src&&!w){ w=swayOf.get(a)||null; if(!w) a=a.parent; }
    let sw=[0,0,1e4]; if(w){ a.getWorldPosition(wp0); sw=[w.ph,w.amp||1,wp0.y]; } else o.getWorldPosition(wp0);
    const key=(line?'l':'b')+Math.floor(wp0.x/6)+','+Math.floor(wp0.z/6); (parts[key]=parts[key]||[]).push({o,col:line?null:mt.color,sw}); });
  Object.entries(parts).forEach(([key,list])=>{ const mat=key[0]==='l'?batchLine:batchMat;
    let nv=0, ni=0; for(const {o} of list){ const g=o.geometry; nv+=g.attributes.position.count; ni+=g.index?g.index.count:g.attributes.position.count; }
    const P=new Float32Array(nv*3), N=new Float32Array(nv*3), Cc=mat===batchMat?new Float32Array(nv*3):null, S=new Float32Array(nv*3), I=nv>65535?new Uint32Array(ni):new Uint16Array(ni);
    const v=new THREE.Vector3(), nm=new THREE.Matrix3(); let vo=0, io=0;
    for(const {o,col,sw} of list){ const g=o.geometry, pa=g.attributes.position, na=g.attributes.normal, n=pa.count; nm.getNormalMatrix(o.matrixWorld);
      for(let k=0;k<n;k++){ v.fromBufferAttribute(pa,k).applyMatrix4(o.matrixWorld); P.set([v.x,v.y,v.z],(vo+k)*3);
        let f=1; if(Cc&&ground!==undefined){ const t=Math.min(1,Math.max(0,(v.y-ground)/.42)); f=.8+.2*t*t*(3-2*t); }
        if(na){ v.fromBufferAttribute(na,k).applyMatrix3(nm).normalize(); N.set([v.x,v.y,v.z],(vo+k)*3); }
        if(Cc) Cc.set([col.r*f,col.g*f,col.b*f],(vo+k)*3); S.set(sw,(vo+k)*3); }
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
      q.scale.setScalar(1.3); shade(q); swayers.push({o:q,ph:r()*6}); scen.add(q); }
    // a few crumbs of darker earth, so wide stretches of soil don't look flat
    for(let k=r()<.6?1+Math.floor(r()*2):0;k>0;k--){ const cl=new THREE.Mesh(sph(.05,6,4),m('soilDark')); const a=r()*6, d=.2+r()*.22;
      cl.scale.set(1+r()*.6,.4,1); cl.rotation.y=r()*6; cl.position.set(pos.x+Math.cos(a)*d,-.222,pos.z+Math.sin(a)*d); scen.add(cl); } }
  // everything on the lawn keeps a little room around it (spots), so nothing grows through anything else
  const lite=quality===0, spots=[], outerX=bw/2+.25, outerZ=bd/2+.25;
  const room=(x,z,rad,k=1)=>!(Math.abs(x-cx)<outerX+rad*.8&&Math.abs(z-cz)<outerZ+rad*.8)&&!spots.some(o=>Math.hypot(x-o.x,z-o.z)<(o.r+rad)*k);
  const put=(o,x,z,rad,amp)=>{ o.position.set(x,-.34,z); o.rotation.y=r()*6; shade(o); scen.add(o); spots.push({x,z,r:rad}); if(amp) swayers.push({o,ph:r()*6,amp}); };
  // a loose hedge of shrubs hugging the bed's wooden border, never pushing into it
  for(let i=0,k=0;i<(lite?8:14)&&k<80;k++){ const t=r(), side=Math.floor(r()*4), s=.8+r()*.5, ext=.5*s, off=ext+.02+r()*.12; let x,z;
    if(side<2){ x=cx+(t-.5)*(bw+.4); z=cz+(side?1:-1)*(outerZ+off); } else { z=cz+(t-.5)*(bd+.4); x=cx+(side===2?1:-1)*(outerX+off); }
    if(!room(x,z,ext,.75)) continue; put(bush(r,s,true),x,z,ext,.02); lawnObstacles.push({x,z,r:ext}); i++; }
  // grass tufts along the outside of the border
  for(let i=0;i<(lite?6:16);i++){ const t=r(), side=Math.floor(r()*4); let x,z;
    if(side<2){ x=cx+(t-.5)*bw; z=cz+(side?1:-1)*(outerZ+.08); } else { z=cz+(t-.5)*bd; x=cx+(side===2?1:-1)*(outerX+.08); }
    if(!spots.some(o=>Math.hypot(x-o.x,z-o.z)<o.r)) { const tf=tuft(r,0,1.3+r()*.4); tf.position.set(x,-.34,z); scen.add(tf); swayers.push({o:tf,ph:r()*6,amp:1.2}); } }
  // lawn scenery around the bed: shrubs with grass at their feet, drifts of one kind of flower, mossy stones, pebbles, tufts
  const R=Math.max(bw,bd)/2, ex=bw/Math.max(bw,bd)+.2, ez=bd/Math.max(bw,bd)+.2;
  // more of it close to the bed, where the camera sees it, and a little more round a big bed
  const spot=()=>{ const a=r()*Math.PI*2, d=R+1+Math.pow(r(),1.4)*6; return [cx+Math.cos(a)*d*ex, cz+Math.sin(a)*d*ez]; };
  const dens=Math.min(1.5,Math.max(1,R/3.5)), N={};
  Object.entries(lite?{bush:9,drift:6,rock:2,peb:3,tuft:14}:{bush:18,drift:14,rock:5,peb:6,tuft:40}).forEach(([k,v])=>N[k]=Math.round(v*dens));
  for(let i=0,k=0;i<N.bush&&k<N.bush*5;k++){ const [x,z]=spot(), s=1+r()*.8, ext=.5*s; if(!room(x,z,ext)) continue;
    put(bush(r,s),x,z,ext,.025); lawnObstacles.push({x,z,r:ext}); i++;
    for(let j=0;j<1+Math.floor(r()*2);j++){ const a=r()*6, tf=tuft(r,0,1.5+r()*.4); tf.position.set(x+Math.cos(a)*ext*1.05,-.34,z+Math.sin(a)*ext*1.05); scen.add(tf);
      swayers.push({o:tf,ph:r()*6,amp:1.2}); } }
  for(let i=0,k=0;i<N.rock&&k<N.rock*6;k++){ const [x,z]=spot(), s=1+r()*.6, ext=.34*s; if(!room(x,z,ext)) continue;
    const o=rock(r); o.scale.setScalar(s); put(o,x,z,ext); lawnObstacles.push({x,z,r:ext}); i++;
    const tf=tuft(r,0,1.6); tf.position.set(x+ext*.9,-.34,z+ext*.4); scen.add(tf); swayers.push({o:tf,ph:r()*6,amp:1.2}); }
  for(let i=0,k=0;i<N.drift&&k<N.drift*5;k++){ const [x,z]=spot(); if(!room(x,z,.5)) continue; i++;
    const kind=r(), col=pick(r,PETAL), dcol=r()>.6?0xFFE27A:0xFFFFFF, n=kind<.3?2+Math.floor(r()*2):3+Math.floor(r()*4), here=[];
    for(let j=0,t=0;j<n&&t<n*4;t++){ const a=r()*6, d=j?.12+r()*.38:0, fx=x+Math.cos(a)*d, fz=z+Math.sin(a)*d;
      if(here.some(p=>Math.hypot(fx-p[0],fz-p[1])<.17)||!room(fx,fz,.12)) continue; here.push([fx,fz]); j++;
      const o=kind<.3?lavender(r):kind<.65?tulip(r,col):daisy(r,dcol); o.scale.setScalar(kind<.3?1.7:1.9+r()*.3);
      put(o,fx,fz,.12,1); lawnObstacles.push({x:fx,z:fz,r:.16}); } }
  for(let i=0,k=0;i<N.peb&&k<N.peb*5;k++){ const [x,z]=spot(); if(!room(x,z,.3)) continue; const o=pebbles(r); o.scale.setScalar(1.6); put(o,x,z,.3);
    lawnObstacles.push({x,z,r:.24}); i++; }
  for(let i=0,k=0;i<N.tuft&&k<N.tuft*3;k++){ const [x,z]=spot(); if(!room(x,z,.1,.8)) continue; put(tuft(r,0,1.5+r()*.5),x,z,.1,1.2); i++; }
  batchScenery(scen,garden,-.34);
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
