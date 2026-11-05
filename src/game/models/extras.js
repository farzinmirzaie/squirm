// ---------- extras: models for the face, neck and head ----------
const extraProto={};
const SHAPE_HEART=()=>{ const s=new THREE.Shape(); s.moveTo(0,-1); s.bezierCurveTo(-.6,-.45,-1.25,-.1,-1.05,.45); s.bezierCurveTo(-.88,.95,-.25,1.05,0,.55);
  s.bezierCurveTo(.25,1.05,.88,.95,1.05,.45); s.bezierCurveTo(1.25,-.1,.6,-.45,0,-1); return s; };
const SHAPE_STAR=()=>{ const s=new THREE.Shape(); for(let i=0;i<10;i++){ const a=Math.PI/2+i*Math.PI/5, r=i%2?.45:1;
  s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r); } return s; };
// a sunglasses lens like the sticker: nearly flat across the top, round below; +x is the outer side
const SHAPE_WAYFARER=()=>{ const s=new THREE.Shape(); s.moveTo(-1,.46); s.bezierCurveTo(-.4,.54,.4,.6,1.04,.56);
  s.bezierCurveTo(1.12,-.12,.72,-.8,0,-.8); s.bezierCurveTo(-.72,-.8,-1.06,-.22,-1,.46); return s; };
// butterfly wings, root at the origin, reaching out along +x
const SHAPE_FOREWING=()=>{ const s=new THREE.Shape(); s.moveTo(0,.02); s.bezierCurveTo(.1,.5,.62,.98,.98,.84);
  s.bezierCurveTo(1.22,.72,1.1,.2,.8,.04); s.bezierCurveTo(.52,-.08,.2,-.07,0,-.04); s.lineTo(0,.02); return s; };
const SHAPE_HINDWING=()=>{ const s=new THREE.Shape(); s.moveTo(0,-.02); s.bezierCurveTo(.4,-.02,.86,-.2,.8,-.54);
  s.bezierCurveTo(.76,-.88,.36,-.9,.18,-.64); s.bezierCurveTo(.08,-.48,0,-.26,0,-.02); return s; };
function buildExtra(id){ // frames sit in front of the eyes even when they widen (wow) or the head turns: eye front + outline is ~.39
  const g=new THREE.Group(), EY=.14, EZ=.41, V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const glint=MC.exGlint||(MC.exGlint=new THREE.MeshBasicMaterial({color:C.glint}));
  const glass=()=>MC.exGlass||(MC.exGlass=new THREE.MeshBasicMaterial({color:C.glass,transparent:true,opacity:.22,depthWrite:false}));
  // a sphere from the shared cache with radius r, squashed by sc, with an outline t thick (0 for none)
  const dot=(r,mat,t=0,sc=[1,1,1],ws=12,hs=8)=>{ const d=new THREE.Mesh(sph(.1,ws,hs),mat); d.scale.set(r*sc[0]/.1,r*sc[1]/.1,r*sc[2]/.1);
    if(t){ const o=new THREE.Mesh(d.geometry,lineMat); o.scale.set(1+t/(r*sc[0]),1+t/(r*sc[1]),1+t/(r*sc[2])); d.add(o); } return d; };
  // an outline for a closed mesh of any shape: its geometry in lineMat, grown by t on every side round its box's centre
  const hull=(mesh,t)=>{ const geo=mesh.geometry; geo.computeBoundingBox(); const b=geo.boundingBox, c=b.getCenter(V()), s=b.getSize(V());
    const o=new THREE.Mesh(geo,lineMat); o.scale.set(1+2*t/Math.max(s.x,.01),1+2*t/Math.max(s.y,.01),1+2*t/Math.max(s.z,.01));
    o.position.copy(c).multiply(V(1,1,1).sub(o.scale)); mesh.add(o); return mesh; };
  // a round rod from a to b with rounded ends
  const rod=(a,b,r,mat,t=0,seg=8)=>{ const grp=new THREE.Group(), d=V().subVectors(b,a), q=new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.clone().normalize());
    for(const [rr,mm] of t?[[r,mat],[r+t,lineMat]]:[[r,mat]]){ const c=new THREE.Mesh(new THREE.CylinderGeometry(rr,rr,d.length(),seg,1,true),mm);
      c.position.copy(a).addScaledVector(d,.5); c.quaternion.copy(q); grp.add(c); }
    for(const p of [a,b]){ const e=dot(r,mat,t,[1,1,1],seg,6); e.position.copy(p); grp.add(e); } return grp; };
  // a tube through points (or along a curve), with an outline and rounded ends
  const tube=(pts,r,mat,t=0,segs=24,rs=8,caps=true)=>{ const grp=new THREE.Group(), cv=pts.isCurve?pts:new THREE.CatmullRomCurve3(pts);
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(cv,segs,r,rs,false),mat)); if(t) grp.add(new THREE.Mesh(new THREE.TubeGeometry(cv,segs,r+t,rs,false),lineMat));
    if(caps) for(const u of [0,1]){ const e=dot(r,mat,t,[1,1,1],rs,6); e.position.copy(cv.getPointAt(u)); grp.add(e); } return grp; };
  // a torus (or an arc of one) with its outline
  const ring=(rad,tb,mat,t=0,rs=8,ts=28,arc=Math.PI*2)=>{ const r=new THREE.Mesh(new THREE.TorusGeometry(rad,tb,rs,ts,arc),mat);
    if(t) r.add(new THREE.Mesh(new THREE.TorusGeometry(rad,tb+t,Math.max(6,rs-2),ts,arc),lineMat)); return r; };
  // a tube whose radius follows f(t), optionally fluted (fl) into strands: TubeGeometry samples the curve evenly, so ring k sits at t=k/segs
  const taper=(curve,f,add,fl=0,n=4,segs=32,rs=10)=>{ const tg=new THREE.TubeGeometry(curve,segs,1,rs,false), pa=tg.attributes.position, v=V();
    for(let i=0;i<pa.count;i++){ const t=Math.floor(i/(rs+1))/segs, j=i%(rs+1), c=curve.getPointAt(t), k=fl?1+fl*Math.cos(j/rs*Math.PI*2*n):1;
      v.fromBufferAttribute(pa,i).sub(c).multiplyScalar((f(t)+add)*k).add(c); pa.setXYZ(i,v.x,v.y,v.z); }
    tg.computeVertexNormals(); return tg; };
  // a flat strip (cloth, a scarf's tail) w wide and th thick along a curve, from t0 to t1; side points across it
  const strip=(cv,w,th,segs,side,t0=0,t1=1)=>{ const geo=new THREE.BoxGeometry(1,1,1,2,segs,1), p=geo.attributes.position, T=V(), S=V(), N=V();
    for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), u=t0+(y+.5)*(t1-t0), c=cv.getPointAt(u); cv.getTangentAt(u,T);
      S.copy(side).addScaledVector(T,-side.dot(T)).normalize(); N.crossVectors(S,T);
      p.setXYZ(i,c.x+S.x*x*w+N.x*z*th,c.y+S.y*x*w+N.y*z*th,c.z+S.z*x*w+N.z*z*th); }
    geo.computeVertexNormals(); return geo; };
  // a lens glint: a short white arc inside the rim, upper left, and a dot after it
  const glintArc=rad=>{ const grp=new THREE.Group(), a=new THREE.Mesh(new THREE.TorusGeometry(rad,.011,4,14,1.05),glint); a.rotation.z=1.75; a.scale.z=.2; grp.add(a);
    const d=dot(.012,glint,0,[1,1,.2],8,6); d.position.set(Math.cos(3.12)*rad,Math.sin(3.12)*rad,0); grp.add(d); return grp; };
  // a chunky frame cut from a shape, softly bevelled and outlined, with a lens in it and a glint (o.glint: x, y, size in shape units)
  const lensFrame=(mk,sc,fr,lens,o={})=>{ const grp=new THREE.Group(), inner=o.inner||.72, iy=o.iy||0, d=.1, sh=mk();
    const hole=mk().getPoints(10).map(p=>p.multiplyScalar(inner).add(new THREE.Vector2(0,iy))); sh.holes.push(new THREE.Path(hole.slice().reverse()));
    const geo=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelThickness:.06,bevelSize:.05,bevelSegments:2,curveSegments:8});
    geo.translate(0,0,-d/2); geo.scale(sc,sc,sc); const f=new THREE.Mesh(geo,fr); hull(f,.008); grp.add(f);
    const lp=mk().getPoints(10).map(p=>p.multiplyScalar(inner+.03).add(new THREE.Vector2(0,iy)));
    const l=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(lp)),lens); l.scale.setScalar(sc); grp.add(l);
    if(o.glint){ const [gx,gy,gr]=o.glint, fl=o.flip||1, a=dot(gr*sc,glint,0,[1.7,.5,.2],10,6); a.position.set(gx*sc*fl,gy*sc,.004); a.rotation.z=.65*fl; grp.add(a);
      const b=dot(gr*sc*.42,glint,0,[1,1,.2],8,6); b.position.set((gx+.3)*sc*fl,(gy-.24)*sc,.004); grp.add(b); }
    return grp; };
  // the arms: a hinge at the frame's outer edge (x = ox), then back just off the side of the head and bent into it there, like
  // over an ear (a straight arm to the back would graze the round head and show through in dashes)
  const arms=(mat,ox,z,y=EY)=>{ for(const s of [-1,1]){ const h=V(s*(ox+.006),y,z-.012), k=V(s*.325,y+.01,.09), e=V(s*.24,y+.02,-.13);
    g.add(tube([h,h.clone().lerp(k,.5).add(V(0,0,0)),k,k.clone().lerp(e,.35).add(V(-s*.012,0,0)),e],.015,mat,.008,20,8));
    const hg=new THREE.Mesh(new THREE.BoxGeometry(.026,.046,.044),mat); hg.position.copy(h); outlineBox(hg,.007,.026,.046,.044); g.add(hg); } };
  if(id==='glasses'){ const fm=m('frame'), rad=.12;
    for(const s of [-1,1]){ const c=V(s*.135,EY,EZ), r=ring(rad,.018,fm,.008,8,32); r.position.copy(c); g.add(r);
      const l=new THREE.Mesh(new THREE.CircleGeometry(rad,32),glass()); l.position.set(c.x,c.y,c.z-.004); g.add(l);
      const gl=glintArc(rad*.7); gl.position.set(c.x,c.y,c.z+.002); g.add(gl); }
    const br=ring(.026,.015,fm,.008,8,14,Math.PI); br.position.set(0,EY+.03,EZ+.004); g.add(br); arms(fm,.135+rad,EZ); }
  else if(id==='shades'){ const fm=m('frame'), sc=.14, cy=EY+.022;
    for(const s of [-1,1]){ const l=lensFrame(SHAPE_WAYFARER,sc,fm,m('lensDark'),{inner:.76,iy:-.06,flip:s,glint:[-.42,.12,.17]}); l.position.set(s*.152,cy,EZ);
      l.scale.x=s; g.add(l); }
    g.add(rod(V(-.03,cy+.066,EZ+.006),V(.03,cy+.066,EZ+.006),.017,fm,.008)); arms(fm,.152+sc*1.04,EZ,cy+.05); }
  else if(id==='hearts'||id==='stars'){ const hr=id==='hearts', mk=hr?SHAPE_HEART:SHAPE_STAR, fr=m(hr?'heartFrame':'starFrame'), lens=m(hr?'petalB':'lensDark');
    const sc=hr?.125:.15;
    for(const s of [-1,1]){ const l=lensFrame(mk,sc,fr,lens,{glint:hr?[-.48,.32,.2]:[-.22,.24,.17]}); l.position.set(s*.135,EY,EZ-.01); l.rotation.z=s*-.08; g.add(l); }
    g.add(rod(V(-.035,EY+.025,EZ+.002),V(.035,EY+.025,EZ+.002),.013,fr,.007)); arms(fr,hr?.262:.27,EZ,EY+(hr?.045:.033)); }
  else if(id==='monocle'){ const gm=m('monocle'), rad=.125, c=V(-.135,EY,EZ+.005), r=ring(rad,.02,gm,.009,8,32); r.position.copy(c); g.add(r);
    const l=new THREE.Mesh(new THREE.CircleGeometry(rad,32),glass()); l.position.set(c.x,c.y,c.z-.004); g.add(l);
    const gl=glintArc(rad*.7); gl.position.set(c.x,c.y,c.z+.002); g.add(gl);
    // an eyelet on the rim, and a chain of little links from it sagging over the cheek to a clip on the side of the head (never off in the air)
    const ea=-2.45, ep=V(c.x+Math.cos(ea)*(rad+.024),c.y+Math.sin(ea)*(rad+.024),c.z-.002), ey=ring(.017,.0065,gm,.005,6,14); ey.position.copy(ep); g.add(ey);
    const cb=V(-.27,-.13,.17), chain=new THREE.QuadraticBezierCurve3(ep.clone().add(V(-.008,-.014,0)),V(-.29,-.19,.37),cb), N=11;
    const lk=new THREE.TorusGeometry(.012,.0055,5,10);
    for(let i=0;i<N;i++){ const u=(i+.5)/N, k=new THREE.Mesh(lk,gm); k.position.copy(chain.getPointAt(u));
      k.quaternion.setFromUnitVectors(V(1,0,0),chain.getTangentAt(u)); if(i%2) k.rotateX(Math.PI/2); k.scale.x=1.5; g.add(k); }
    const clip=dot(.027,gm,.008,[.55,1,1]); clip.position.copy(cb); g.add(clip); }
  else if(id==='freckles'){ const R=HEAD_R+.002; // five soft dots on each cheek, clear of the eyes, a few on the blush
    for(const s of [-1,1]) for(const [x,y,r] of [[.17,.015,.012],[.21,.042,.011],[.205,.0,.013],[.245,.024,.011],[.182,-.02,.01]]){
      const xx=s*x, z=Math.sqrt(R*R-xx*xx-y*y), d=dot(r,m('freckle'),0,[1,1,.35],10,6); d.position.set(xx,y,z); d.lookAt(xx*3,y*3,z*3); g.add(d); } }
  else if(id==='nose'){ const c=V(0,.035,HEAD_R+.008), r3=[.067,.057,.054], n=dot(.06,m('bowDark'),.01,[1.12,.95,.9],18,14); n.position.copy(c); g.add(n);
    // shine: a soft streak up on the left and a small dot low on the right, lying on the nose's surface
    for(const [x,y,r,sc,rz] of [[-.024,.022,.017,[1.5,.8,.35],.55],[.022,-.02,.007,[1,1,.4],0]]){ const z=r3[2]*Math.sqrt(Math.max(0,1-(x/r3[0])**2-(y/r3[1])**2));
      const h=dot(r,glint,0,sc,10,6), nr=V(x/r3[0]**2,y/r3[1]**2,z/r3[2]**2).normalize(); h.position.set(c.x+x,c.y+y,c.z+z-.002);
      h.quaternion.setFromUnitVectors(V(0,0,1),nr); h.rotateZ(rz); g.add(h); } }
  else if(id==='flower'){ // clipped on the left, off the top where most hats sit and away from the ribbon bow on the right
    const f=new THREE.Group(), fp=V(-.29,.17,.12).setLength(HEAD_R+.012); f.position.copy(fp); f.lookAt(fp.x*3,fp.y*3,fp.z*3+.3);
      f.scale.setScalar(1.25); g.add(f);
    // two leaves peeking out below, five cupped petals, and a domed centre dotted with seeds
    for(const a of [3.55,5.85]){ const lg=new THREE.Group(); lg.rotation.z=a-Math.PI/2; f.add(lg);
      const lf=dot(.1,m('leaf'),.007,[.25,.55,.09],12,8); lf.position.set(0,.088,-.014); lf.rotation.x=.25; lg.add(lf); }
    for(let k=0;k<5;k++){ const pg=new THREE.Group(); pg.rotation.z=k/5*Math.PI*2; f.add(pg);
      const pt=dot(.1,m('chef'),.008,[.38,.5,.2],14,10); pt.position.set(0,.052,0); pt.rotation.x=.3; pg.add(pt); }
    const c=dot(.034,m('crown'),.008,[1,1,.62],16,12); c.position.z=.022; f.add(c);
    for(let k=0;k<7;k++){ const a=k/7*Math.PI*2+.3, sd=dot(.0055,m('seed'),0,[1,1,.5],6,4); sd.position.set(Math.cos(a)*.019,Math.sin(a)*.019,.039); f.add(sd); }
    const sd=dot(.006,m('seed'),0,[1,1,.5],6,4); sd.position.z=.0435; f.add(sd); }
  else if(id==='bowtie'){ // a band round the neck, and a bow at the front just under the chin, far enough forward to peek out from above
    const rg=new THREE.Group(); rg.position.set(0,-.1,-.07); rg.rotation.x=-.93; rg.scale.x=.92; g.add(rg); rg.add(ring(.33,.013,m('bowDark'),.007,6,48));
    const b=new THREE.Group(); b.position.set(0,-.29,.228); b.rotation.x=.5; g.add(b);
    // each wing: a sphere pinched to the knot, blunt at the end, with soft pleats fanning out from the knot
    const geo=new THREE.SphereGeometry(1,22,16), p=geo.attributes.position;
    for(let i=0;i<p.count;i++){ const x0=p.getX(i), y=p.getY(i), z=p.getZ(i), u=(x0+1)/2, x=x0>0?Math.pow(x0,.6):x0;
      const h=.34+.66*Math.pow(u,.75), fold=1+.22*Math.cos(y*Math.PI*2)*u; p.setXYZ(i,x*.072,y*h*.085,z*.042*fold); }
    geo.computeVertexNormals();
    for(const s of [-1,1]){ const w=new THREE.Mesh(geo,m('bowDark')); w.position.x=s*.066; w.scale.x=s; w.rotation.z=s*.06; hull(w,.008); b.add(w); }
    const k=dot(.033,m('heartFrame'),.008,[1,1.18,.85],14,10); k.position.z=.012; b.add(k); }
  else if(id==='scarf'){ // a soft knitted roll slanting round the bottom of the head: under the chin in front, up over the neck behind
    // (so it shows from the tilted game camera too), with cream stripes knitted in, a knot at the side and two fringed tails
    const R=.33, tube_=.066, rg=new THREE.Group(); rg.position.set(0,-.1,-.07); rg.rotation.x=-.93; rg.scale.x=.92; g.add(rg);
    // one stretch of the roll, with knitted ribs (a little fatter every few degrees) running round it
    const knit=(a0,arc,mat)=>{ const geo=new THREE.TorusGeometry(R,tube_,10,Math.max(2,Math.round(arc/(Math.PI*2)*80)),arc), p=geo.attributes.position, v=V();
      geo.rotateZ(a0);
      for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); const u=Math.atan2(v.y,v.x), cx=R*Math.cos(u), cy=R*Math.sin(u), k=1+.07*Math.cos(u*40);
        p.setXYZ(i,cx+(v.x-cx)*k,cy+(v.y-cy)*k,v.z*k); }
      geo.computeVertexNormals(); return new THREE.Mesh(geo,mat); };
    const sw=.17; for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; rg.add(knit(a,Math.PI/4-sw,m('mushRed')),knit(a+Math.PI/4-sw,sw,m('partyB'))); }
    rg.add(new THREE.Mesh(new THREE.TorusGeometry(R,tube_+.012,10,48),lineMat));
    const kp=V(.215,-.245,.18), knot=dot(.066,m('mushRed'),.01,[1,.85,.8],16,12); knot.position.copy(kp); g.add(knot);
    const kb=ring(.05,.013,m('partyB'),0,6,24); kb.position.copy(kp); kb.lookAt(kp.clone().add(V(.3,1,-.1))); kb.scale.set(1.05,.95,1); g.add(kb);
    // the tails: flat knitted strips hanging from the knot, two stripes and a fringe at the end
    const side=V(.64,0,-.77).normalize(), w=.07, th=.022;
    for(const pts of [[V(.01,-.01,.02),V(.04,-.07,.05),V(.065,-.14,.06)],[V(-.02,-.01,.04),V(-.03,-.06,.075),V(-.028,-.12,.09)]]){
      const cv=new THREE.CatmullRomCurve3(pts.map(p=>p.add(kp))), end=cv.getPointAt(1), dir=cv.getTangentAt(1);
      const hv=new THREE.CatmullRomCurve3([...cv.points.slice(0,-1),end.clone().addScaledVector(dir,.008)]);
      g.add(new THREE.Mesh(strip(cv,w,th,14,side),m('mushRed')),new THREE.Mesh(strip(hv,w+.018,th+.018,14,side),lineMat));
      for(const [a,b] of [[.5,.62],[.74,.86]]) g.add(new THREE.Mesh(strip(cv,w+.004,th+.004,3,side,a,b),m('partyB')));
      const S=side.clone().addScaledVector(dir,-side.dot(dir)).normalize();
      for(let q=0;q<5;q++){ const o=end.clone().addScaledVector(S,(q/4-.5)*w*.86); g.add(rod(o,o.clone().addScaledVector(dir,.03),.0065,m('partyB'),.004,6)); } } }
  else if(id==='eyepatch'){ // over the right eye, its strap running up over the forehead and round the back of the head
    const p=V(.13,.14,.362), pg=new THREE.Group(); pg.position.copy(p); pg.lookAt(p.clone().multiplyScalar(3)); g.add(pg);
    pg.add(dot(.13,m('patch'),.01,[1,.95,.46],22,16));
    // a ring of stitches round the edge, lying on the patch's dome
    for(let k=0;k<16;k++){ const a=k/16*Math.PI*2, x=Math.cos(a)*.1, y=Math.sin(a)*.095, z=.0598*Math.sqrt(Math.max(0,1-(x/.13)**2-(y/.1235)**2));
      const st=dot(.1,m('stitch'),0,[.04,.11,.03],6,4); st.position.set(x,y,z+.001); st.rotation.z=a; pg.add(st); }
    const on=d=>V(...d).normalize().multiplyScalar(HEAD_R+.014);
    // one strap: from under the patch up over the forehead, round the back of the head and forward again to the patch's side
    g.add(tube([on([.33,.37,.87]),on([.05,.62,.75]),on([-.35,.72,.5]),on([-.75,.55,0]),on([-.62,.35,-.7]),on([0,.2,-1]),on([.62,.1,-.75]),on([.86,.13,.45]),
      on([.62,.15,.77]),on([.4,.2,.88])],.017,m('patch'),.007,90,6)); }
  else if(id==='ladybug'){ // a ladybug resting on the right of the head, away from the flower clip and the butterfly
    const b=new THREE.Group(), bp=V(.26,.24,.12).setLength(HEAD_R+.012); b.position.copy(bp); b.lookAt(bp.x*3,bp.y*3,bp.z*3); b.rotateZ(-.6);
      b.scale.setScalar(1.3); g.add(b);
    // in b, z is out of the head and +y is where she looks; the shell is a dome A wide, L long and H high
    const A=.068, L=.074, H=.05, geo=new THREE.SphereGeometry(1,22,12,0,Math.PI*2,0,Math.PI/2); geo.scale(A,H,L);
    const shell=new THREE.Mesh(geo,m('ladybug')); shell.rotation.x=Math.PI/2; hull(shell,.008); b.add(shell);
    const on=(x,y)=>{ const z=H*Math.sqrt(Math.max(0,1-(x/A)**2-(y/L)**2)); return [V(x,y,z),V(x/A/A,y/L/L,z/H/H).normalize()]; };
    const seam=[]; for(let k=0;k<=10;k++){ const y=L*.92*Math.cos(.12+k/10*(Math.PI-.24)); seam.push(on(0,y)[0].add(V(0,0,.001))); }
    b.add(tube(seam,.0045,m('patch'),0,20,5,false));
    for(const [x,y,r] of [[.03,.024,.012],[.044,-.014,.011],[.02,-.046,.01],[-.03,.024,.012],[-.044,-.014,.011],[-.02,-.046,.01]]){ const [ps,nr]=on(x,y);
      const d=dot(r,m('patch'),0,[1,1,.3],10,6); d.position.copy(ps); d.quaternion.setFromUnitVectors(V(0,0,1),nr); b.add(d); }
    const head=dot(.034,m('patch'),.007,[1,.8,.75],14,10); head.position.set(0,.074,.008); b.add(head);
    for(const s of [-1,1]){ const e=dot(.0115,m('eye'),0,[1,1,.7],10,6); e.position.set(s*.015,.09,.022); b.add(e);
      const pu=dot(.006,m('pupil'),0,[1,1,.6],8,6); pu.position.set(s*.016,.096,.028); b.add(pu);
      b.add(tube([V(s*.01,.094,.026),V(s*.018,.116,.042),V(s*.032,.13,.04)],.0035,m('patch'),0,10,4,false));
      const tp=dot(.0065,m('patch')); tp.position.set(s*.032,.13,.04); b.add(tp);
      for(const [y,dy] of [[.03,.016],[0,0],[-.03,-.016]]) b.add(rod(V(s*.055,y,.004),V(s*.082,y+dy,-.008),.0045,m('patch'),0,5)); } }
  else if(id==='sweatband'){ // a stretchy band hugging the top of the head, tipped back round the head's centre so it sits on
    // the forehead above the eyes and lower behind; its two edges follow the head's curve (hats go on top)
    const tilt=new THREE.Group(); tilt.rotation.x=-.42; g.add(tilt);
    const y=.215, hh=.075, rr=v=>Math.sqrt(HEAD_R*HEAD_R-v*v)+.016, band=new THREE.Group(); band.position.y=y; tilt.add(band);
    // towelling: fine ribs running across the band
    const ribbed=geo=>{ const p=geo.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i), z=p.getZ(i), e=1-Math.abs(p.getY(i))/(hh/2), k=1+.01*e*Math.cos(Math.atan2(x,z)*48);
      p.setX(i,x*k); p.setZ(i,z*k); } geo.computeVertexNormals(); return geo; };
    band.add(new THREE.Mesh(ribbed(new THREE.CylinderGeometry(rr(y+hh/2),rr(y-hh/2),hh,192,4,true)),m('sweat')));
    band.add(new THREE.Mesh(new THREE.CylinderGeometry(rr(y+.013)+.006,rr(y-.013)+.006,.026,72,1,true),m('sweatStripe')));
    // rolled hems along both edges
    for(const e of [-hh/2,hh/2]){ const r=ring(rr(y+e),.0085,m('sweat'),.006,6,56); r.rotation.x=Math.PI/2; r.position.y=e; band.add(r); }
    // a little heart stitched on the front, off to the left
    const a=-.55, hy=.025, hr=rr(y+hy)+.009, ht=new THREE.Mesh(new THREE.ShapeGeometry(SHAPE_HEART(),10),m('sweatStripe'));
    ht.scale.setScalar(.0095); ht.position.set(Math.sin(a)*hr,hy,Math.cos(a)*hr); ht.rotation.set(-.17,a,0,'YXZ'); band.add(ht); }
  else if(id==='daisies'){ // a daisy chain worn like a necklace: a green stem round the neck where the scarf sits, with five
    // big daisies along the front (the middle one biggest, like the sticker) and leaves between them
    const R=.335, rg=new THREE.Group(); rg.position.set(0,-.1,-.07); rg.rotation.x=-.93; rg.scale.x=.92; g.add(rg);
    rg.add(new THREE.Mesh(new THREE.TorusGeometry(R,.011,6,56),m('leaf')),new THREE.Mesh(new THREE.TorusGeometry(R,.017,6,56),lineMat));
    // a flower on the ring at angle a (the front is -pi/2), facing out from the head and a little forward
    const at=(a,lift)=>{ const f=new THREE.Group(), wv=V(); f.position.set(Math.cos(a)*(R+lift),Math.sin(a)*(R+lift),0); rg.add(f);
      f.getWorldPosition(wv); f.lookAt(wv.clone().add(wv.clone().setY(wv.y*.3).normalize().add(V(0,.25,.6)))); return f; };
    for(let j=-2;j<=2;j++){ const a=-Math.PI/2+j*.37, f=at(a,.03), s=j?1.4:1.65; f.scale.setScalar(s);
      for(let q=0;q<9;q++){ const pg=new THREE.Group(); pg.rotation.z=q/9*Math.PI*2+j; f.add(pg);
        const pt=dot(.1,m('daisy'),.0035,[.1,.24,.07],8,5); pt.position.set(0,.026,.004); pt.rotation.x=.16; pg.add(pt); }
      const c=dot(.017,m('crown'),.004,[1,1,.65],10,8); c.position.z=.012; f.add(c);
      // a pair of leaves on the stem between this daisy and the next
      if(j<2) for(const sd of [-1,1]){ const lf=at(a+.185,.014), l=dot(.1,m('leaf'),.0035,[.1,.26,.06],8,5);
        l.position.set(0,.014*sd,.002); l.rotation.z=sd>0?.5:Math.PI-.5; lf.add(l); } } }
  else if(id==='bandana'){ // a spotted neckerchief: a roll round the bottom of the head (like the scarf), knotted at the back,
    // and a draped triangle in front
    const R=.33, rg=new THREE.Group(); rg.position.set(0,-.1,-.07); rg.rotation.x=-.93; rg.scale.x=.92; g.add(rg);
    rg.add(new THREE.Mesh(new THREE.TorusGeometry(R,.038,10,40),m('bandana')),new THREE.Mesh(new THREE.TorusGeometry(R,.05,8,40),lineMat));
    // the cloth: a thin slab shaped into a triangle and bent round the chest, with a soft fold down the middle
    const cg=new THREE.BoxGeometry(1,1,1,10,10,1), cp=cg.attributes.position, bend=(X,v)=>-X*X*1.5-.012*v*Math.cos(X/(.15*(1-v)+.02)*Math.PI*.5);
    const hwOf=v=>.15*Math.pow(1-v,.85)+.012;
    for(let i=0;i<cp.count;i++){ const v=.5-cp.getY(i), X=cp.getX(i)*2*hwOf(v); cp.setXYZ(i,X,-v*.2,cp.getZ(i)*.024+bend(X,v)); }
    cg.computeVertexNormals();
    const t=new THREE.Mesh(cg,m('bandana')); t.position.set(0,-.268,.212); t.rotation.x=-.35; hull(t,.009); g.add(t);
    for(const [x,v] of [[-.07,.16],[.07,.16],[0,.33],[-.04,.55],[.04,.55],[0,.76]]){ const X=x, dd=dot(.016,m('bandanaDot'),0,[1,1,.35],10,6);
      dd.position.set(X,-v*.2,.012+bend(X,v)); dd.rotation.y=-X*3; t.add(dd); }
    // the knot behind, with its two little ends
    const B=V(0,.097,-.335), kn=dot(.04,m('bandana'),.009,[1.15,.9,.8],14,10); kn.position.copy(B).add(V(0,0,-.03)); g.add(kn);
    for(const s of [-1,1]){ const e=dot(.1,m('bandana'),.008,[.3,.6,.13],12,8); e.position.copy(B).add(V(s*.045,-.045,-.035)); e.rotation.set(-.4,0,s*.7); g.add(e); } }
  else if(id==='goggles'){ // chunky round goggles: tapered leather cups with brass bezels and rivets, on a strap that hugs the head at eye height
    const lm=m('goggle'), bm=m('brass'), rad=.108, z=EZ+.012, hh=.058, rr=v=>Math.sqrt(HEAD_R*HEAD_R-v*v)+.012, th0=.31*Math.PI, arc=2*Math.PI-2*th0;
    const lens=MC.exLensBlue||(MC.exLensBlue=toon(C.lensBlue,{transparent:true,opacity:.55,depthWrite:false}));
    const sg=new THREE.Group(); sg.position.y=EY; g.add(sg);
    sg.add(new THREE.Mesh(new THREE.CylinderGeometry(rr(EY+hh/2),rr(EY-hh/2),hh,48,1,true,th0,arc),lm));
    for(const e of [-hh/2,hh/2]){ const r=new THREE.Mesh(new THREE.TorusGeometry(rr(EY+e),.006,5,48,arc),lineMat); r.rotation.set(Math.PI/2,0,th0-1.5*Math.PI);
      r.position.y=e; sg.add(r); }
    // a brass buckle on the strap, back on the left
    const ba=1.3*Math.PI, bp=V(Math.sin(ba)*(rr(EY)+.006),EY,Math.cos(ba)*(rr(EY)+.006)), bs=rrShape(.05,.074,.014);
    bs.holes.push(new THREE.Path(rrShape(.026,.05,.008).getPoints(6).reverse()));
    const bk=new THREE.Mesh(new THREE.ExtrudeGeometry(bs,{depth:.01,bevelEnabled:false,curveSegments:6}),bm); bk.geometry.translate(0,0,-.005); hull(bk,.006);
      bk.position.copy(bp); bk.lookAt(bp.clone().multiplyScalar(2)); g.add(bk);
    for(const s of [-1,1]){ const c=V(s*.14,EY,z);
      const cupG=new THREE.CylinderGeometry(rad+.03,.078,.15,30,1,true); cupG.rotateX(Math.PI/2); cupG.translate(c.x,c.y,c.z-.075);
      const hullG=new THREE.CylinderGeometry(rad+.038,.086,.15,30,1,true); hullG.rotateX(Math.PI/2); hullG.translate(c.x,c.y,c.z-.075);
      g.add(new THREE.Mesh(cupG,lm),new THREE.Mesh(hullG,lineMat));
      const lip=ring(rad+.012,.022,lm,.008,8,28); lip.position.set(c.x,c.y,c.z-.004); g.add(lip);
      const bz=ring(rad,.014,bm,.006,6,28); bz.position.set(c.x,c.y,c.z+.012); g.add(bz);
      const l=new THREE.Mesh(new THREE.CircleGeometry(rad,32),lens); l.position.set(c.x,c.y,c.z+.006); g.add(l);
      const gl=glintArc(rad*.68); gl.position.set(c.x,c.y,c.z+.01); g.add(gl);
      for(const a of [.75,2.4,3.9,5.5]){ const rv=dot(.0105,bm,.004,[1,1,.8],8,6); rv.position.set(c.x+Math.cos(a)*(rad+.024),c.y+Math.sin(a)*(rad+.024),c.z+.016); g.add(rv); }
      // a leather tab from the cup's outer side back to the strap
      const a0=V(s*(.14+rad+.03),EY,z-.03), a1=V(Math.sin(th0)*rr(EY)*s,EY,Math.cos(th0)*rr(EY)), len=a0.distanceTo(a1);
      const tab=new THREE.Mesh(new THREE.BoxGeometry(.016,hh,len+.02),lm); tab.position.copy(a0).add(a1).multiplyScalar(.5); tab.lookAt(a1);
        outlineBox(tab,.006,.016,hh,len+.02); g.add(tab); } }
  else if(id==='butterfly'){ // perched where the flower clip sits, wings tipped up a little as if it just landed
    const b=new THREE.Group(), bp=V(-.28,.24,.1).setLength(HEAD_R+.035); b.position.copy(bp); b.lookAt(bp.x*3,bp.y*3,bp.z*3+.3);
      b.scale.setScalar(1.4); g.add(b);
    // in b, +y runs along the body to the head and z is out of the head
    const bm=m('pupil'), ab=dot(.017,bm,.005,[1,2.5,1]), th=dot(.02,bm,.005,[1,1.15,1]), hd=dot(.016,bm,.005);
    ab.position.set(0,-.036,0); th.position.y=.01; hd.position.set(0,.043,.004); b.add(ab,th,hd);
    const fw=.13, hw=.105, F=fw*.12; // wing sizes; F: the wings' front face
    for(const s of [-1,1]){ b.add(tube([V(s*.006,.054,.01),V(s*.018,.086,.022),V(s*.036,.106,.018)],.0035,bm,.003,10,4,false));
      const tp=dot(.008,bm,.004); tp.position.set(s*.036,.106,.018); b.add(tp);
      const wg=new THREE.Group(); wg.position.set(s*.01,.004,.002); wg.rotation.y=-s*.5; wg.scale.x=s; b.add(wg);
      wg.userData.anim={r:[0,-s*.75,0],f:9,one:true,env:.45}; // flaps now and then, both wings together
      const wing=(mk,sc,mat,zz)=>{ const geo=new THREE.ExtrudeGeometry(mk(),{depth:.08,bevelEnabled:true,bevelThickness:.04,bevelSize:.03,bevelSegments:2,curveSegments:9});
        geo.translate(0,0,-.04); geo.scale(sc,sc,sc); const w=new THREE.Mesh(geo,m(mat)); w.position.z=zz; hull(w,.006); wg.add(w); return w; };
      const flat=(mk,k,sc,mat,ox=0,oy=0)=>{ const sh=new THREE.Shape(mk().getPoints(16).map(p=>p.multiplyScalar(k).add(new THREE.Vector2(ox,oy))));
        const pm=new THREE.Mesh(new THREE.ShapeGeometry(sh),m(mat)); pm.scale.setScalar(sc); return pm; };
      // forewing: pink with a deeper flush at the root, veins running out of it and two cream dots near the tip
      const fwM=wing(SHAPE_FOREWING,fw,'petalB',0), fp=flat(SHAPE_FOREWING,.58,fw,'wingDeep',.0,.0); fp.position.z=F+.0008; fwM.parent.add(fp);
      for(const [a,l] of [[.95,.42],[.62,.5],[.3,.44]]){ const vn=dot(.1,m('wingDeep'),0,[.045,l*fw*5,.02],6,4); vn.position.set(Math.cos(a)*fw*(.5+l*.5),Math.sin(a)*fw*(.5+l*.5),F+.0006);
        vn.rotation.z=a-Math.PI/2; wg.add(vn); }
      for(const [x,y,r] of [[.9,.62,.012],[.98,.38,.009]]){ const sp=dot(r,m('daisy'),0,[1,1,.3],8,6); sp.position.set(x*fw,y*fw,F+.001); wg.add(sp); }
      // hindwing: buttercup yellow with a pink eyespot
      wing(SHAPE_HINDWING,hw,'crown',-.004);
      const es=dot(.019,m('petalB'),0,[1,1,.3],10,6); es.position.set(.46*hw,-.5*hw,hw*.12-.004+.001); wg.add(es);
      const ec=dot(.008,m('daisy'),0,[1,1,.3],8,6); ec.position.set(.46*hw,-.5*hw,hw*.12-.004+.003); wg.add(ec); } }
  else if(id==='tash'){ // a handlebar: two smooth tapered lobes from a round knot, curling up at the tips, hugging the face
    const R=HEAD_R, Y=.018, surf=(x,y)=>Math.sqrt(Math.max(0,R*R-x*x-y*y));
    const lobe=[[0,.02],[.05,.006],[.1,-.006],[.15,-.004],[.183,.013],[.19,.035],[.176,.05],[.16,.046],[.157,.034]];
    const rad=t=>.01+.029*Math.pow(1-t,1.2), hullR=t=>rad(t)*1.22+.005;
    for(const sd of [-1,1]){ const pts=lobe.map(([x,y])=>{ const X=sd*x, Yy=Y+y; return V(X,Yy,surf(X,Yy)+.014); });
      const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
      // smooth tubes (no fluting, so the outline stays clean) with round caps on the curled tips
      g.add(new THREE.Mesh(taper(curve,rad,0,0,0,48,12),m('tash')), new THREE.Mesh(taper(curve,hullR,0,0,0,48,12),lineMat));
      const tip=curve.getPointAt(1), cap=dot(rad(1),m('tash'),0,[1,1,1],10,8), capL=dot(hullR(1),lineMat,0,[1,1,1],10,8);
      cap.position.copy(tip); capL.position.copy(tip); g.add(cap,capL);
      // one lighter strand combed along the top of the lobe, like the sticker
      const hp=[]; for(let k=0;k<=10;k++){ const t=.07+k/10*.5, c=curve.getPointAt(t), n=c.clone().normalize();
        hp.push(c.addScaledVector(n,rad(t)*.62).add(V(0,rad(t)*.42,0))); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp),20,.0048,6,false),m('tashLight'))); }
    const knot=dot(.04,m('tash'),.01,[1.15,.85,.75],16,12); knot.position.set(0,Y+.018,surf(0,Y+.018)+.012); g.add(knot); }
  else if(id==='walrus'){ // a bushy mustache: one soft, scalloped pad, curved round the face
    const half=[[0,.15],[.3,.2],[.6,.13],[.8,-.04],[.79,-.22],[.64,-.3],[.52,-.21],[.38,-.32],[.24,-.22],[.11,-.32],[0,-.22]];
    const pts=[...half,...half.slice(1,-1).reverse().map(([x,y])=>[-x,y])].map(([x,y])=>new THREE.Vector2(x,y)), sh=new THREE.Shape();
    sh.moveTo(pts[0].x,pts[0].y); sh.splineThru([...pts.slice(1),pts[0]]);
    // sized and raised to sit between the eyes and the mouth, clear of every mouth (the wow/yawn 'o' tops out at y -.026)
    const geo=new THREE.ExtrudeGeometry(sh,{depth:.22,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2,curveSegments:24}), w=.18;
    geo.scale(w,w*.78,w); const pos=geo.getAttribute('position'); for(let i=0;i<pos.count;i++){ const x=pos.getX(i);
      pos.setZ(i,pos.getZ(i)-x*x*1.5); } geo.computeVertexNormals();
    const t=new THREE.Mesh(geo,m('tash')); t.position.set(0,.026,.322); t.rotation.x=-.22; outline(t,.008); g.add(t); }
  else if(id==='firefly'){ // a firefly friend hovering by the head: a little brown bug with a glowing tail, a soft halo,
    // clear wings and curled antennae
    const glow=MC.exFireGlow||(MC.exFireGlow=new THREE.MeshBasicMaterial({color:C.fireGlow}));
    const halo=MC.exFireHalo||(MC.exFireHalo=new THREE.MeshBasicMaterial({color:C.fireGlow,transparent:true,opacity:.25,depthWrite:false}));
    const f=new THREE.Group(); f.position.set(.37,.17,.15); f.rotation.set(.15,-.85,.12); f.scale.setScalar(1.7); g.add(f);
    f.userData.anim={p:[.012,.018,.008],r:[.08,.1,.06],f:2.1}; // hovers
    f.add(dot(.022,m('firefly'),.006,[1,.9,1.15],12,8));
    const hd=dot(.017,m('firefly'),.006,[1,1,1],12,8); hd.position.set(0,.004,.03); f.add(hd);
    for(const sd of [-1,1]){ const ey=dot(.006,m('daisy'),0,[1,1,1],8,6); ey.position.set(sd*.009,.01,.042); f.add(ey);
      const ant=new THREE.CatmullRomCurve3([V(sd*.006,.016,.036),V(sd*.016,.04,.05),V(sd*.026,.05,.066)]);
      f.add(new THREE.Mesh(new THREE.TubeGeometry(ant,8,.0026,5,false),lineMat)); const tip=dot(.005,lineMat); tip.position.set(sd*.026,.05,.066); f.add(tip);
      const wp=new THREE.Group(); wp.position.set(sd*.024,.024,-.012); wp.rotation.set(-.2,sd*.5,sd*.35); wp.userData.anim={r:[0,0,sd*.35],f:28}; f.add(wp); // buzzing wings
      const w=dot(.1,glass(),0,[.2,.025,.34],12,6); wp.add(w);
      const wl=dot(.1,lineMat,0,[.215,.02,.355],12,6); wl.position.y=-.003; wp.add(wl); }
    const tail=dot(.026,glow,.006,[1,.95,1.5],14,10); tail.position.set(0,-.004,-.036); f.add(tail);
    const hl=new THREE.Mesh(sph(.075,16,12),halo); hl.position.set(0,-.004,-.036); hl.userData.anim={s:[.22,.22,.22],f:2.6}; f.add(hl); }
  else if(id==='pinwheel'){ // a pinwheel friend tucked behind the head like a pencil behind an ear: a wooden stick rising from
    // a little ribbon bow at the head, and a wheel of four curled pastel sails that spins in the breeze
    const top=V(.5,.13,-.01), low=V(.21,-.17,-.14), dir=V().subVectors(top,low).normalize();
    // where the stick comes out of the head: the point on the line at the head's radius
    const b0=low.dot(dir), into=low.clone().addScaledVector(dir,-b0+Math.sqrt(b0*b0-low.lengthSq()+HEAD_R*HEAD_R));
    g.add(rod(low,top,.011,m('stem'),.006,10));
    const bow=hBow(.058,m('heartFrame'),m('heartFrame'),.006); bow.position.copy(into).addScaledVector(into.clone().normalize(),.012);
    bow.lookAt(bow.position.clone().multiplyScalar(2)); bow.rotateZ(-.7); g.add(bow);
    const wheel=new THREE.Group(); wheel.position.copy(top).add(V(0,0,.028)); wheel.rotation.y=-.35; g.add(wheel);
    const spin=new THREE.Group(); spin.userData.anim={spin:[0,0,-3.2],gust:.55,gf:.45}; wheel.add(spin);
    const cols=['turnCap','heartFrame','starFrame','glass'];
    for(let k=0;k<4;k++){ const sh=new THREE.Shape(); sh.moveTo(.012,-.004); sh.lineTo(.165,-.004); sh.quadraticCurveTo(.175,.1,.115,.15); sh.quadraticCurveTo(.06,.075,.012,-.004);
      const geo=new THREE.ExtrudeGeometry(sh,{depth:.006,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,curveSegments:10});
      // curl the free corner toward the viewer, as a folded paper sail does
      hWarp(geo,v=>{ const k2=Math.max(0,v.y/.15), r=Math.min(1,Math.hypot(v.x,v.y)/.17); v.z+=.06*k2*k2*r; });
      const bl=new THREE.Mesh(geo,m(cols[k])); bl.rotation.z=k*Math.PI/2; hHull(bl,.006); spin.add(bl); }
    const hub=dot(.024,m('brass'),.006,[1,1,.75],12,8); hub.position.z=.016; spin.add(hub);
    const pin=dot(.011,m('daisy'),0,[1,1,.6],8,6); pin.position.z=.032; spin.add(pin); }
  else if(id==='medal'){ // a finisher's medal: a flat ribbon with a pale stripe round the neck where the scarf sits, two ends
    // crossing into a V under the chin, and a gold medal with a raised star hanging from them, tipped up to be seen from above
    const R=.335, rg=new THREE.Group(); rg.position.set(0,-.1,-.07); rg.rotation.x=-.93; rg.scale.x=.92; g.add(rg);
    const flat=(r,tb,mat,z=0,sz=.5)=>{ const t=new THREE.Mesh(new THREE.TorusGeometry(r,tb,6,56),mat); t.scale.z=sz; t.position.z=z; rg.add(t); return t; };
    flat(R,.044,m('ribbon')); flat(R,.055,lineMat,0,.52); flat(R,.015,m('ribbonStripe'),.016,.6);
    rg.updateMatrixWorld(true);
    const md=V(0,-.39,.295), top=md.clone().add(V(0,.09,-.035)), wid=.07, th=.016;
    for(const s of [-1,1]){ const a=rg.localToWorld(V(Math.cos(-Math.PI/2+s*.42)*R,Math.sin(-Math.PI/2+s*.42)*R,0));
      const mid=a.clone().lerp(top,.5).add(V(0,0,.02)), cv=new THREE.CatmullRomCurve3([a,mid,top.clone().add(V(-s*.012,0,0))]), side=V(1,0,-s*.5).normalize();
      g.add(new THREE.Mesh(strip(cv,wid,th,10,side),m('ribbon')),new THREE.Mesh(strip(cv,wid+.016,th+.014,10,side),lineMat));
      g.add(new THREE.Mesh(strip(cv,wid*.3,th+.006,10,side),m('ribbonStripe'))); }
    // the medal, facing forward and up
    const mg=new THREE.Group(); mg.position.copy(md); mg.rotation.x=-.6; g.add(mg);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.088,.088,.026,32),m('crown')); disc.rotation.x=Math.PI/2; mg.add(disc);
    mg.add(ring(.088,.013,m('brass'),.008,6,40));
    const star=new THREE.Mesh(new THREE.ExtrudeGeometry(SHAPE_STAR(),{depth:.25,bevelEnabled:true,bevelThickness:.08,bevelSize:.06,bevelSegments:1}),m('chef'));
    star.scale.set(.056,.056,.056); star.position.z=.011; hull(star,.006); mg.add(star);
    const loop=ring(.022,.007,m('brass'),.005,6,16); loop.position.set(0,.102,0); loop.rotation.y=Math.PI/2; mg.add(loop); }
  else if(id==='key'){ // a key necklace: a round cord round the neck where the scarf sits, its two sides meeting in a V under the
    // chin at a brass ring, and a golden garden key (the board's key, with its pink gem) hanging from it, tipped up to be seen from above
    const R=.335, rg=new THREE.Group(); rg.position.set(0,-.1,-.07); rg.rotation.x=-.93; rg.scale.x=.92; g.add(rg);
    rg.add(new THREE.Mesh(new THREE.TorusGeometry(R,.012,6,56),m('cord')),new THREE.Mesh(new THREE.TorusGeometry(R,.019,6,56),lineMat));
    rg.updateMatrixWorld(true);
    const md=V(0,-.4,.3), top=md.clone().add(V(0,.075,-.03));
    for(const s of [-1,1]){ const a=rg.localToWorld(V(Math.cos(-Math.PI/2+s*.36)*R,Math.sin(-Math.PI/2+s*.36)*R,0));
      g.add(tube([a,a.clone().lerp(top,.5).add(V(0,0,.015)),top.clone().add(V(s*.008,.006,0))],.012,m('cord'),.007,10,6,false)); }
    const jr=ring(.02,.007,m('brass'),.005,6,16); jr.position.copy(top); jr.rotation.set(-.6,Math.PI/2,0); g.add(jr);
    // the key, facing forward and up: a round bow with the gem, a shaft and two teeth
    const kg=new THREE.Group(); kg.position.copy(md); kg.rotation.x=-.6; g.add(kg);
    kg.add(ring(.042,.016,m('key'),.007,8,28));
    const gem=dot(.024,m('keyGem'),.005,[1,1,.6],12,8); kg.add(gem);
    kg.add(rod(V(0,-.058,0),V(0,-.17,0),.014,m('key'),.007));
    for(const [y,w] of [[-.162,.05],[-.128,.038]]){ const t=new THREE.Mesh(new THREE.BoxGeometry(w,.022,.022),m('key')); t.position.set(w/2+.008,y,0); hull(t,.006); kg.add(t); } }
  return g; }
function dressExtra(g){ const slot=g&&g.userData.accSlot; if(!slot) return; slot.clear(); const id=extraOn(); if(id==='none') return;
  const k=id+'|'+tintOf(id); if(!extraProto[k]) extraProto[k]=tinted(id,buildExtra(id)); slot.add(wearAdd(extraProto[k].clone())); }

// ---------- wear motion ----------
// A few hats and extras have a part that moves (the pinwheel spins, the butterfly flaps, the bee's antennae bob). The part
// carries userData.anim, read every frame by wearTick round the pose it was built in:
//   r:[x,y,z] swing (radians) and p:[x,y,z] sway (units), each axis a little out of step; f: speed (rad/s); ph: phase;
//   one: swing to one side only; env: a slow swell (rad/s) so it rests now and then; s:[x,y,z] a scale pulse;
//   spin:[x,y,z] (rad/s) with gust (0-1, how much the speed breathes) and gf (its speed); drip:[fall, speed]: falls and fades, again
// Only parts of a worn clone in a scene move: a handful of transforms a frame. Reduced motion keeps them still.
const wearMoving=new Set();
function wearAdd(root){ root.userData.worn=true; root.traverse(o=>{ if(o.userData.anim) wearMoving.add(o); }); return root; }
function wearTick(t){ if(!wearMoving.size) return;
  for(const o of wearMoving){ let r=o; while(r.parent) r=r.parent;
    if(r.userData.worn){ wearMoving.delete(o); continue; } // taken off: its clone is no longer on a head
    if(!r.isScene) continue;
    const a=o.userData.anim, b=o.userData.b0||(o.userData.b0=[o.position.toArray(),[o.rotation.x,o.rotation.y,o.rotation.z],o.scale.toArray()]);
    o.position.fromArray(b[0]); o.rotation.set(b[1][0],b[1][1],b[1][2]); o.scale.fromArray(b[2]);
    if(reduceMotion) continue;
    const f=a.f||1, ph=a.ph||0, env=a.env?Math.pow(.5+.5*Math.sin(t*a.env+ph*1.3),2):1;
    const w=k=>{ const x=Math.sin(t*f+ph+k*1.7); return (a.one?.5+.5*x:x)*env; };
    if(a.r){ o.rotation.x+=a.r[0]*w(0); o.rotation.y+=a.r[1]*w(1); o.rotation.z+=a.r[2]*w(2); }
    if(a.p){ o.position.x+=a.p[0]*w(0); o.position.y+=a.p[1]*w(1); o.position.z+=a.p[2]*w(2); }
    if(a.s){ const x=Math.sin(t*f+ph); o.scale.x*=1+a.s[0]*x; o.scale.y*=1+a.s[1]*x; o.scale.z*=1+a.s[2]*x; }
    if(a.spin){ const g=a.gust||0, gf=a.gf||1, k=t+(g?-g/gf*Math.cos(t*gf+ph):0);
      o.rotation.x+=a.spin[0]*k; o.rotation.y+=a.spin[1]*k; o.rotation.z+=a.spin[2]*k; }
    if(a.drip){ const u=((t*a.drip[1]+ph)%1+1)%1; o.position.y-=u*a.drip[0]; o.scale.multiplyScalar(u<.15?u/.15:u>.75?(1-u)/.25:1); } } }
