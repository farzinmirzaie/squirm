// ---------- extras: models for the face, neck and head ----------
const extraProto={};
const SHAPE_HEART=()=>{ const s=new THREE.Shape(); s.moveTo(0,-1); s.bezierCurveTo(-.6,-.45,-1.25,-.1,-1.05,.45); s.bezierCurveTo(-.88,.95,-.25,1.05,0,.55);
  s.bezierCurveTo(.25,1.05,.88,.95,1.05,.45); s.bezierCurveTo(1.25,-.1,.6,-.45,0,-1); return s; };
const SHAPE_STAR=()=>{ const s=new THREE.Shape(); for(let i=0;i<10;i++){ const a=Math.PI/2+i*Math.PI/5, r=i%2?.45:1;
  s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r); } return s; };
// a flat frame with a lens in it, from a shape: the frame is the shape with a smaller copy cut out
function shapedLens(mk,fr,lens,scale){ const g=new THREE.Group(), o=mk();
  const inner=new THREE.Path(mk().getPoints(30).map(p=>p.multiplyScalar(.72)).reverse()); o.holes.push(inner);
  const f=new THREE.Mesh(new THREE.ExtrudeGeometry(o,{depth:.12,bevelEnabled:false,curveSegments:16}),fr); f.scale.setScalar(scale); g.add(f);
  const l=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(mk().getPoints(30).map(p=>p.multiplyScalar(.74))),24),lens); l.scale.setScalar(scale);
    l.position.z=.004; g.add(l); return g; }
function buildExtra(id){ // frames sit in front of the eyes even when they widen (wow) or the head turns: eye front + outline is ~.39
  const g=new THREE.Group(), EY=.14, EZ=.41;
  // a thin rod from point a to point b
  const bar=(a,b,r,mat)=>{ const d=new THREE.Vector3().subVectors(b,a), c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat);
    c.position.copy(a).addScaledVector(d,.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()); return c; };
  // the arms start at the frame's outer edge (x = ox), run back just off the side of the head and bend into it
  // there, like over an ear: a straight arm to the back would graze the round head and show through in dashes
  const arms=(mat,ox,z)=>{ for(const s of [-1,1]){ const k=new THREE.Vector3(s*.32,EY+.01,.1);
    g.add(bar(new THREE.Vector3(s*ox,EY,z),k,.014,mat)); g.add(bar(k,new THREE.Vector3(s*.24,EY+.02,-.12),.014,mat));
      g.add(new THREE.Mesh(sph(.014,8,6),mat).translateOnAxis(k.clone().normalize(),k.length())); } };
  if(id==='glasses'||id==='shades'){ const sh=id==='shades', z=sh?EZ+.01:EZ, rad=sh?.13:.12;
    for(const s of [-1,1]){ const r=new THREE.Mesh(new THREE.TorusGeometry(rad,.019,10,30),m('frame')); r.position.set(s*.13,EY,z); g.add(r);
      if(sh){ const l=new THREE.Mesh(new THREE.CircleGeometry(rad,28),m('lensDark')); l.position.set(s*.13,EY,z-.004); g.add(l);
        const hl=new THREE.Mesh(new THREE.CircleGeometry(.025,12),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(s*.13-.05,EY+.05,z+.002);
          hl.scale.set(1.6,.6,1); hl.rotation.z=.5; g.add(hl); } }
    const br=new THREE.Mesh(new THREE.TorusGeometry(.03,.013,8,12,Math.PI),m('frame')); br.position.set(0,EY+.03,z+.005); g.add(br); arms(m('frame'),.13+rad,z);
      }
  else if(id==='hearts'||id==='stars'){ const mk=id==='hearts'?SHAPE_HEART:SHAPE_STAR, fr=m(id==='hearts'?'heartFrame':'starFrame'), lens=m(id==='hearts'?'petalB':'lensDark');
    const sc=id==='hearts'?.125:.15;
    for(const s of [-1,1]){ const l=shapedLens(mk,fr,lens,sc); l.position.set(s*.135,EY,EZ-.01); l.rotation.z=s*-.08; g.add(l); }
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.07,8),fr); br.rotation.z=Math.PI/2; br.position.set(0,EY+.02,EZ+.005); g.add(br);
      arms(fr,.135+sc*.95,EZ); }
  else if(id==='monocle'){ const r=new THREE.Mesh(new THREE.TorusGeometry(.125,.02,10,30),m('monocle')); r.position.set(-.13,EY,EZ+.005); g.add(r);
    // a little chain from the rim, sagging over the cheek to a clip on the side of the head (never off in the air)
    const ca=new THREE.Vector3(-.235,EY-.06,EZ-.01), cc=new THREE.Vector3(-.28,-.18,.37), cb=new THREE.Vector3(-.27,-.13,.17), chain=new THREE.QuadraticBezierCurve3(ca,cc,cb);
    for(let i=0;i<9;i++){ const c=new THREE.Mesh(sph(.014,8,6),m('monocle')); c.position.copy(chain.getPoint(i/8)); g.add(c); }
    const clip=new THREE.Mesh(sph(.026,10,8),m('monocle')); clip.position.copy(cb); clip.scale.set(.55,1,1); outline(clip,.008); g.add(clip); }
  else if(id==='freckles'){ const R=HEAD_R+.004;
    for(const s of [-1,1]) for(const [x,y] of [[.17,.02],[.21,.04],[.2,-.005],[.24,.015]]){ const xx=s*x, z=Math.sqrt(R*R-xx*xx-y*y), d=new THREE.Mesh(sph(.014,8,6),m('tash'));
      d.position.set(xx,y,z); d.scale.z=.4; d.lookAt(xx*3,y*3,z*3); g.add(d); } }
  else if(id==='nose'){ const n=new THREE.Mesh(sph(.055,18,14),m('bowDark')); n.position.set(0,.035,HEAD_R+.01); outline(n,.01); g.add(n);
    const hl=new THREE.Mesh(sph(.015,8,6),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(-.018,.055,HEAD_R+.058); g.add(hl); }
  else if(id==='flower'){ // clipped on the left, off the top where most hats sit and away from the ribbon bow on the right
    const f=new THREE.Group(), fp=new THREE.Vector3(-.29,.17,.12).setLength(HEAD_R+.012); f.position.copy(fp); f.lookAt(fp.x*3,fp.y*3,fp.z*3+.3);
      f.scale.setScalar(1.25); g.add(f);
    for(let k=0;k<5;k++){ const a=k/5*Math.PI*2, pt=new THREE.Mesh(sph(.05,12,8),m('chef')); pt.position.set(Math.cos(a)*.055,Math.sin(a)*.055,0);
      pt.scale.z=.5; outline(pt,.008); f.add(pt); }
    const c=new THREE.Mesh(sph(.035,12,8),m('crown')); c.position.z=.02; f.add(c); }
  else if(id==='bowtie'){ const b=new THREE.Group(); b.position.set(0,-.3,.2); b.rotation.x=.5; g.add(b);
    for(const s of [-1,1]){ const w=new THREE.Mesh(new THREE.ConeGeometry(.075,.13,16),m('bowDark')); w.rotation.z=s*Math.PI/2; w.position.x=s*.07;
      w.scale.z=.55; outline(w,.008); b.add(w); }
    const k=new THREE.Mesh(sph(.035,12,8),m('heartFrame')); k.scale.z=.7; outline(k,.008); b.add(k); }
  else if(id==='scarf'){ // a soft roll slanting round the bottom of the head: under the chin in front, up over the neck behind
    // (so it shows from the tilted game camera too), with cream stripes, a knot at the side and two short tails
    const R=.33, tube=.066, ring=new THREE.Group(); ring.position.set(0,-.1,-.07); ring.rotation.x=-.93; ring.scale.x=.92; g.add(ring);
    const roll=new THREE.Mesh(new THREE.TorusGeometry(R,tube,12,36),m('mushRed')); ring.add(roll);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(R,tube+.012,10,36),lineMat));
    const band=new THREE.TorusGeometry(tube+.003,.014,6,16);
    for(let k=0;k<8;k++){ const a=(k+.5)/8*Math.PI*2, st=new THREE.Mesh(band,m('partyB')); st.position.set(R*Math.cos(a),R*Math.sin(a),0);
      st.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(-Math.sin(a),Math.cos(a),0)); ring.add(st); }
    const kp=new THREE.Vector3(.215,-.245,.18), knot=new THREE.Mesh(sph(.068,14,10),m('mushRed')); knot.position.copy(kp); knot.scale.set(1,.85,.8);
      outline(knot,.01); g.add(knot);
    for(const [dx,dy,dz,rz,rx] of [[.075,-.065,0,.9,.15],[.025,-.075,.06,.35,-.35]]){ const t=new THREE.Mesh(sph(.05,14,10),m('mushRed'));
      t.position.set(kp.x+dx,kp.y+dy,kp.z+dz); t.rotation.set(rx,0,rz); t.scale.set(1,2,.5); outline(t,.01); g.add(t);
      const tip=new THREE.Mesh(sph(.05,12,8),m('partyB')); tip.position.y=-.036; tip.scale.set(.88,.2,1.08); t.add(tip); } }
  else if(id==='eyepatch'){ // over the right eye, its strap running up over the forehead and round the back of the head
    const p=new THREE.Vector3(.13,.14,.34), pt=new THREE.Mesh(sph(.13,22,16),m('patch')); pt.position.copy(p); pt.scale.set(1,.95,.46);
      pt.lookAt(p.clone().multiplyScalar(3)); outline(pt,.01); g.add(pt);
    const on=d=>new THREE.Vector3(...d).normalize().multiplyScalar(HEAD_R+.012);
    const strap=new THREE.CatmullRomCurve3([on([.33,.37,.87]),on([.05,.62,.75]),on([-.35,.72,.5]),on([-.75,.55,.0]),on([-.45,.35,-.8])]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(strap,30,.016,6,false),m('patch')));
    const end=on([.62,.15,.77]), side=new THREE.CatmullRomCurve3([on([.4,.2,.88]),end,on([.85,.15,.45]),on([.6,.1,-.75])]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(side,24,.016,6,false),m('patch'))); }
  else if(id==='ladybug'){ // a ladybug resting on the right of the head, away from the flower clip and the butterfly
    const b=new THREE.Group(), bp=new THREE.Vector3(.26,.24,.12).setLength(HEAD_R+.02); b.position.copy(bp); b.lookAt(bp.x*3,bp.y*3,bp.z*3); b.rotateZ(-.6);
      b.scale.setScalar(1.25); g.add(b);
    const shell=new THREE.Mesh(new THREE.SphereGeometry(.07,18,12,0,Math.PI*2,0,Math.PI/2),m('ladybug')); shell.rotation.x=Math.PI/2; shell.scale.set(1,1,.7);
      outline(shell,.008); b.add(shell);
    const head=new THREE.Mesh(sph(.032,12,10),m('patch')); head.position.set(0,.07,.012); b.add(head);
    const line=new THREE.Mesh(new THREE.BoxGeometry(.006,.13,.01),m('patch')); line.position.z=.05; b.add(line);
    for(const [x,y] of [[-.035,.02],[.035,.02],[-.03,-.03],[.03,-.03]]){ const d=new THREE.Mesh(sph(.014,8,6),m('patch')); d.position.set(x,y,.045);
      d.scale.z=.4; b.add(d); }
    for(const sd of [-1,1]){ const e=new THREE.Mesh(sph(.008,6,4),m('eye')); e.position.set(sd*.013,.085,.03); b.add(e); } }
  else if(id==='sweatband'){ // a stretchy band hugging the top of the head, tipped back round the head's centre so it sits on
    // the forehead above the eyes and lower behind; its two edges follow the head's curve (hats go on top)
    const tilt=new THREE.Group(); tilt.rotation.x=-.42; g.add(tilt);
    const y=.215, hh=.075, rr=v=>Math.sqrt(HEAD_R*HEAD_R-v*v)+.016, band=new THREE.Group(); band.position.y=y; tilt.add(band);
    band.add(new THREE.Mesh(new THREE.CylinderGeometry(rr(y+hh/2),rr(y-hh/2),hh,36,1,true),m('sweat')));
    band.add(new THREE.Mesh(new THREE.CylinderGeometry(rr(y+.013)+.003,rr(y-.013)+.003,.026,36,1,true),m('sweatStripe')));
    for(const e of [-hh/2,hh/2]){ const r=new THREE.Mesh(new THREE.TorusGeometry(rr(y+e),.007,6,40),lineMat); r.rotation.x=Math.PI/2; r.position.y=e;
      band.add(r); } }
  else if(id==='daisies'){ // a chain of daisies lying on the head under the mouth: a circle on the head's sphere, round the
    // chin and down the sides, its back hidden under the body
    const tilt=new THREE.Group(); tilt.rotation.x=Math.PI-.47; g.add(tilt);
    const d=.27, r=Math.sqrt(HEAD_R*HEAD_R-d*d)+.012, ring=new THREE.Group(); ring.position.y=d; tilt.add(ring);
    const stem=new THREE.Mesh(new THREE.TorusGeometry(r,.014,6,48),m('leaf')); stem.rotation.x=Math.PI/2; ring.add(stem);
    // (the ring's -z is the front once tipped; each daisy faces straight out from the head's centre)
    for(let k=0;k<8;k++){ const a=-Math.PI/2+(k-3.5)*.4, f=new THREE.Group(), wv=new THREE.Vector3();
      f.position.set(Math.cos(a)*r,0,Math.sin(a)*r); ring.add(f); f.getWorldPosition(wv); f.lookAt(wv.multiplyScalar(2));
      for(let q=0;q<7;q++){ const pt=new THREE.Mesh(sph(.026,8,6),m('daisy')); const b=q/7*Math.PI*2+k; pt.position.set(Math.cos(b)*.03,Math.sin(b)*.03,.01);
        pt.scale.set(1,1,.45); f.add(pt); }
      const c=new THREE.Mesh(sph(.018,8,6),m('crown')); c.position.z=.022; outline(c,.005); f.add(c);
      if(k%2){ const lf=new THREE.Mesh(sph(.022,8,6),m('leaf')); lf.scale.set(1.6,.5,.4); lf.position.set(.045,-.02,0); lf.rotation.z=-.5; f.add(lf); } } }
  else if(id==='bandana'){ // a spotted neckerchief: a thin roll round the bottom of the head (like the scarf) and a triangle in front
    const R=.33, ring=new THREE.Group(); ring.position.set(0,-.1,-.07); ring.rotation.x=-.93; ring.scale.x=.92; g.add(ring);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(R,.036,10,36),m('bandana')), new THREE.Mesh(new THREE.TorusGeometry(R,.048,8,36),lineMat));
    const tri=new THREE.Shape(); tri.moveTo(-.14,0); tri.lineTo(.14,0); tri.quadraticCurveTo(.03,-.12,0,-.19); tri.quadraticCurveTo(-.03,-.12,-.14,0);
    const geo=new THREE.ExtrudeGeometry(tri,{depth:.02,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:10});
      geo.translate(0,0,-.01);
    const t=new THREE.Mesh(geo,m('bandana')); t.position.set(0,-.27,.21); t.rotation.x=-.35; outline(t,.01); g.add(t);
    for(const [x,y] of [[-.06,-.04],[.06,-.04],[0,-.1]]){ const d=new THREE.Mesh(sph(.017,8,6),m('bandanaDot')); d.position.set(x,y,.024); d.scale.z=.35;
      t.add(d); } }
  else if(id==='goggles'){ // chunky round goggles on a strap that hugs the head at eye height
    const z=EZ+.01, rad=.125, R=Math.sqrt(HEAD_R*HEAD_R-EY*EY)+.012;
    const strap=new THREE.Mesh(new THREE.TorusGeometry(R,.028,8,40,Math.PI*1.3),m('goggle')); strap.rotation.set(Math.PI/2,0,Math.PI*.85); strap.position.y=EY;
      g.add(strap);
    for(const s of [-1,1]){ const f=new THREE.Mesh(new THREE.TorusGeometry(rad,.032,10,30),m('goggle')); f.position.set(s*.135,EY,z); outline(f,.008); g.add(f);
      const cup=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*.95,.06,26,1,true),m('goggle')); cup.rotation.x=Math.PI/2; cup.position.set(s*.135,EY,z-.03);
        g.add(cup);
      const l=new THREE.Mesh(new THREE.CircleGeometry(rad,28),m('lensBlue')); l.position.set(s*.135,EY,z-.004); g.add(l);
      const hl=new THREE.Mesh(new THREE.CircleGeometry(.03,12),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(s*.135-.05,EY+.05,z+.002);
        hl.scale.set(1.5,.6,1); hl.rotation.z=.5; g.add(hl); }
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.05,8),m('goggle')); br.rotation.z=Math.PI/2; br.position.set(0,EY,z); g.add(br); }
  else if(id==='butterfly'){ // perched where the flower clip sits, wings tipped up a little as if it just landed
    const b=new THREE.Group(), bp=new THREE.Vector3(-.28,.24,.1).setLength(HEAD_R+.04); b.position.copy(bp); b.lookAt(bp.x*3,bp.y*3,bp.z*3+.3);
      b.scale.setScalar(1.4); g.add(b);
    const body=new THREE.Mesh(sph(.022,10,8),m('pupil')); body.scale.set(1,3.2,1); outline(body,.006); b.add(body);
    for(const s of [-1,1]){ for(const [y,r,mat,sx] of [[.035,.07,'petalB',1.1],[-.04,.05,'crown',1]]){ const w=new THREE.Mesh(sph(r,14,10),m(mat));
      w.scale.set(sx,1,.25); w.position.set(s*(r+.008),y,.02); w.rotation.set(0,s*.5,s*(y>0?-.35:.4)); outline(w,.006); b.add(w); }
      const an=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.07,4),m('pupil')); an.position.set(s*.016,.095,0); an.rotation.z=-s*.35; b.add(an); } }
  else if(id==='tash'){ // a handlebar: two tapered lobes from a round knot, curling up at the tips, hugging the face
    const R=HEAD_R, Y=0, surf=(x,y)=>Math.sqrt(Math.max(0,R*R-x*x-y*y));
    const lobe=[[0,.02],[.05,.006],[.1,-.006],[.15,-.004],[.185,.012],[.193,.036],[.177,.052],[.159,.047],[.158,.033]];
    const rad=t=>.009+.028*Math.pow(1-t,1.2);
    // a tube whose radius follows rad(t): TubeGeometry samples the curve evenly, so ring k sits at t=k/segs
    const taper=(curve,f,add)=>{ const segs=48, rs=12, g=new THREE.TubeGeometry(curve,segs,1,rs,false), pa=g.attributes.position, v=new THREE.Vector3();
      for(let i=0;i<pa.count;i++){ const t=Math.floor(i/(rs+1))/segs, c=curve.getPointAt(t); v.fromBufferAttribute(pa,i).sub(c).multiplyScalar(f(t)+add).add(c);
        pa.setXYZ(i,v.x,v.y,v.z); }
      g.computeVertexNormals(); return g; };
    for(const sd of [-1,1]){ const pts=lobe.map(([x,y])=>{ const X=sd*x, Yy=Y+y; return new THREE.Vector3(X,Yy,surf(X,Yy)+.012); });
      const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
      g.add(new THREE.Mesh(taper(curve,rad,0),m('tash')), new THREE.Mesh(taper(curve,rad,.011),lineMat));
      // a lighter strand along the top of the lobe, like the sticker
      const hp=[]; for(let k=0;k<=8;k++){ const t=.08+k/8*.5, c=curve.getPointAt(t), n=c.clone().normalize();
        hp.push(c.addScaledVector(n,rad(t)*.7).add(new THREE.Vector3(0,rad(t)*.4,0))); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp),16,0.006,6,false),m('tashLight'))); }
    const knot=new THREE.Mesh(sph(.038,16,12),m('tash')); knot.position.set(0,Y+.02,surf(0,Y+.02)+.008); knot.scale.set(1.15,.85,.75); outline(knot,.011);
      g.add(knot); }
  else if(id==='walrus'){ const half=id==='tash'
      ?[[0,.1],[.2,.17],[.45,.11],[.68,.02],[.86,.06],[.97,.22],[.93,.37],[.82,.4],[.78,.31],[.85,.24],[.8,.13],[.66,-.04],[.45,-.17],[.2,-.17],[0,-.06]]
      :[[0,.15],[.3,.2],[.6,.13],[.8,-.04],[.79,-.22],[.64,-.3],[.52,-.21],[.38,-.32],[.24,-.22],[.11,-.32],[0,-.22]];
    const pts=[...half,...half.slice(1,-1).reverse().map(([x,y])=>[-x,y])].map(([x,y])=>new THREE.Vector2(x,y)), sh=new THREE.Shape();
    sh.moveTo(pts[0].x,pts[0].y); sh.splineThru([...pts.slice(1),pts[0]]);
    // sized and raised to sit between the eyes and the mouth, clear of every mouth (the wow/yawn 'o' tops out at y -.026)
    const geo=new THREE.ExtrudeGeometry(sh,{depth:.22,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2,curveSegments:24}), w=id==='tash'?.17:.18;
    geo.scale(w,id==='tash'?w:w*.78,w); const pos=geo.getAttribute('position'); for(let i=0;i<pos.count;i++){ const x=pos.getX(i);
      pos.setZ(i,pos.getZ(i)-x*x*1.5); } geo.computeVertexNormals();
    const t=new THREE.Mesh(geo,m('tash')); t.position.set(0,id==='tash'?.008:.026,.322); t.rotation.x=-.22; outline(t,.008); g.add(t); }
  return g; }
function dressExtra(g){ const slot=g&&g.userData.accSlot; if(!slot) return; slot.clear(); const id=extraOn(); if(id==='none') return;
  const k=id+'|'+tintOf(id); if(!extraProto[k]) extraProto[k]=tinted(id,buildExtra(id)); slot.add(extraProto[k].clone()); }
