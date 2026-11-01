// ---------- hats: models, built once per hat and colour option and cloned onto the head ----------
// Each hat is built from the small helpers below (lathes, tubes, leaves, drops, outline hulls), then baked: hBake merges
// its meshes into one per material, so a detailed hat costs only a few draw calls. Hats never animate their parts.
const hatProto={};
const hV2=(x,y)=>new THREE.Vector2(x,y), hV3=(x,y,z)=>new THREE.Vector3(x,y,z), hTAU=Math.PI*2;
// normals averaged over vertices that share a position (seams, poles, hard rims), so an offset never cracks open
function hSmoothN(g){ const p=g.attributes.position, n=g.attributes.normal, acc=new Map(), out=new Float32Array(p.count*3);
  const key=k=>Math.round(p.getX(k)*2e3)+','+Math.round(p.getY(k)*2e3)+','+Math.round(p.getZ(k)*2e3);
  for(let k=0;k<p.count;k++){ const kk=key(k); let a=acc.get(kk); if(!a) acc.set(kk,a=[0,0,0]); a[0]+=n.getX(k); a[1]+=n.getY(k); a[2]+=n.getZ(k); }
  for(let k=0;k<p.count;k++){ const a=acc.get(key(k)), l=Math.hypot(a[0],a[1],a[2])||1; out[k*3]=a[0]/l; out[k*3+1]=a[1]/l; out[k*3+2]=a[2]/l; }
  return out; }
// moves every vertex through f(v) (a Vector3 changed in place), then recomputes smooth normals
function hWarp(g,f){ const p=g.attributes.position, v=hV3(0,0,0);
  for(let k=0;k<p.count;k++){ v.fromBufferAttribute(p,k); f(v,k); p.setXYZ(k,v.x,v.y,v.z); }
  g.computeVertexNormals(); g.setAttribute('normal',new THREE.BufferAttribute(hSmoothN(g),3)); return g; }
// an outline: the mesh's own shape pushed out along its normals by t, drawn in lineMat (back faces), as a child
function hHull(mesh,t=.01){ const g=mesh.geometry.clone(), p=g.attributes.position, n=hSmoothN(g), s=mesh.scale;
  for(let k=0;k<p.count;k++) p.setXYZ(k,p.getX(k)+n[k*3]*t/s.x,p.getY(k)+n[k*3+1]*t/s.y,p.getZ(k)+n[k*3+2]*t/s.z);
  const o=new THREE.Mesh(g,lineMat); mesh.add(o); return o; }
// a solid of revolution from [radius, y] pairs, listed anticlockwise round the solid's cross-section
const hLathe=(pts,seg,mat)=>new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x,y])=>hV2(x,y)),seg),mat);
// a tube through points; taper(t, centre) scales its radius along the way, post(v) warps it before the outline
function hTube(pts,r,mat,o={}){ const seg=o.seg||16, rs=o.rs||6, c=new THREE.CatmullRomCurve3(pts,!!o.closed), g=new THREE.TubeGeometry(c,seg,r,rs,!!o.closed);
  const p=g.attributes.position, v=hV3(0,0,0);
  if(o.taper) for(let k=0;k<p.count;k++){ const t=Math.floor(k/(rs+1))/seg, cp=c.getPointAt(Math.min(1,t)), f=o.taper(t,cp);
    v.fromBufferAttribute(p,k).sub(cp).multiplyScalar(f).add(cp); p.setXYZ(k,v.x,v.y,v.z); }
  if(o.post) for(let k=0;k<p.count;k++){ v.fromBufferAttribute(p,k); o.post(v); p.setXYZ(k,v.x,v.y,v.z); }
  g.computeVertexNormals(); const me=new THREE.Mesh(g,mat); if(o.line) hHull(me,o.line); return me; }
// a torus (or an arc of one) with a fatter torus behind it as its outline; hRing lays it flat at height y
function hTorus(R,r,mat,line,arc=hTAU,rs=8,ts=32){ const me=new THREE.Mesh(new THREE.TorusGeometry(R,r,rs,ts,arc),mat);
  if(line) me.add(new THREE.Mesh(new THREE.TorusGeometry(R,r+line,rs,ts,arc),lineMat)); return me; }
function hRing(R,r,mat,line,y=0,rs=8,ts=32){ const me=hTorus(R,r,mat,line,hTAU,rs,ts); me.rotation.x=Math.PI/2; me.position.y=y; return me; }
// a leaf or petal lying along +x (base at the origin, tip at L), W wide, edges cupped up; tip 1 is pointed, less is rounder
function hLeafGeo(L,W,o={}){ const th=o.th||.012, cup=o.cup||0, tip=o.tip||1, bend=o.bend||0;
  return hWarp(new THREE.SphereGeometry(1,o.ws||12,o.hs||5),v=>{ const u=v.x, s=Math.pow(Math.max(0,1-u*u),u<0?.55:tip), z=v.z*s, x=(u+1)/2*L;
    v.set(x,v.y*th*Math.max(.25,s)+cup*z*z+bend*x*x/L,z*W/2); }); }
// a drop, round at the bottom and pointed at the top (y up), radius r
function hDropGeo(r,seg=10){ const pts=[]; for(let i=0;i<=4;i++){ const a=i/4*Math.PI/2; pts.push(hV2(Math.sin(a)*r,-Math.cos(a)*r)); }
  for(let i=1;i<=4;i++){ const s=i/4; pts.push(hV2(r*Math.pow(1-s,1.4)*(1+.15*Math.sin(s*Math.PI)),s*1.5*r)); }
  return new THREE.LatheGeometry(pts,seg); }
// a fluffy pompom of radius r: a sphere with soft lumps
const hPomGeo=(r,ws=16,hs=12)=>hWarp(new THREE.SphereGeometry(1,ws,hs),v=>v.multiplyScalar(r*(1+.13*Math.sin(v.x*9+1)*Math.sin(v.y*9+2)*Math.sin(v.z*9+3))));
// a ribbon bow s big along x: two pinched loops, two notched tails and a knot
function hLoopGeo(s){ return hWarp(new THREE.SphereGeometry(1,12,8),v=>{ const t=(v.x+1)/2, k=.28+.72*Math.sin(Math.min(1,t*1.25)*Math.PI/2);
  v.set(t*2*s,v.y*k*.72*s,v.z*k*.42*s); }); }
function hTailGeo(s){ const sh=new THREE.Shape(), w=.2*s, L=s*1.05; sh.moveTo(-w,0); sh.lineTo(w,0); sh.lineTo(w*1.25,-L); sh.lineTo(0,-L+w*.9); sh.lineTo(-w*1.25,-L); sh.lineTo(-w,0);
  const g=new THREE.ExtrudeGeometry(sh,{depth:.12*s,bevelEnabled:true,bevelThickness:.05*s,bevelSize:.05*s,bevelSegments:1}); g.translate(0,0,-.06*s); return g; }
function hBow(s,loop,knot,line=.007){ const g=new THREE.Group();
  for(const sd of [-1,1]){ const l=new THREE.Mesh(hLoopGeo(s),loop); l.scale.x=sd; l.rotation.z=sd*.18; hHull(l,line); g.add(l);
    const t=new THREE.Mesh(hTailGeo(s),loop); t.position.set(sd*.12*s,-.15*s,-.05*s); t.rotation.z=sd*.45; hHull(t,line*.8); g.add(t); }
  const k=new THREE.Mesh(sph(Math.max(.01,.32*s),10,8),knot); k.scale.set(.95,1.1,.85); hHull(k,line); g.add(k); return g; }
// merges a finished hat's meshes into one mesh per material (transforms baked in), keeping the hat's own transform
function hBake(h){ h.updateMatrixWorld(true); const inv=h.matrixWorld.clone().invert(), parts=new Map(), mt=new THREE.Matrix4(), nm=new THREE.Matrix3(), v=hV3(0,0,0);
  h.traverse(o=>{ if(o.isMesh){ if(!parts.has(o.material)) parts.set(o.material,[]); parts.get(o.material).push(o); } });
  const out=new THREE.Group(); out.position.copy(h.position); out.rotation.copy(h.rotation); out.scale.copy(h.scale);
  for(const [mat,list] of parts){ const geos=list.map(o=>o.geometry.index?o.geometry.toNonIndexed():o.geometry), n=geos.reduce((a,g)=>a+g.attributes.position.count,0);
    const P=new Float32Array(n*3), N=new Float32Array(n*3); let off=0;
    list.forEach((o,i)=>{ const g=geos[i], pa=g.attributes.position, na=g.attributes.normal; mt.multiplyMatrices(inv,o.matrixWorld); nm.getNormalMatrix(mt);
      const flip=mt.determinant()<0;
      for(let k=0;k<pa.count;k++){ const kk=flip?k-k%3+[0,2,1][k%3]:k; v.fromBufferAttribute(pa,kk).applyMatrix4(mt); P[(off+k)*3]=v.x; P[(off+k)*3+1]=v.y; P[(off+k)*3+2]=v.z;
        v.fromBufferAttribute(na,kk).applyMatrix3(nm).normalize(); N[(off+k)*3]=v.x; N[(off+k)*3+1]=v.y; N[(off+k)*3+2]=v.z; }
      off+=pa.count; if(g!==o.geometry) g.dispose(); });
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(P,3)); geo.setAttribute('normal',new THREE.BufferAttribute(N,3));
    const me=new THREE.Mesh(geo,mat); me.castShadow=mat!==lineMat&&!mat.transparent; out.add(me); }
  return out; }
// a point on an ellipsoid (radii a, b, a) in direction d
const hOnEllipsoid=(d,a,b)=>{ const k=1/Math.sqrt(d.x*d.x/(a*a)+d.y*d.y/(b*b)+d.z*d.z/(a*a)); return d.clone().multiplyScalar(k); };
// lays a small flat piece on a surface: at p, its local z along the normal nrm
function hStick(mesh,p,nrm){ mesh.position.copy(p); mesh.lookAt(p.x+nrm.x,p.y+nrm.y,p.z+nrm.z); return mesh; }

function buildHat(id){ const h=new THREE.Group();
  if(id==='chef'){ // a pleated band with a rolled lip, and a big puffy top spilling over it: a tall middle puff and five round
    // side puffs (like the sticker), blended into one smooth shape with soft creases between them
    const band=new THREE.Mesh(hWarp(new THREE.CylinderGeometry(.19,.2,.17,64,1,true),v=>{ const a=Math.atan2(v.z,v.x), k=1+.025*Math.cos(a*16); v.x*=k; v.z*=k; }),m('chef'));
    band.position.y=.09; hHull(band,.01); h.add(band);
    h.add(hRing(.2,.02,m('chef'),.009,.01,8,40));
    // the top is a union of round puffs, found by casting a ray from the middle out to the farthest puff it meets
    // (a smooth maximum, so they blend into soft creases): a tall middle puff and five side puffs over the band's edge
    const N=5, puffs=[[0,.085,0,.17],[0,-.01,0,.17]];
    for(let k=0;k<N;k++){ const a=k/N*hTAU+.3; puffs.push([.165*Math.cos(a),.015,.165*Math.sin(a),.12]); }
    const pf=v=>{ const l=v.length()||1, dx=v.x/l, dy=v.y/l, dz=v.z/l; let acc=0;
      for(const [cx,cy,cz,r] of puffs){ const b=dx*cx+dy*cy+dz*cz, disc=b*b-(cx*cx+cy*cy+cz*cz)+r*r; if(disc>0) acc+=Math.exp(60*(b+Math.sqrt(disc))); }
      const R=Math.log(acc)/60, under=dy<0?Math.min(1,-dy/.9):0;
      // the underside flattens and tucks in towards the band, so the puffs overhang it
      return v.set(dx*R*(1-.25*under*under),dy*R*(dy<0?.55:1),dz*R*(1-.25*under*under)); };
    const top=new THREE.Mesh(hWarp(new THREE.SphereGeometry(1,64,32),pf),m('chef')); top.position.y=.2; hHull(top,.012); h.add(top);
    // soft creases in the valleys between the side puffs, from the overhang up towards the middle puff
    for(let k=0;k<N;k++){ const a=(k+.5)/N*hTAU+.3, pts=[]; for(let i=0;i<=6;i++){ const th=1.65-i/6*.75;
      pts.push(pf(hV3(Math.sin(th)*Math.cos(a),Math.cos(th),Math.sin(th)*Math.sin(a))).multiplyScalar(1.004).add(hV3(0,.2,0))); }
      h.add(hTube(pts,.005,lineMat,{seg:12,rs:4,taper:t=>Math.sin(Math.PI*Math.min(1,t*1.15))})); } }
  else if(id==='wizard'){ // a floppy brim, a tall cone whose tip flops over with a crumple, a gold band and gold stars
    const brim=hLathe([[.17,.014],[.17,-.012],[.3,-.012],[.335,-.005],[.346,.006],[.335,.016],[.3,.014],[.17,.014]],56,m('wizard'));
    hWarp(brim.geometry,v=>{ const r=Math.hypot(v.x,v.z), a=Math.atan2(v.z,v.x), q=Math.max(0,(r-.19)/.155); v.y+=-.045*q*q+.014*Math.sin(3*a+1)*q*q; });
    hHull(brim,.011); h.add(brim);
    // the bend grows with height, so the base stays round on the band
    const H=.56, bend=t=>[.16*t*t*t,-.04*t*t*t,-.06*t*t*t], cg=new THREE.ConeGeometry(.19,H,28,14), cp=cg.attributes.position;
    for(let k=0;k<cp.count;k++){ const t=cp.getY(k)/H+.5, b=bend(t), f=1-.09*Math.exp(-Math.pow((t-.6)/.035,2))-.06*Math.exp(-Math.pow((t-.72)/.03,2));
      cp.setXYZ(k,cp.getX(k)*f+b[0],cp.getY(k)+b[1],cp.getZ(k)*f+b[2]); }
    cg.computeVertexNormals(); const cone=new THREE.Mesh(cg,m('wizard')); cone.position.y=H/2+.01; hHull(cone,.012); h.add(cone);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.18,.188,.06,28),m('crown')); band.position.y=.045; hHull(band,.008); h.add(band);
    const sg=new THREE.ExtrudeGeometry(SHAPE_STAR(),{depth:.25,curveSegments:1,bevelEnabled:true,bevelThickness:.12,bevelSize:.08,bevelSegments:1}); sg.translate(0,0,-.125);
    for(const [t,a,s] of [[.3,.35,.05],[.55,-.5,.042],[.16,-.95,.036],[.42,1.25,.036],[.24,2.3,.04],[.48,3.5,.034]]){ const r=.19*(1-t), b=bend(t), nx=Math.sin(a), nz=Math.cos(a);
      const st=new THREE.Mesh(sg,m('crown')); st.position.set(nx*r+b[0],.01+t*H+b[1],nz*r+b[2]); st.lookAt(st.position.x+nx,st.position.y+.33,st.position.z+nz);
      st.scale.setScalar(s); hHull(st,.006); h.add(st); }
    h.rotation.x=.08; h.position.y=.006; }
  else if(id==='cowboy'){ // a wide brim curling up at the sides with a bound edge, a pinched crown with a crease, a band with a concho
    const prof=[[.15,.016],[.15,-.016],[.36,-.016],[.386,0],[.36,.016],[.15,.016]], brim=hLathe(prof,48,m('cowboy'));
    const curl=v=>{ const x=v.x, z=v.z*.84, sx=Math.max(0,Math.abs(x)-.17), sz=Math.max(0,Math.abs(z)-.2); return v.set(x,v.y+2.6*sx*sx-.6*sz*sz,z); };
    hWarp(brim.geometry,curl); hHull(brim,.01); h.add(brim);
    const ep=[]; for(let i=0;i<64;i++){ const a=i/64*hTAU; ep.push(curl(hV3(Math.cos(a)*.384,0,Math.sin(a)*.384))); }
    h.add(hTube(ep,.012,m('cowboyBand'),{seg:96,rs:5,closed:true,line:.007}));
    const tg=new THREE.CylinderGeometry(.155,.195,.21,32,4), tp=tg.attributes.position;
    for(let k=0;k<tp.count;k++){ let x=tp.getX(k), y=tp.getY(k), z=tp.getZ(k); const t=y/.21+.5;
      if(t>.99){ y-=.045*Math.max(0,1-(x/.16)*(x/.16)); } x*=1-.22*t*Math.max(0,z/.17); tp.setXYZ(k,x,y,z); }
    tg.computeVertexNormals(); const top=new THREE.Mesh(tg,m('cowboy')); top.position.y=.115; hHull(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.196,.045,32,1,true),m('cowboyBand')); band.position.y=.04; h.add(band);
    const con=hLathe([[0,-.006],[.03,-.006],[.034,0],[.028,.008],[.012,.011],[0,.012]],16,m('crown')); con.rotation.z=Math.PI/2; con.position.set(-.197,.04,0);
    hHull(con,.006); h.add(con);
    const cd=new THREE.Mesh(sph(.011,8,6),m('crown')); cd.position.set(-.212,.04,0); h.add(cd);
    h.rotation.x=.08; h.position.y=.006; }
  else if(id==='phones'){ // a padded headband over the top, sliders, round cups with soft cushions and a little heart on each
    const arc=hTorus(.36,.034,m('phonesBand'),.009,Math.PI,8,28); arc.position.y=-.22; h.add(arc);
    const pad=[]; for(let i=0;i<=8;i++){ const a=Math.PI*(.3+.4*i/8); pad.push(hV3(Math.cos(a)*.33,-.22+Math.sin(a)*.33,0)); }
    h.add(hTube(pad,.03,m('phones'),{seg:12,rs:6,line:.008,taper:t=>.55+.45*Math.sin(t*Math.PI)}));
    const heart=new THREE.ExtrudeGeometry(SHAPE_HEART(),{depth:.3,curveSegments:5,bevelEnabled:true,bevelThickness:.15,bevelSize:.12,bevelSegments:1});
    for(const sx of [-1,1]){ const cup=hLathe([[0,-.05],[.09,-.05],[.115,-.042],[.126,-.022],[.126,.022],[.115,.042],[.09,.05],[0,.05]],22,m('phones'));
      cup.rotation.z=-sx*Math.PI/2; cup.position.set(sx*.38,-.25,0); hHull(cup,.01); h.add(cup);
      const cush=hTorus(.088,.03,m('phonesBand'),0,hTAU,6,20); cush.rotation.y=Math.PI/2; cush.position.set(sx*.325,-.25,0); h.add(cush);
      const cap=hLathe([[0,0],[.08,0],[.086,.01],[.07,.02],[0,.024]],20,m('phonesBand')); cap.rotation.z=-sx*Math.PI/2; cap.position.set(sx*.428,-.25,0); hHull(cap,.006);
      h.add(cap);
      const ht=new THREE.Mesh(heart,m('chef')); ht.scale.setScalar(.034); ht.position.set(sx*.455,-.248,0); ht.rotation.y=sx*Math.PI/2; hHull(ht,.005); h.add(ht);
      const sl=new THREE.Mesh(sph(.04,10,6),m('phonesBand')); sl.scale.set(.85,1.7,1.15); sl.position.set(sx*.362,-.11,0); hHull(sl,.007); h.add(sl); } }
  else if(id==='crown'){ // a twisted vine ring with leaves, six little flowers in pink and butter, tipped outwards
    const vine=[], twist=[]; for(let i=0;i<48;i++){ const a=i/48*hTAU, w=a*6;
      vine.push(hV3(Math.cos(a)*.21,.05,Math.sin(a)*.21)); twist.push(hV3(Math.cos(a)*(.21+.024*Math.cos(w)),.05+.024*Math.sin(w),Math.sin(a)*(.21+.024*Math.cos(w)))); }
    h.add(hTube(vine,.026,m('leaf'),{seg:56,rs:6,closed:true,line:.009}), hTube(twist,.011,m('leafVein'),{seg:72,rs:3,closed:true}));
    const fg=hWarp(new THREE.SphereGeometry(1,20,4),v=>{ const a=Math.atan2(v.z,v.x), q=Math.hypot(v.x,v.z), s=.6+.4*Math.pow(Math.abs(Math.cos(2.5*a)),.6), R=.076*s*q;
      v.set(Math.cos(a)*R,v.y*.014+.03*q*q*s,Math.sin(a)*R); });
    const lg=hLeafGeo(.11,.055,{cup:.02,ws:10,hs:4});
    for(let i=0;i<6;i++){ const a=i/6*hTAU+.25, f=new THREE.Group(); f.position.set(Math.cos(a)*.21,.1,Math.sin(a)*.21); f.rotation.z=Math.cos(a)*.5;
      f.rotation.x=-Math.sin(a)*.5; h.add(f);
      const fl=new THREE.Mesh(fg,m(i%2?'partyB':'petalB')); fl.rotation.y=i; hHull(fl,.007); f.add(fl);
      const c=new THREE.Mesh(sph(.026,8,6),m(i%2?'flag':'key')); c.position.y=.018; c.scale.y=.7; f.add(c);
      const b=a+Math.PI/6, lf=new THREE.Mesh(lg,m('leaf')); lf.position.set(Math.cos(b)*.21,.06,Math.sin(b)*.21); lf.rotation.set(0,-b-Math.PI/2+(i%2?-.4:.4)+Math.PI*(i%2),.25);
      hHull(lf,.006); h.add(lf); } }
  else if(id==='mush'){ // a toadstool cap with a rolled rim, cream gills underneath and flat cream spots
    const cap=new THREE.Mesh(hWarp(new THREE.SphereGeometry(1,32,10,0,hTAU,0,Math.PI/2),v=>{ const s=Math.hypot(v.x,v.z); v.set(v.x*.27*(1+.04*Math.pow(s,6)),v.y*.21+.008,v.z*.27*(1+.04*Math.pow(s,6))); }),m('mushRed'));
    hHull(cap,.012); h.add(cap);
    h.add(hRing(.272,.024,m('mushRed'),.009,.006,8,40));
    const gills=hLathe([[.06,.03],[.27,-.004]],64,m('stem')); hWarp(gills.geometry,v=>{ const a=Math.atan2(v.z,v.x), r=Math.hypot(v.x,v.z); v.y+=.006*Math.cos(a*32)*Math.min(1,r/.15); });
    h.add(gills);
    for(const [th,a,s] of [[.12,0,.05],[.62,.4,.045],[.7,2.1,.05],[.58,3.6,.042],[.66,5.0,.04],[1.08,1.2,.034],[1.1,2.8,.038],[1.04,4.3,.032],[1.12,5.7,.036],[.95,-.5,.03]]){
      const d=hV3(Math.sin(th)*Math.cos(a),Math.cos(th),Math.sin(th)*Math.sin(a)), p=hV3(d.x*.27,d.y*.21+.008,d.z*.27), nrm=hV3(d.x/.27,d.y/.21,d.z/.27).normalize();
      const sp=hStick(new THREE.Mesh(sph(s,12,8),m('stem')),p,nrm); sp.scale.set(1,1,.3); h.add(sp); } }
  else if(id==='straw'){ // a boater: a woven brim with a turned-up edge, a rounded crown, a pink band with a bow and a little daisy
    const brim=hLathe([[.17,.012],[.17,-.012],[.3,-.012],[.352,-.004],[.372,.01],[.376,.022],[.362,.027],[.3,.012],[.17,.012]],44,m('straw'));
    hHull(brim,.011); h.add(brim);
    h.add(hRing(.27,.0055,m('strawDark'),0,.0125,4,40));
    const top=hLathe([[.192,-.01],[.19,.06],[.184,.125],[.174,.15],[.152,.16],[.08,.164],[0,.165]],32,m('straw')); hHull(top,.011); h.add(top);
    h.add(hRing(.184,.0045,m('strawDark'),0,.112,4,36));
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.194,.196,.05,40,1,true),m('petalB')); band.position.y=.04; h.add(band);
    const bow=hBow(.06,m('petalB'),m('flag'),.007); bow.position.set(.18,.045,.09); bow.lookAt(.18*3,.045,.09*3); h.add(bow);
    const dz=new THREE.Group(); dz.position.set(.12,.06,.16); dz.lookAt(.12*3,.12,.16*3); h.add(dz);
    const pg=hLeafGeo(.045,.022,{tip:.5,cup:.01,ws:8,hs:4});
    for(let i=0;i<7;i++){ const p=new THREE.Mesh(pg,m('chef')); p.rotation.set(Math.PI/2,0,i/7*hTAU); p.rotateY(-.15); hHull(p,.004); dz.add(p); }
    const dc=new THREE.Mesh(sph(.016,10,8),m('key')); dc.position.z=.006; dz.add(dc); }
  else if(id==='tophat'){ // a tall crown that flares at the top, a brim curled up at the sides, a pink band and a bow
    const top=hLathe([[.168,-.005],[.162,.08],[.159,.16],[.164,.24],[.175,.3],[.176,.312],[.168,.32],[.1,.323],[0,.324]],40,m('topHat')); hHull(top,.012); h.add(top);
    const brim=hLathe([[.16,.014],[.16,-.012],[.27,-.012],[.288,-.002],[.29,.01],[.27,.016],[.16,.014]],48,m('topHat'));
    hWarp(brim.geometry,v=>{ const sx=Math.max(0,Math.abs(v.x)-.15), sz=Math.max(0,Math.abs(v.z)-.18); v.y+=1.9*sx*sx-.4*sz*sz; }); hHull(brim,.011); h.add(brim);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.168,.17,.07,40,1,true),m('petalB')); band.position.y=.05; h.add(band);
    for(const y of [.015,.085]) h.add(hRing(.169,.006,m('flag'),0,y,4,36));
    const bow=hBow(.062,m('petalB'),m('flag'),.007); bow.position.set(.15,.05,.08); bow.lookAt(.45,.05,.24); h.add(bow); }
  else if(id==='leaf'){ // a big pointed leaf laid over the head: it bends down the sides, its tip curls up, a stalk curls at the back, a dewdrop sits on it
    const L=.39, W=.23, R=.48, cy=.098-R, lg=new THREE.SphereGeometry(1,32,10), lp=lg.attributes.position;
    // a point on the bent leaf: x along it, z across it, lifted by d off the middle sheet
    const leafAt=(x,z,d)=>{ const ax=x/R, az=z/R, n=new THREE.Vector3(Math.sin(ax)*Math.cos(az),Math.cos(ax)*Math.cos(az),Math.sin(az));
      return n.multiplyScalar(R+d).add(new THREE.Vector3(0,cy+.06*Math.pow(Math.max(0,x/L),3),0)); };
    for(let k=0;k<lp.count;k++){ const u=lp.getX(k), v=lp.getZ(k), p=leafAt(u*L,v*W*Math.pow(Math.max(0,1-u*u),.4),lp.getY(k)*.022); lp.setXYZ(k,p.x,p.y,p.z); }
    lg.computeVertexNormals(); const lf=new THREE.Mesh(lg,m('leafBig')); hHull(lf,.01); h.add(lf);
    const rib=[], st=[]; for(let k=0;k<=10;k++){ const x=-L*.92+k/10*L*1.75; rib.push(leafAt(x,0,.02)); }
    h.add(hTube(rib,.011,m('leafVein'),{seg:20,rs:5,taper:t=>1-.6*t}));
    for(const sd of [-1,1]) for(const x0 of [-.16,0,.15]){ const pts=[]; for(let k=0;k<=3;k++){ const t=k/3;
      pts.push(leafAt(x0+t*.09,sd*t*W*.55*(1-Math.abs(x0)/L*.6),.016)); }
      h.add(hTube(pts,.007,m('leafVein'),{seg:5,rs:4,taper:t=>1-.5*t})); }
    const s0=leafAt(-L*.95,0,0); for(let k=0;k<=5;k++){ const t=k/5; st.push(new THREE.Vector3(s0.x-.07*t-.02*Math.sin(t*3),s0.y-.01+.09*t*t,s0.z)); }
    h.add(hTube(st,.017,m('leafVein'),{seg:10,rs:6,line:.007,taper:t=>1-.25*t}));
    const dp=leafAt(.12,.07,.03), dr=new THREE.Mesh(sph(.036,14,10),m('dew')); dr.position.copy(dp); dr.scale.set(1,.72,1); hHull(dr,.007); h.add(dr);
    const sh=new THREE.Mesh(sph(.01,6,4),m('chef')); sh.position.copy(dp).add(hV3(-.012,.016,.012)); h.add(sh);
    h.rotation.y=-.5; }
  else if(id==='rainhat'){ // a sou'wester: a six-panel crown with a button, a brim that sweeps long and low at the back, stitched round its edge
    const crown=hLathe([[.205,-.045],[.2,.03],[.19,.09],[.163,.14],[.115,.172],[.05,.186],[0,.188]],36,m('rainHat')); hHull(crown,.012); h.add(crown);
    const cprof=[[.2,.03],[.19,.09],[.163,.14],[.115,.172],[.05,.186],[.012,.188]];
    for(let i=0;i<6;i++){ const a=i/6*hTAU+.5; h.add(hTube(cprof.map(([r,y])=>hV3(Math.cos(a)*(r+.004),y+.003,Math.sin(a)*(r+.004))),.0045,lineMat,{seg:10,rs:4})); }
    const btn=new THREE.Mesh(sph(.03,12,8),m('rainHat')); btn.position.y=.19; btn.scale.y=.6; hHull(btn,.007); h.add(btn);
    const sw=v=>{ const r=Math.hypot(v.x,v.z); if(r<.195) return v; const a=Math.atan2(v.z,v.x), b=Math.max(0,-v.z/r), f=Math.max(0,v.z/r), q=(r-.19)/.16;
      const r2=.19+(r-.19)*(1+.5*b*b); v.x=Math.cos(a)*r2; v.z=Math.sin(a)*r2; v.y+=-.03*b*b*q+.035*f*f*q; return v; };
    const brim=hLathe([[.19,.022],[.19,-.004],[.3,-.026],[.34,-.04],[.356,-.044],[.35,-.03],[.3,-.01],[.19,.022]],48,m('rainHat'));
    hWarp(brim.geometry,sw); hHull(brim,.011); h.add(brim);
    for(let i=0;i<26;i++){ const a0=i/26*hTAU, pts=[]; for(let k=0;k<=2;k++){ const a=a0+k*.09; pts.push(sw(hV3(Math.cos(a)*.3,-.004,Math.sin(a)*.3))); }
      h.add(hTube(pts,.004,lineMat,{seg:2,rs:4})); }
    h.position.y=.012; }
  else if(id==='acorn'){ // an acorn cup: a round cap covered in rows of little scales, a thick rim and a curly stalk
    const cap=new THREE.Mesh(hWarp(new THREE.SphereGeometry(1,28,9,0,hTAU,0,Math.PI/2),v=>v.set(v.x*.24,v.y*.18,v.z*.24)),m('acornCap')); hHull(cap,.012); h.add(cap);
    h.add(hRing(.238,.024,m('acornCap'),.009,.005,8,36));
    for(const [th,n,o] of [[1.35,15,0],[1.08,13,.5],[.8,10,0],[.5,6,.5]]) for(let i=0;i<n;i++){ const a=(i+o)/n*hTAU;
      const d=hV3(Math.sin(th)*Math.cos(a),Math.cos(th),Math.sin(th)*Math.sin(a)), p=hOnEllipsoid(d,.24,.18), nrm=hV3(p.x/.0576,p.y/.0324,p.z/.0576).normalize();
      const sc=hStick(new THREE.Mesh(sph(.034,7,4),m((i+(th>1?0:1))%2?'acornScale':'acornCap')),p.multiplyScalar(.995),nrm); sc.scale.set(.95,1.25,.38); h.add(sc); }
    const st=[hV3(0,.15,0),hV3(.005,.21,0),hV3(.03,.26,0),hV3(.07,.275,0)];
    h.add(hTube(st,.024,m('acornCap'),{seg:10,rs:7,line:.008,taper:t=>1-.35*t}));
    const tipb=new THREE.Mesh(sph(.016,8,6),m('acornCap')); tipb.position.copy(st[3]); hHull(tipb,.008); h.add(tipb); }
  else if(id==='bee'){ // a headband hugging the head from side to side (the head's centre is .27 below the hat slot), springy antennae with fuzzy tips
    const band=hTorus(.355,.026,m('pupil'),0,Math.PI-.7,8,30); band.rotation.z=.35; band.position.y=-.27; h.add(band);
    for(const a of [.35,Math.PI-.35]){ const e=new THREE.Mesh(sph(.026,8,6),m('pupil')); e.position.set(Math.cos(a)*.355,-.27+Math.sin(a)*.355,0); h.add(e); }
    for(const sd of [-1,1]){ const pts=[hV3(sd*.2,.01,0),hV3(sd*.215,.1,.01),hV3(sd*.225,.19,.03),hV3(sd*.27,.27,.03),hV3(sd*.31,.32,.01)];
      h.add(hTube(pts,.014,m('pupil'),{seg:14,rs:5}));
      const ball=new THREE.Mesh(sph(.056,14,10),m('crown')); ball.position.set(sd*.325,.345,.005); hHull(ball,.01); h.add(ball);
      const stripe=hTorus(.054,.011,m('pupil'),0,hTAU,6,20); stripe.position.copy(ball.position); stripe.rotation.set(Math.PI/2,0,sd*.6); h.add(stripe);
      const sh=new THREE.Mesh(sph(.014,6,4),m('chef')); sh.position.copy(ball.position).add(hV3(-sd*.018,.03,.035)); h.add(sh); } }
  else if(id==='party'){ // a striped cone with a ruffle round its base and a fluffy pompom on top
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.17,.44,32,4),m('partyA')); cone.position.y=.24; hHull(cone,.012); h.add(cone);
    const sp=[]; for(let i=0;i<=40;i++){ const t=.08+i/40*.74, a=t*2.6*hTAU, r=.17*(1-t)+.004; sp.push(hV3(Math.cos(a)*r,.02+t*.44,Math.sin(a)*r)); }
    h.add(hTube(sp,.016,m('partyB'),{seg:80,rs:5,taper:t=>1-.45*t}));
    const ruf=new THREE.Mesh(hWarp(new THREE.TorusGeometry(.172,.03,6,56),v=>{ const a=Math.atan2(v.y,v.x), k=1+.07*Math.cos(a*14); v.x*=k; v.y*=k; v.z+=.008*Math.sin(a*14); }),m('partyB'));
    ruf.rotation.x=Math.PI/2; ruf.position.y=.035; hHull(ruf,.008); h.add(ruf);
    const pom=new THREE.Mesh(hPomGeo(.066),m('petalB')); pom.position.y=.47; hHull(pom,.01); h.add(pom); }
  else if(id==='brolly'){ h.rotation.set(.22,0,-.18); // a cocktail umbrella stuck in the top: eight sagging panels with a scalloped edge, ribs and a finial
    const stick=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.4,6),m('pole')); stick.position.y=.18; h.add(stick);
    const run=new THREE.Mesh(new THREE.CylinderGeometry(.02,.022,.04,10),m('pole')); run.position.y=.27; hHull(run,.005); h.add(run);
    const RAD=.31, HT=.15, Y=.385, sag=v=>{ const a=Math.atan2(v.z,v.x), f=((a/(hTAU/8))%1+1)%1, s=Math.sin(Math.PI*f), q=Math.min(1,Math.hypot(v.x,v.z)/RAD);
      const k=1-.08*s*q*q; v.x*=k; v.z*=k; v.y-=.022*s*q; return v; };
    const cg=hWarp(new THREE.ConeGeometry(RAD,HT,64,5,true),sag), can=new THREE.Mesh(cg,m('brolly')); can.position.y=Y; h.add(can);
    // seen from below (the home worm looks up at it) the canopy is hollow: a pale lining
    can.add(new THREE.Mesh(cg,MC.brollyIn||(MC.brollyIn=toon(0xE4F4FC,{side:THREE.BackSide}))));
    const edge=[]; for(let i=0;i<64;i++){ const a=i/64*hTAU; edge.push(sag(hV3(Math.cos(a)*RAD,-HT/2,Math.sin(a)*RAD)).add(hV3(0,Y,0))); }
    h.add(hTube(edge,.008,lineMat,{seg:96,rs:4,closed:true}));
    for(let i=0;i<8;i++){ const a=i/8*hTAU, rib=[]; for(let k=0;k<=3;k++){ const q=.08+k/3*.92; rib.push(hV3(Math.cos(a)*RAD*q,Y+HT/2-HT*q+.006,Math.sin(a)*RAD*q)); }
      h.add(hTube(rib,.0045,lineMat,{seg:4,rs:4}));
      const x=Math.cos(a)*RAD*.97, z=Math.sin(a)*RAD*.97, sp=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.3,4),m('pole'));
      sp.position.set(x/2,.36,z/2); sp.lookAt(x,.315,z); sp.rotateX(Math.PI/2); h.add(sp);
      const bead=new THREE.Mesh(sph(.013,6,4),m('pole')); bead.position.set(Math.cos(a)*RAD,Y-HT/2-.004,Math.sin(a)*RAD); h.add(bead); }
    const fin=new THREE.Mesh(new THREE.CylinderGeometry(.008,.014,.04,8),m('pole')); fin.position.y=Y+HT/2+.015; h.add(fin);
    const tip=new THREE.Mesh(sph(.022,10,8),m('pole')); tip.position.y=Y+HT/2+.04; hHull(tip,.006); h.add(tip); }
  else if(id==='beret'){ // a slouchy felt beret on a rolled headband, a little stalk on top and a dewdrop pinned to the front
    const g=new THREE.Group(); g.position.set(.03,.02,0); g.rotation.set(.05,0,-.2); h.add(g);
    const b=hLathe([[.17,-.004],[.2,.002],[.25,.022],[.276,.046],[.272,.07],[.245,.09],[.185,.106],[.1,.116],[0,.119]],44,m('beret')); hHull(b,.012); g.add(b);
    g.add(hRing(.172,.021,m('beret'),.008,.0,8,36));
    g.add(hTube([hV3(0,.112,0),hV3(.004,.14,0),hV3(.02,.158,0),hV3(.04,.16,0)],.014,m('beret'),{seg:8,rs:6,line:.007,taper:t=>1-.3*t}));
    const dp=hV3(-.13,.088,.17), dr=new THREE.Mesh(hDropGeo(.05,14),m('dew')); dr.position.copy(dp); dr.rotation.set(1.15,0,.3); dr.scale.set(1,.85,1); hHull(dr,.007); g.add(dr);
    const sh=new THREE.Mesh(sph(.011,6,4),m('chef')); sh.position.copy(dp).add(hV3(-.014,.008,.034)); g.add(sh); }
  else if(id==='bow'){ // a ribbon bow perched on the top of the head, off to one side: pinched loops with a fold, notched tails, a knot
    const g=new THREE.Group(); g.position.set(.17,.07,.03); g.rotation.set(-.15,-.3,-.5); h.add(g);
    const s=.115;
    for(const sd of [-1,1]){ const l=new THREE.Mesh(hLoopGeo(s),m('bowDark')); l.scale.x=sd; l.rotation.z=sd*.22; hHull(l,.01); g.add(l);
      const fold=[]; for(let k=0;k<=5;k++){ const t=.2+k/5*.6, kk=.28+.72*Math.sin(Math.min(1,t*1.25)*Math.PI/2); fold.push(hV3(t*2*s,0,.42*s*kk*.97)); }
      const fl=hTube(fold,.005,lineMat,{seg:8,rs:4}); fl.scale.x=sd; fl.rotation.z=sd*.22; g.add(fl);
      const t=new THREE.Mesh(hTailGeo(s*.9),m('bowDark')); t.position.set(sd*.03,-.03,-.01); t.rotation.z=sd*.42; hHull(t,.008); g.add(t); }
    const knot=new THREE.Mesh(sph(.048,14,10),m('bowKnot')); knot.scale.set(.9,1.1,.8); knot.position.z=.012; hHull(knot,.008); g.add(knot);
    for(const sd of [-1,1]){ const c=hTube([hV3(sd*.02,-.035,.05),hV3(sd*.026,0,.053),hV3(sd*.02,.035,.05)],.0045,lineMat,{seg:4,rs:4}); g.add(c); } }
  else if(id==='gold'){ // a garden crown: a flared band with six points tipped with balls, a rolled rim and big jewels
    const H=a=>{ const f=((a/(hTAU/6))%1+1)%1, tri=1-Math.abs(f*2-1); return .068+.088*Math.pow(tri,1.25); };
    const prof=[[.18,.98],[.18,.03],[.183,0],[.197,0],[.2,.03],[.2,.98],[.197,1],[.183,1],[.18,.98]];
    const band=hLathe(prof,48,m('crown')); hWarp(band.geometry,v=>{ const a=Math.atan2(v.z,v.x), t=v.y, y=t*H(a), k=1+.12*y/.156; v.set(v.x*k,y,v.z*k); });
    band.position.y=.005; hHull(band,.009); h.add(band);
    h.add(hRing(.198,.017,m('crown'),.008,.016,6,36));
    for(let i=0;i<6;i++){ const a=(i+.5)/6*hTAU, r=.19*(1+.12*H(a)/.156);
      const ball=new THREE.Mesh(sph(.022,8,6),m('crown')); ball.position.set(Math.cos(a)*r,.005+H(a)+.012,Math.sin(a)*r); hHull(ball,.007); h.add(ball);
      const b=i/6*hTAU, gm=new THREE.Mesh(sph(.03,10,6),m(i%2?'petalB':'partyA'));
      hStick(gm,hV3(Math.cos(a)*.215,.058,Math.sin(a)*.215),hV3(Math.cos(a),-.12,Math.sin(a))); gm.scale.set(.85,1.1,.55); hHull(gm,.006); h.add(gm);
      const sm=new THREE.Mesh(sph(.014,6,4),m(i%2?'partyA':'petalB')); hStick(sm,hV3(Math.cos(b)*.21,.05,Math.sin(b)*.21),hV3(Math.cos(b),-.1,Math.sin(b))); sm.scale.z=.6;
      h.add(sm); } }
  else if(id==='beanie'){ // a knitted dome with ribs running to the top, a ribbed turn-up and a fluffy pompom
    const dome=new THREE.Mesh(hWarp(new THREE.SphereGeometry(1,48,8,0,hTAU,0,Math.PI/2),v=>{ const a=Math.atan2(v.z,v.x), s=Math.hypot(v.x,v.z), k=.25*(1+.022*Math.cos(16*a)*Math.pow(s,1.5));
      v.set(v.x*k,v.y*.9*.25,v.z*k); }),m('beanie')); dome.position.y=-.02; hHull(dome,.012); h.add(dome);
    const cuff=hLathe([[.245,-.05],[.27,-.054],[.287,-.04],[.293,-.005],[.287,.03],[.27,.044],[.245,.04]],60,m('beanieRib'));
    hWarp(cuff.geometry,v=>{ const a=Math.atan2(v.z,v.x), r=Math.hypot(v.x,v.z), k=(r+.007*Math.cos(a*30)*Math.min(1,(r-.24)/.03))/r; v.x*=k; v.z*=k; });
    cuff.position.y=-.01; hHull(cuff,.01); h.add(cuff);
    const pom=new THREE.Mesh(hPomGeo(.084,16,12),m('dew')); pom.position.y=.26; hHull(pom,.011); h.add(pom); }
  else if(id==='sunflower'){ // one big bloom tucked on top, tipped toward the front: two rings of pointed petals, a seedy middle, two leaves
    const g=new THREE.Group(); g.position.set(.04,.08,.01); g.rotation.set(.3,0,-.15); g.scale.setScalar(1.12); h.add(g);
    const lg=hLeafGeo(.17,.075,{cup:.025,ws:14,hs:5});
    for(const a of [2.2,3.9]){ const lf=new THREE.Mesh(lg,m('leaf')); lf.position.set(Math.sin(a)*.06,-.03,Math.cos(a)*.06); lf.rotation.set(0,a-Math.PI/2,-.12); hHull(lf,.008); g.add(lf);
      const vp=[]; for(let k=0;k<=3;k++) vp.push(hV3(.03+k*.035,.012,0)); const vn=hTube(vp,.005,m('leafVein'),{seg:4,rs:4}); vn.position.copy(lf.position); vn.rotation.copy(lf.rotation); g.add(vn); }
    const pg=hLeafGeo(.11,.05,{cup:.012,ws:10,hs:4,bend:.02});
    for(let i=0;i<12;i++){ const a=i/12*hTAU, p=new THREE.Mesh(pg,m('sunPetal')); p.position.set(Math.cos(a)*.065,0,Math.sin(a)*.065); p.rotation.set(0,-a,.12); hHull(p,.007); g.add(p);
      const b=a+Math.PI/12, q=new THREE.Mesh(pg,m('key')); q.position.set(Math.cos(b)*.055,.012,Math.sin(b)*.055); q.rotation.set(0,-b,.28); q.scale.setScalar(.82); g.add(q); }
    const core=new THREE.Mesh(sph(.085,18,10),m('sunCore')); core.scale.y=.42; core.position.y=.018; hHull(core,.008); g.add(core);
    for(let i=0;i<16;i++){ const r=.068*Math.sqrt((i+.5)/16), a=i*2.39996, d=new THREE.Mesh(sph(.011,6,4),m('acornNut'));
      d.position.set(Math.cos(a)*r,.018+.085*.42*Math.sqrt(Math.max(0,1-r*r/(.085*.085)))+.002,Math.sin(a)*r); g.add(d); } }
  else if(id==='horn'){ // a headband hugging the head side to side, with a curved, ridged beetle horn on top
    const band=hTorus(.355,.03,m('beetleDark'),.008,Math.PI-.7,8,30); band.rotation.z=.35; band.position.y=-.27; h.add(band);
    for(const a of [.35,Math.PI-.35]){ const e=new THREE.Mesh(sph(.03,8,6),m('beetleDark')); e.position.set(Math.cos(a)*.355,-.27+Math.sin(a)*.355,0); hHull(e,.008); h.add(e); }
    // a shiny shell plate on top of the head, the horn rising from it and hooking forward, ridged at the base, forked at the tip
    const base=hLathe([[.12,-.02],[.125,.005],[.11,.035],[.075,.06],[.03,.072],[0,.074]],24,m('beetleDark')); base.position.z=-.04; hHull(base,.01); h.add(base);
    const pts=[]; for(let k=0;k<=8;k++){ const t=k/8, a=t*1.45; pts.push(hV3(0,.05+Math.sin(a)*.25,-.06+(1-Math.cos(a))*.22)); }
    const path=new THREE.CatmullRomCurve3(pts), rad=t=>.068*(1-t*.72);
    h.add(hTube(pts,.068,m('beetle'),{seg:16,rs:12,line:.011,taper:t=>1-t*.72}));
    for(const t of [.12,.26,.4]){ const c=path.getPointAt(t), tg=path.getTangentAt(t), r=new THREE.Mesh(new THREE.TorusGeometry(rad(t)+.002,.01,6,18),m('beetleDark'));
      r.position.copy(c); r.lookAt(c.clone().add(tg)); h.add(r); }
    const c8=path.getPointAt(.8), pr=[c8,c8.clone().add(hV3(0,.05,-.005)),c8.clone().add(hV3(0,.085,-.03))];
    h.add(hTube(pr,.022,m('beetle'),{seg:6,rs:8,line:.009,taper:t=>1-t*.7}));
    const tip=new THREE.Mesh(sph(.02,8,6),m('beetle')); tip.position.copy(pts[8]); hHull(tip,.008); h.add(tip);
    const hl=[]; for(let k=0;k<=6;k++){ const t=.5+k/6*.32, c=path.getPointAt(t); hl.push(c.add(hV3(-.018,.02*(1-t),rad(t)*.75))); }
    h.add(hTube(hl,.009,m('beetleSpot'),{seg:8,rs:4,taper:t=>1-.5*t}));
    for(const [x,z] of [[.06,.05],[-.065,.03]]){ const sp=new THREE.Mesh(sph(.016,8,6),m('beetleSpot')); hStick(sp,hV3(x,.052,z-.04),hV3(x,.6,z).normalize()); sp.scale.z=.4; h.add(sp); } }
  else if(id==='shell'){ // the snails' lilac shell, worn like a cap: a round shell whose whorls swell out in a spiral on both faces, the front one to the front
    // on each face the whorls step out from the middle: s counts turns along the spiral, and each turn bulges between its seams
    const A=.235, B=.215, Cz=.175, P=.36, wh=(v,s)=>{ const f=s-Math.floor(s); return 1+.07*(Math.pow(Math.sin(Math.PI*f),.6)-.55)*Math.pow(Math.abs(v.z),1.4); };
    const sOf=v=>Math.hypot(v.x,v.y)/P+Math.atan2(v.y,v.x)*Math.sign(v.z||1)/hTAU;
    const body=new THREE.Mesh(hWarp(new THREE.SphereGeometry(1,36,24),v=>{ const k=wh(v,sOf(v)); v.set(v.x*A*k,v.y*B*k,v.z*Cz*k); }),m('shellHat'));
    body.position.set(0,.13,-.02); hHull(body,.012); h.add(body);
    // the seams between the whorls, on both faces
    for(const sd of [-1,1]){ const pts=[]; for(let i=0;i<=44;i++){ const u=.08+i/44*2.45, rho=Math.min(.97,P*u), ph=-hTAU*u*sd, vz=Math.sqrt(1-rho*rho)*sd;
        const v=hV3(rho*Math.cos(ph),rho*Math.sin(ph),vz), k=wh(v,Math.round(u))*1.012; pts.push(hV3(v.x*A*k,v.y*B*k+.13,v.z*Cz*k-.02)); }
      h.add(hTube(pts,.011,m('shellSpiral'),{seg:72,rs:4,taper:t=>.45+.55*t})); }
 }
  else if(id==='pumpkin'){ // a little pumpkin: eight plump lobes in two oranges, dimpled on top, a stubby stem, a curly tendril and a leaf
    const p=new THREE.Group(); p.position.y=.085; h.add(p);
    const pw=(i0,n)=>v=>{ const l=v.length()||1, dx=v.x/l, dy=v.y/l, dz=v.z/l, a=Math.atan2(dz,dx), f=(((a+i0)/(hTAU/8))%1+1)%1, s2=1-dy*dy;
      const R=.2*(.86+.14*Math.pow(Math.sin(Math.PI*f),.55)); return v.set(dx*R,dy*R*.7-.045*dy*Math.exp(-s2/.04),dz*R); };
    for(let i=0;i<8;i++){ const g=hWarp(new THREE.SphereGeometry(1,6,14,i/8*hTAU,hTAU/8),pw(0)); p.add(new THREE.Mesh(g,m(i%2?'pumpkin':'pumpkinRib'))); }
    const full=new THREE.Mesh(hWarp(new THREE.SphereGeometry(1,48,14),pw(0)),m('pumpkin')); p.add(hHull(full,.012));
    const stem=new THREE.Mesh(hWarp(new THREE.CylinderGeometry(.024,.032,.1,6,3),v=>{ const t=v.y/.1+.5, k=1+.35*t*t; v.x=v.x*k+.03*t*t; v.z*=k; }),m('acornCap'));
    stem.position.set(0,.135,0); stem.rotation.z=-.15; hHull(stem,.008); p.add(stem);
    const td=[]; for(let i=0;i<=14;i++){ const t=i/14, a=t*3.4*Math.PI, r=.045*(1-t*.6); td.push(hV3(-.03-t*.09+Math.cos(a)*r*.6,.1+t*.05+Math.sin(a)*r,.04+Math.sin(a)*r*.4)); }
    p.add(hTube(td,.007,m('leafVein'),{seg:28,rs:4,line:.005}));
    const lf=new THREE.Mesh(hLeafGeo(.14,.1,{cup:.025,tip:.8}),m('leaf')); lf.position.set(.015,.115,.02); lf.rotation.set(.15,-.6,.35); hHull(lf,.008); p.add(lf);
    const vn=hTube([hV3(.02,.012,0),hV3(.07,.016,0),hV3(.12,.012,0)],.005,m('leafVein'),{seg:4,rs:4}); vn.position.copy(lf.position); vn.rotation.copy(lf.rotation); p.add(vn); }
  else if(id==='bonnet'){ // a soft cap of overlapping petals laid over the head like an upside-down bloom, a pollen bud with stamens on top
    // each petal is bent onto a dome round the head's centre: x runs down from the top, z across, y lifts it off the dome
    const dome=(L,W,R,t0,az,lift)=>hWarp(hLeafGeo(L,W,{cup:.035,tip:.65,ws:10,hs:4}),v=>{ const th=t0+v.x/R, ph=az+v.z/(R*Math.max(.2,Math.sin(th))), rr=R+v.y+lift;
      v.set(Math.sin(th)*Math.cos(ph)*rr,-.27+Math.cos(th)*rr,-.03+Math.sin(th)*Math.sin(ph)*rr); });
    for(let i=0;i<9;i++){ const p=new THREE.Mesh(dome(.3,.21,.37,.12,i/9*hTAU,0),m('petalB')); hHull(p,.009); h.add(p); }
    for(let i=0;i<7;i++){ const p=new THREE.Mesh(dome(.22,.15,.39,.05,(i+.5)/7*hTAU,.004),m('bowDark')); hHull(p,.008); h.add(p); }
    const bud=new THREE.Mesh(sph(.07,14,10),polMat('Y','light')); bud.position.y=.15; hHull(bud,.01); h.add(bud);
    for(let i=0;i<5;i++){ const a=i*1.26, d=new THREE.Mesh(sph(.018,8,6),polMat('Y','dark')); d.position.set(Math.cos(a)*.035,.205,Math.sin(a)*.035); h.add(d); }
    for(let i=0;i<6;i++){ const a=i/6*hTAU+.3, x=Math.cos(a), z=Math.sin(a);
      h.add(hTube([hV3(x*.04,.15,z*.04),hV3(x*.075,.2,z*.075),hV3(x*.11,.225,z*.11)],.0055,m('leafVein'),{seg:5,rs:4}));
      const tb=new THREE.Mesh(sph(.017,6,5),polMat('Y','dark')); tb.position.set(x*.115,.23,z*.115); hHull(tb,.005); h.add(tb); } }
  else if(id==='miner'){ // a hard hat for a worm who digs: three raised ridges, a peak at the front and a lamp with a gold bezel
    const dome=hLathe([[.24,-.005],[.245,.03],[.235,.08],[.21,.13],[.165,.17],[.1,.195],[0,.205]],40,m('miner')); hHull(dome,.012); h.add(dome);
    const pk=v=>{ const r=Math.hypot(v.x,v.z); if(r<.225) return v; const a=Math.atan2(v.z,v.x), f=Math.max(0,v.z/r), q=(r-.225)/.07;
      const r2=.225+(r-.225)*(1+1.3*f*f); v.x=Math.cos(a)*r2; v.z=Math.sin(a)*r2; v.y+=-.03*f*f*q+.012*(1-f)*q; return v; };
    const brim=hLathe([[.225,.016],[.225,-.012],[.285,-.012],[.298,-.002],[.296,.01],[.285,.016],[.225,.016]],48,m('minerDark')); hWarp(brim.geometry,pk);
    hHull(brim,.01); h.add(brim);
    for(const [sx,r] of [[0,.022],[-.42,.014],[.42,.014]]){ const pts=[]; for(let k=0;k<=10;k++){ const ph=-1.25+k/10*2.5;
        const d=hV3(Math.sin(sx)*Math.cos(ph),Math.cos(sx)*Math.cos(ph),Math.sin(ph)), p=hOnEllipsoid(d,.245,.205);
        pts.push(p.multiplyScalar(1.02)); }
      h.add(hTube(pts,r,m('minerDark'),{seg:14,rs:5,line:.007,taper:t=>.55+.45*Math.sin(t*Math.PI)})); }
    const lamp=new THREE.Group(); lamp.position.set(0,.09,.226); lamp.rotation.x=.3; h.add(lamp);
    const plate=new THREE.Mesh(sph(.06,14,8),m('minerDark')); plate.scale.set(1.25,1,.32); plate.position.z=-.012; hHull(plate,.007); lamp.add(plate);
    const body=hLathe([[0,-.03],[.06,-.03],[.068,-.02],[.07,.03],[.066,.04],[0,.04]],20,m('pole')); body.rotation.x=Math.PI/2; body.position.z=.012; hHull(body,.008); lamp.add(body);
    const bez=hTorus(.06,.011,m('crown'),.006,hTAU,6,24); bez.position.z=.054; lamp.add(bez);
    const glass=new THREE.Mesh(new THREE.CircleGeometry(.054,20),MC.hatLamp||(MC.hatLamp=new THREE.MeshBasicMaterial({color:C.lamp}))); glass.position.z=.054; lamp.add(glass);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(.09,20),MC.hatGlow||(MC.hatGlow=new THREE.MeshBasicMaterial({color:C.lamp,transparent:true,opacity:.35,depthWrite:false})));
    glow.position.z=.058; lamp.add(glow); }
  else if(id==='gnome'){ // a tall felt gnome hat, crumpled where its tip flops forward, a patch sewn on, a fluffy band and a pompom
    const H=.56, fl=t=>[0,-.07*t*t*t,.2*t*t*t], cg=new THREE.ConeGeometry(.2,H,30,14), cp=cg.attributes.position;
    for(let k=0;k<cp.count;k++){ const t=cp.getY(k)/H+.5, b=fl(t), f=1-.08*Math.exp(-Math.pow((t-.56)/.04,2))-.06*Math.exp(-Math.pow((t-.7)/.035,2));
      cp.setXYZ(k,cp.getX(k)*f+b[0],cp.getY(k)+b[1],cp.getZ(k)*f+b[2]); }
    cg.computeVertexNormals(); const cone=new THREE.Mesh(cg,m('gnome')); cone.position.y=H/2+.02; hHull(cone,.012); h.add(cone);
    const band=new THREE.Mesh(hWarp(new THREE.TorusGeometry(.205,.055,10,44),v=>{ const a=Math.atan2(v.y,v.x), c=hV3(Math.cos(a)*.205,Math.sin(a)*.205,0), d=v.clone().sub(c);
      const be=Math.atan2(d.z,d.x*Math.cos(a)+d.y*Math.sin(a)), k=1+.14*Math.sin(a*11+be*2); v.copy(c.add(d.multiplyScalar(k))); }),m('chef')); band.rotation.x=Math.PI/2; band.position.y=.03; hHull(band,.01); h.add(band);
    const tp=fl(1), pom=new THREE.Mesh(hPomGeo(.052,14,10),m('chef'));
    pom.position.set(tp[0],H+.02+tp[1],tp[2]); hHull(pom,.008); h.add(pom);
    const pa=.75, t0=.24, pr=.2*(1-t0)+.004, pp=hV3(Math.sin(pa)*pr,.02+t0*H,Math.cos(pa)*pr), pn=hV3(Math.sin(pa),.36,Math.cos(pa)).normalize();
    const patch=hStick(new THREE.Mesh(new THREE.BoxGeometry(.1,.092,.014),m('partyB')),pp,pn); patch.rotateZ(.18); hHull(patch,.007); h.add(patch);
    for(const [x,y,rz] of [[-.02,.032,0],[.022,.032,0],[-.02,-.032,0],[.022,-.032,0],[.036,.0,1],[-.036,0,1]]){ const st=new THREE.Mesh(new THREE.BoxGeometry(.026,.007,.006),lineMat);
      st.position.set(x,y,.008); st.rotation.z=rz*Math.PI/2; patch.add(st); } }
  else if(id==='explorer'){ // a pith helmet for the long trek: a six-panel dome with a vent on top, a long brim, a leather band with a buckle, a fern tucked in
    const brim=hLathe([[.2,.014],[.2,-.012],[.31,-.03],[.345,-.044],[.354,-.036],[.342,-.022],[.3,-.008],[.2,.014]],48,m('explorer'));
    hWarp(brim.geometry,v=>{ const r=Math.hypot(v.x,v.z); if(r<.205) return; const a=Math.atan2(v.z,v.x), fz=Math.abs(v.z/r), q=(r-.2)/.155, r2=.2+(r-.2)*(1+.3*fz*fz);
      v.x=Math.cos(a)*r2; v.z=Math.sin(a)*r2; v.y-=.03*Math.max(0,-v.z/r)*q; });
    hHull(brim,.011); h.add(brim);
    const dp=[[.215,-.005],[.22,.05],[.21,.11],[.18,.17],[.13,.215],[.06,.24],[0,.245]], dome=hLathe(dp,40,m('explorer')); hHull(dome,.012); h.add(dome);
    for(let i=0;i<6;i++){ const a=i/6*hTAU+.26; h.add(hTube(dp.slice(2,6).map(([r,y])=>hV3(Math.cos(a)*(r+.004),y+.003,Math.sin(a)*(r+.004))),.0045,lineMat,{seg:8,rs:4})); }
    const vent=new THREE.Mesh(sph(.034,12,8),m('explorer')); vent.position.y=.245; vent.scale.y=.6; hHull(vent,.007); h.add(vent);
    h.add(hRing(.034,.008,m('explorerBand'),0,.245,6,20));
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.222,.222,.055,40,1,true),m('explorerBand')); band.position.y=.045; hHull(band,.006); h.add(band);
    const bk=hTorus(.026,.006,m('crown'),.004,hTAU,4,4); hStick(bk,hV3(.157,.045,.157),hV3(1,0,1).normalize()); bk.rotateZ(Math.PI/4); h.add(bk);
    const fern=new THREE.Group(); fern.position.set(-.2,.05,-.06); fern.rotation.set(-.25,.3,.42); h.add(fern);
    const fs=[hV3(0,0,0),hV3(.01,.08,0),hV3(.0,.16,-.01),hV3(-.03,.23,-.02)]; fern.add(hTube(fs,.008,m('leafVein'),{seg:10,rs:4,line:.005,taper:t=>1-.5*t}));
    const fc=new THREE.CatmullRomCurve3(fs), lg=hLeafGeo(.07,.03,{cup:.008,ws:8,hs:3});
    for(let i=0;i<5;i++){ const t=.25+i*.16, c=fc.getPointAt(t), s=1-i*.13;
      for(const sd of [-1,1]){ const l=new THREE.Mesh(lg,m('leaf')); l.position.copy(c); l.rotation.set(Math.PI/2,0,0); l.rotateZ(sd>0?.35:Math.PI-.35); l.scale.setScalar(s); hHull(l,.005); fern.add(l); } }
    const ft=new THREE.Mesh(lg,m('leaf')); ft.position.copy(fs[3]); ft.rotation.set(Math.PI/2,0,Math.PI/2+.4); ft.scale.setScalar(.7); hHull(ft,.005); fern.add(ft);
    h.rotation.x=.07; h.position.y=.006; }
  else if(id==='sprout'){ // a seedling growing out of the top of the head: a curved stem, two cupped leaves with veins, a new leaf unfurling
    h.add(hTube([hV3(0,-.02,0),hV3(.014,.08,0),hV3(-.01,.17,0),hV3(0,.25,0)],.022,m('leaf'),{seg:12,rs:6,line:.008,taper:t=>1-.25*t}));
    const lg=hLeafGeo(.22,.145,{cup:.045,tip:.8,ws:16,hs:6});
    for(const sd of [-1,1]){ const l=new THREE.Mesh(lg,m(sd<0?'leaf':'lawn')); l.position.set(0,.245,0); l.rotation.set(0,sd<0?Math.PI:0,.45); if(sd>0) l.scale.setScalar(.92); hHull(l,.009); h.add(l);
      const vn=hTube([hV3(.02,.016,0),hV3(.09,.026,0),hV3(.17,.04,0)],.006,m('leafVein'),{seg:5,rs:4}); vn.position.copy(l.position); vn.rotation.copy(l.rotation); vn.scale.copy(l.scale);
      h.add(vn); }
    const bud=new THREE.Mesh(hLeafGeo(.075,.045,{cup:.025}),m('leaf')); bud.position.set(0,.25,0); bud.rotation.set(0,Math.PI/2,1.35); hHull(bud,.007); h.add(bud); }
  else if(id==='teacup'){ // a teacup on its saucer: a rolled gold-lined rim, tea inside, spots, a curl of steam and a sugar cube
    const sau=hLathe([[0,0],[.12,0],[.16,.005],[.2,.02],[.226,.034],[.232,.045],[.222,.048],[.19,.033],[.15,.022],[.12,.02],[0,.02]],36,m('chef')); hHull(sau,.01); h.add(sau);
    const cup=hLathe([[.07,.02],[.088,.02],[.094,.03],[.106,.05],[.128,.085],[.146,.13],[.154,.172],[.153,.184],[.146,.188],[.14,.18],[.135,.15]],36,m('teacup'));
    hHull(cup,.01); h.add(cup);
    h.add(hRing(.153,.0055,m('crown'),0,.168,4,36));
    const tea=new THREE.Mesh(new THREE.CircleGeometry(.14,28),m('tea')); tea.rotation.x=-Math.PI/2; tea.position.y=.166; h.add(tea);
    const hd=hTorus(.048,.015,m('teacup'),.007,Math.PI*1.3,8,16); hd.position.set(.158,.105,0); hd.rotation.z=-Math.PI*.65; h.add(hd);
    for(let i=0;i<7;i++){ const a=i/7*hTAU+.3+(i===0?.2:0), r=.137, d=new THREE.Mesh(sph(.019,8,5),m('teacupDot'));
      hStick(d,hV3(Math.cos(a)*r,.11,Math.sin(a)*r),hV3(Math.cos(a),-.35,Math.sin(a))); d.scale.z=.35; h.add(d); }
    const sm=MC.hatSteam||(MC.hatSteam=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75}));
    for(const [x,z,ph,n] of [[-.02,0,0,.16],[.04,-.03,2,.12]]){ const st=[]; for(let k=0;k<=6;k++){ const t=k/6; st.push(hV3(x+Math.sin(t*5+ph)*.028,.2+t*n,z)); }
      h.add(hTube(st,.012,sm,{seg:16,rs:6,taper:t=>1-.55*t})); }
    const cube=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.05),m('chef')); cube.position.set(-.08,.048,.19); cube.rotation.set(.1,.5,.06); hHull(cube,.007); h.add(cube); }
  else if(id==='nest'){ // a nest woven from thin twig rings in two browns, a few loose ends, two speckled eggs and a feather tucked in
    // the hollow inside, facing up, so the head never shows through the middle
    h.add(hLathe([[.19,.088],[.13,.084],[.06,.08],[0,.079]],20,m('acornCap')));
    const rim=hTorus(.17,.055,m('twig'),.01,hTAU,8,28); rim.rotation.x=Math.PI/2; rim.scale.z=.75; rim.position.y=.055; h.add(rim);
    for(let i=0;i<9;i++){ const tw=new THREE.Mesh(new THREE.TorusGeometry(.175+(i%3)*.012,.011,4,24,Math.PI*(1.1+(i%4)*.25)),i%2?m('acornNut'):m('twig'));
      tw.rotation.set(Math.PI/2+((i*37)%7-3)*.06,((i*53)%9-4)*.05,i*.83); tw.position.y=.035+(i%4)*.022; h.add(tw); }
    for(let i=0;i<6;i++){ const a=i*1.31+.4, pts=[]; for(let k=0;k<=4;k++){ const t=a+k*.16;
      pts.push(new THREE.Vector3(Math.cos(t)*(.2+k*.014),.07+(i%2?.03:-.01)+k*.009,Math.sin(t)*(.2+k*.014))); }
      h.add(hTube(pts,.008,m('acornNut'),{seg:8,rs:4,taper:t=>1-.5*t})); }
    for(const [x,z,r] of [[-.05,.02,.2],[.05,-.02,-.3]]){ const e=new THREE.Mesh(sph(.06,12,10),m('egg')); e.scale.set(.85,1.1,.85); e.position.set(x,.1,z);
      e.rotation.z=r; hHull(e,.008); h.add(e);
      for(let k=0;k<4;k++){ const d=new THREE.Mesh(sph(.009,6,4),m('eggDot')); const a=k*1.7+x*20, el=.6+k*.3;
        d.position.set(x+Math.cos(a)*Math.sin(el)*.05,.1+Math.cos(el)*.064,z+Math.sin(a)*Math.sin(el)*.05); h.add(d); } }
    // a soft feather tucked in at the back, curving over: a slim vane on a pale quill that pokes out below it
    const fe=new THREE.Group(); fe.position.set(-.15,.07,-.1); fe.rotation.set(-.45,.7,.75); h.add(fe);
    const fv=new THREE.Mesh(hLeafGeo(.21,.052,{tip:.6,bend:.05,ws:12,hs:4}),m('petalB')); fv.position.x=.02; hHull(fv,.007); fe.add(fv);
    fe.add(hTube([hV3(-.03,0,0),hV3(.08,.004,.008),hV3(.2,.012,.012)],.005,m('chef'),{seg:6,rs:4}));
    for(const [x,sd] of [[.1,1],[.14,-1]]){ const nt=new THREE.Mesh(new THREE.BoxGeometry(.008,.012,.03),lineMat); nt.position.set(x,.008,sd*.024); nt.rotation.y=sd*.6; fe.add(nt); } }
  else if(id==='cloud'){ // a little rain cloud hovering over the head, a sleepy smile and rosy cheeks, a few drops falling from it
    const c=new THREE.Group(); c.position.y=.24; h.add(c);
    [[0,.01,0,.12],[-.11,-.02,.0,.09],[.11,-.02,0,.09],[.055,.065,-.01,.085],[-.06,.06,-.01,.08],[.0,-.01,-.07,.1],[.15,-.04,-.03,.06],[-.155,-.04,-.03,.06]].forEach(p=>{
      const s=new THREE.Mesh(sph(p[3],12,8),m('cloud')); s.position.set(p[0],p[1],p[2]); s.scale.y=.92; hHull(s,.01); c.add(s); });
    const base=new THREE.Mesh(sph(.12,16,7),m('cloud')); base.scale.set(1.45,.42,.85); base.position.set(0,-.045,-.01); hHull(base,.01); c.add(base);
    for(const sd of [-1,1]){ const e=hTorus(.019,.0065,m('pupil'),0,Math.PI,6,10); e.position.set(sd*.04,.012,.118); c.add(e);
      const ck=new THREE.Mesh(sph(.019,10,6),m('cheek')); hStick(ck,hV3(sd*.072,-.008,.106),hV3(sd*.4,0,1)); ck.scale.set(1.2,.75,.3); c.add(ck); }
    const sm=hTorus(.013,.005,m('pupil'),0,Math.PI,6,10); sm.position.set(0,-.012,.12); sm.rotation.z=Math.PI; c.add(sm);
    const dg=hDropGeo(.022);
    for(const [x,y,z] of [[-.08,-.15,.03],[.02,-.19,.04],[.09,-.13,.02]]){ const d=new THREE.Mesh(dg,m('water')); d.position.set(x,y,z); hHull(d,.006); c.add(d); } }
  return hBake(h); }
let hatId=store.get('squirm-hat')||'none';
const chapterCleared=k=>{ const ch=CHAPTERS[k]; if(!ch) return false; for(let i=ch.from;i<=ch.to;i++) if(!isCleared(i)) return false; return true; };
const hatUnlocked=h=>h[4]?h[4]():h[2]<0||chapterCleared(h[2]);
function dressHat(g){ const slot=g&&g.userData.hatSlot; if(!slot) return; slot.clear();
  const h=HATS.find(x=>x[0]===hatId); if(!h||h[0]==='none'||!hatUnlocked(h)) return;
  const k=hatId+'|'+tintOf(hatId); if(!hatProto[k]) hatProto[k]=tinted(hatId,buildHat(hatId)); slot.add(hatProto[k].clone()); }
