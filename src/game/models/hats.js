const hatProto={};
function buildHat(id){ const h=new THREE.Group();
  if(id==='chef'){ const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.2,.13,24),m('chef')); band.position.y=.05; outline(band,.012); h.add(band);
    for(const [x,y,z,r] of [[0,.24,0,.15],[.12,.19,.03,.12],[-.12,.19,.03,.12],[0,.19,-.11,.12],[0,.2,.11,.11]]){ const p=new THREE.Mesh(sph(r,18,14),m('chef')); p.position.set(x,y,z); outline(p,.012); h.add(p); } return h; }
  if(id==='wizard'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.31,.33,.03,28),m('wizard')); outline(brim,.012); h.add(brim);
    // a tall cone whose tip flops over to one side: the bend grows with height, so the base stays round on the band
    const H=.54, bend=t=>[.15*t*t*t,-.035*t*t*t, -.06*t*t*t], cg=new THREE.ConeGeometry(.19,H,26,10), cp=cg.attributes.position;
    for(let k=0;k<cp.count;k++){ const t=cp.getY(k)/H+.5, b=bend(t); cp.setXYZ(k,cp.getX(k)+b[0],cp.getY(k)+b[1],cp.getZ(k)+b[2]); }
    cg.computeVertexNormals(); const cone=new THREE.Mesh(cg,m('wizard')); cone.position.y=H/2+.01; outline(cone,.012); h.add(cone);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.186,.192,.055,26),m('crown')); band.position.y=.04; outline(band,.008); h.add(band);
    // little gold stars stuck on the cone, facing out
    const sg=new THREE.ExtrudeGeometry(SHAPE_STAR(),{depth:.25,bevelEnabled:false}); sg.translate(0,0,-.125);
    for(const [t,a,s] of [[.3,.35,.05],[.55,-.5,.04],[.16,-.95,.035],[.42,1.25,.035]]){ const r=.19*(1-t), b=bend(t), nx=Math.sin(a), nz=Math.cos(a);
      const st=new THREE.Mesh(sg,m('crown')); st.position.set(nx*r+b[0],.01+t*H+b[1],nz*r+b[2]); st.lookAt(st.position.x+nx,st.position.y+.33,st.position.z+nz); st.scale.setScalar(s); outline(st,.005); h.add(st); }
    return h; }
  if(id==='cowboy'){ // a wide brim curling up at the sides, a pinched crown with a crease on top
    const prof=[[.15,.016],[.15,-.016],[.36,-.016],[.386,0],[.36,.016],[.15,.016]].map(([x,y])=>new THREE.Vector2(x,y)), bg=new THREE.LatheGeometry(prof,40), bp=bg.attributes.position;
    for(let k=0;k<bp.count;k++){ const x=bp.getX(k), z=bp.getZ(k)*.84, sx=Math.max(0,Math.abs(x)-.17), sz=Math.max(0,Math.abs(z)-.2); bp.setXYZ(k,x,bp.getY(k)+2.6*sx*sx-.6*sz*sz,z); }
    bg.computeVertexNormals(); const brim=new THREE.Mesh(bg,m('cowboy')); outline(brim,.01); h.add(brim);
    const tg=new THREE.CylinderGeometry(.155,.195,.21,24,2), tp=tg.attributes.position;
    for(let k=0;k<tp.count;k++){ let x=tp.getX(k), y=tp.getY(k), z=tp.getZ(k); const t=y/.21+.5;
      if(t>.99){ y-=.045*Math.max(0,1-(x/.16)*(x/.16)); } x*=1-.22*t*Math.max(0,z/.17); tp.setXYZ(k,x,y,z); }
    tg.computeVertexNormals(); const top=new THREE.Mesh(tg,m('cowboy')); top.position.y=.115; outline(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.196,.045,24),m('cowboyBand')); band.position.y=.04; h.add(band); return h; }
  if(id==='phones'){ const arc=new THREE.Mesh(new THREE.TorusGeometry(.36,.035,10,30,Math.PI),m('phonesBand')); arc.position.y=-.22; outline(arc,.01); h.add(arc);
    for(const sx of [-1,1]){ const cup=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.09,22),m('phones')); cup.rotation.z=Math.PI/2; cup.position.set(sx*.37,-.24,0); outline(cup,.012); h.add(cup);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.03,18),m('phonesBand')); pad.rotation.z=Math.PI/2; pad.position.set(sx*.43,-.24,0); h.add(pad); } return h; }
  if(id==='crown'){ const ring=new THREE.Mesh(new THREE.TorusGeometry(.21,.04,8,28),m('leaf')); ring.rotation.x=Math.PI/2; ring.position.y=.05; outline(ring,.01); h.add(ring);
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2, f=new THREE.Group(); f.position.set(Math.cos(a)*.21,.1,Math.sin(a)*.21); f.rotation.z=Math.cos(a)*.5; f.rotation.x=-Math.sin(a)*.5; h.add(f); const col=i%2?m('petalB'):m('partyB');
      for(let k=0;k<5;k++){ const pt=new THREE.Mesh(sph(.045,8,6),col); const b=k/5*Math.PI*2; pt.position.set(Math.cos(b)*.05,0,Math.sin(b)*.05); pt.scale.y=.55; f.add(pt); }
      const c=new THREE.Mesh(sph(.03,8,6),m('key')); c.position.y=.015; f.add(c); } }
  else if(id==='straw'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.34,.36,.03,28),m('straw')); outline(brim,.012); h.add(brim);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.16,22),m('straw')); top.position.y=.09; outline(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.195,.195,.045,22),m('petalB')); band.position.y=.04; h.add(band);
    const fl=new THREE.Mesh(sph(.04,10,8),m('partyB')); fl.position.set(.17,.06,.08); h.add(fl); }
  else if(id==='leaf'){ // a big pointed leaf laid over the head: it bends down the sides, its tip curls up, a stalk curls at the back
    const L=.39, W=.23, R=.48, cy=.098-R, lg=new THREE.SphereGeometry(1,32,10), lp=lg.attributes.position;
    // a point on the bent leaf: x along it, z across it, lifted by d off the middle sheet
    const leafAt=(x,z,d)=>{ const ax=x/R, az=z/R, n=new THREE.Vector3(Math.sin(ax)*Math.cos(az),Math.cos(ax)*Math.cos(az),Math.sin(az));
      return n.multiplyScalar(R+d).add(new THREE.Vector3(0,cy+.06*Math.pow(Math.max(0,x/L),3),0)); };
    for(let k=0;k<lp.count;k++){ const u=lp.getX(k), v=lp.getZ(k), p=leafAt(u*L,v*W*Math.pow(Math.max(0,1-u*u),.4),lp.getY(k)*.022); lp.setXYZ(k,p.x,p.y,p.z); }
    lg.computeVertexNormals(); const lf=new THREE.Mesh(lg,m('leafBig')); outline(lf,.01,.4); h.add(lf);
    const rib=[], st=[]; for(let k=0;k<=10;k++){ const x=-L*.92+k/10*L*1.75; rib.push(leafAt(x,0,.02)); }
    const vein=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib),16,.009,5,false),m('leafVein')); h.add(vein);
    for(const sd of [-1,1]) for(const x0 of [-.16,0,.15]){ const pts=[]; for(let k=0;k<=3;k++){ const t=k/3; pts.push(leafAt(x0+t*.09,sd*t*W*.55*(1-Math.abs(x0)/L*.6),.016)); }
      h.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),4,.006,4,false),m('leafVein'))); }
    const s0=leafAt(-L*.95,0,0); for(let k=0;k<=5;k++){ const t=k/5; st.push(new THREE.Vector3(s0.x-.07*t-.02*Math.sin(t*3),s0.y-.01+.09*t*t,s0.z)); }
    const stalk=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(st),8,.016,6,false),m('stem')); h.add(stalk);
    h.rotation.y=-.5; }
  else if(id==='acorn'){ const cap=new THREE.Mesh(new THREE.SphereGeometry(.24,22,12,0,Math.PI*2,0,Math.PI/2),m('acornCap')); cap.scale.y=.7; outline(cap,.012); h.add(cap);
    for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; const d=new THREE.Mesh(sph(.025,6,5),m('acornNut')); d.position.set(Math.cos(a)*.17,.1,Math.sin(a)*.17); h.add(d); }
    const nub=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.08,8),m('acornCap')); nub.position.y=.2; h.add(nub); }
  else if(id==='party'){ const cone=new THREE.Mesh(new THREE.ConeGeometry(.17,.44,22),m('partyA')); cone.position.y=.24; outline(cone,.012); h.add(cone);
    for(const y of [.1,.26]){ const st=new THREE.Mesh(new THREE.TorusGeometry(.17*(1-(y-.02)/.44),.02,6,22),m('partyB')); st.rotation.x=Math.PI/2; st.position.y=y; h.add(st); }
    const pom=new THREE.Mesh(sph(.06,12,10),m('petalB')); pom.position.y=.47; h.add(pom); }
  else if(id==='beret'){ const b=new THREE.Mesh(sph(.24,22,14),m('beret')); b.scale.set(1,.32,1); b.position.set(.03,.03,0); b.rotation.z=-.2; outline(b,.012); h.add(b);
    const nub=new THREE.Mesh(sph(.035,10,8),m('beret')); nub.position.set(.05,.11,0); h.add(nub);
    const dew=new THREE.Mesh(sph(.04,10,8),m('dew')); dew.position.set(-.13,.07,.12); h.add(dew); }
  else if(id==='mush'){ const cap=new THREE.Mesh(new THREE.SphereGeometry(.26,24,12,0,Math.PI*2,0,Math.PI/2),m('mushRed')); cap.scale.y=.75; outline(cap,.012); h.add(cap);
    const gills=new THREE.Mesh(new THREE.TorusGeometry(.235,.028,8,28),m('stem')); gills.rotation.x=Math.PI/2; gills.scale.z=.6; gills.position.y=.002; h.add(gills);
    [[0,.17,.06],[.13,.1,.15],[-.12,.11,.14],[.02,.08,.22],[-.2,.06,.04],[.2,.06,.02]].forEach(p=>{ const d=new THREE.Mesh(sph(.035,8,6),m('stem')); d.position.set(...p); d.scale.y=.4; d.lookAt(p[0]*3,p[1]*3,p[2]*3); h.add(d); }); }
  else if(id==='tophat'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.03,26),m('topHat')); outline(brim,.012); h.add(brim);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.3,24),m('topHat')); top.position.y=.16; outline(top,.012); h.add(top);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.175,.175,.06,24),m('petalB')); band.position.y=.05; h.add(band); }
  else if(id==='rainhat'){ const brim=new THREE.Mesh(new THREE.CylinderGeometry(.3,.36,.06,26),m('rainHat')); brim.position.y=-.01; brim.rotation.x=.12; outline(brim,.012); h.add(brim);
    const top=new THREE.Mesh(new THREE.SphereGeometry(.2,22,12,0,Math.PI*2,0,Math.PI/2),m('rainHat')); top.scale.y=.85; outline(top,.012); h.add(top); }
  else if(id==='bee'){ // a headband hugging the head from side to side (the head's centre is .27 below the hat slot), antennae springing from it
    const band=new THREE.Mesh(new THREE.TorusGeometry(.355,.025,8,30,Math.PI-.7),m('pupil')); band.rotation.z=.35; band.position.y=-.27; h.add(band);
    for(const sd of [-1,1]){ const st=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.26,6),m('pupil')); st.position.set(sd*.216,.164,0); st.rotation.z=-sd*.357; h.add(st);
      const ball=new THREE.Mesh(sph(.05,12,10),m('crown')); ball.position.set(sd*.27,.315,0); outline(ball,.01); h.add(ball); } }
  else if(id==='brolly'){ h.rotation.set(.22,0,-.18); const stick=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.36,6),m('pole')); stick.position.y=.16; h.add(stick);
    const cg=new THREE.ConeGeometry(.3,.14,8,1,true), can=new THREE.Mesh(cg,m('brolly')); can.position.y=.38; outline(can,.012); h.add(can);
    // seen from below (the home worm looks up at it) the canopy is hollow: a pale lining with spokes
    const lining=new THREE.Mesh(cg,MC.brollyIn||(MC.brollyIn=toon(0xE4F4FC,{side:THREE.BackSide}))); can.add(lining);
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2, x=Math.sin(a)*.27, z=Math.cos(a)*.27, sp=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.3,4),m('pole'));
      sp.position.set(x/2,.365,z/2); sp.lookAt(x,.315,z); sp.rotateX(Math.PI/2); h.add(sp); }
    const tip=new THREE.Mesh(sph(.02,8,6),m('pole')); tip.position.y=.46; h.add(tip); }
  else if(id==='bow'){ // a ribbon bow perched on the top of the head, off to one side, in a deeper pink than any worm
    const g=new THREE.Group(); g.position.set(.17,.065,.03); g.rotation.set(-.15,-.3,-.5); h.add(g);
    for(const sd of [-1,1]){ const loop=new THREE.Mesh(sph(.1,16,12),m('bowDark')); loop.scale.set(1.25,.85,.55); loop.position.x=sd*.105; loop.rotation.z=-sd*.25; outline(loop,.01); g.add(loop);
      const tail=new THREE.Mesh(sph(.05,10,8),m('bowDark')); tail.scale.set(.55,1.3,.35); tail.position.set(sd*.04,-.085,.015); tail.rotation.z=sd*.45; outline(tail,.008); g.add(tail); }
    const knot=new THREE.Mesh(sph(.05,12,10),m('bowKnot')); knot.scale.set(1,1,.75); knot.position.z=.02; outline(knot,.008); g.add(knot); }
  else if(id==='gold'){ // an open ring, so both of its sides are drawn: the back of the band shows through the top
    const gm2=MC.crownBand||(MC.crownBand=toon(C.crown,{side:THREE.DoubleSide}));
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.19,.2,.09,24,1,true),gm2); band.position.y=.04; outline(band,.01); h.add(band);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const sp=new THREE.Mesh(new THREE.ConeGeometry(.045,.11,8),m('crown')); sp.position.set(Math.cos(a)*.19,.13,Math.sin(a)*.19); outline(sp,.008); h.add(sp);
      const gm=new THREE.Mesh(sph(.025,8,6),i%2?m('petalB'):m('partyA')); gm.position.set(Math.cos(a)*.2,.04,Math.sin(a)*.2); h.add(gm); } }
  else if(id==='beanie'){ // a knitted dome with a ribbed turn-up and a fluffy pompom
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.25,22,12,0,Math.PI*2,0,Math.PI/2),m('beanie')); dome.scale.y=.9; dome.position.y=-.02; outline(dome,.012); h.add(dome);
    const rib=new THREE.Mesh(new THREE.TorusGeometry(.245,.05,8,28),m('beanieRib')); rib.rotation.x=Math.PI/2; rib.position.y=-.01; outline(rib,.01); h.add(rib);
    for(let i=0;i<14;i++){ const a=i/14*Math.PI*2, k=new THREE.Mesh(new THREE.BoxGeometry(.012,.07,.02),m('beanie')); k.position.set(Math.cos(a)*.29,-.01,Math.sin(a)*.29); k.rotation.y=-a; h.add(k); }
    const pom=new THREE.Mesh(sph(.075,14,10),m('dew')); pom.position.y=.25; outline(pom,.01); h.add(pom); }
  else if(id==='sunflower'){ // one big bloom tucked on top, tipped toward the front, two leaves peeking out from under it
    const g=new THREE.Group(); g.position.set(.04,.08,.01); g.rotation.set(.3,0,-.15); g.scale.setScalar(1.12); h.add(g);
    for(const a of [2.2,3.9]){ const lf=new THREE.Mesh(sph(.07,12,8),m('leaf')); lf.scale.set(.55,.16,1.35); lf.position.set(Math.sin(a)*.2,-.025,Math.cos(a)*.2); lf.rotation.y=a; outline(lf,.008); g.add(lf); }
    for(let i=0;i<12;i++){ const a=i/12*Math.PI*2, pt=new THREE.Mesh(sph(.06,10,8),m('sunPetal')); pt.scale.set(.55,.22,1.25); pt.position.set(Math.sin(a)*.13,0,Math.cos(a)*.13); pt.rotation.y=a; outline(pt,.008); g.add(pt); }
    const core=new THREE.Mesh(sph(.085,16,10),m('sunCore')); core.scale.y=.45; core.position.y=.015; outline(core,.008); g.add(core);
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2, d=new THREE.Mesh(sph(.012,6,4),m('acornNut')); d.position.set(Math.sin(a)*.045,.05,Math.cos(a)*.045); g.add(d); } }
  else if(id==='shell'){ // the snails' lilac shell, worn like a cap and turned so its spiral faces the front
    const sh=new THREE.Mesh(sph(.23,24,18),m('shellHat')); sh.scale.set(1,.92,.8); sh.position.set(0,.1,-.03); outline(sh,.012); h.add(sh);
    const pts=[]; for(let k=0;k<=40;k++){ const t=k/40, a=t*Math.PI*3.4, r=.17*(1-t*.82); pts.push(new THREE.Vector3(Math.cos(a)*r,.1+Math.sin(a)*r,.155+.03*t)); }
    const sp=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.018,6,false),m('shellSpiral')); h.add(sp); }
  else if(id==='pumpkin'){ // a little pumpkin: ribs round a squat core, a stubby stem and one curly leaf
    const p=new THREE.Group(); p.position.y=.08; h.add(p);
    const core=new THREE.Mesh(sph(.2,22,14),m('pumpkin')); core.scale.y=.68; outline(core,.012); p.add(core);
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2, r=new THREE.Mesh(sph(.11,14,10),m(i%2?'pumpkin':'pumpkinRib')); r.scale.set(.75,1.15,1); r.position.set(Math.cos(a)*.13,0,Math.sin(a)*.13); r.rotation.y=-a; outline(r,.008); p.add(r); }
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.09,8),m('acornCap')); stem.position.y=.15; stem.rotation.z=-.25; p.add(stem);
    const lf=new THREE.Mesh(sph(.06,12,8),m('leaf')); lf.scale.set(1.3,.18,.7); lf.position.set(-.08,.14,.05); lf.rotation.set(.2,.5,.35); outline(lf,.008); p.add(lf); }
  else if(id==='bonnet'){ // a soft cap of overlapping petals, like an upside-down bloom, with a pollen bud on top
    for(const [ring,n,r,y,tilt,mat] of [[0,9,.21,.03,.95,'petalB'],[1,7,.12,.12,.55,'bowDark']]) for(let i=0;i<n;i++){ const a=(i+ring*.5)/n*Math.PI*2, pv=new THREE.Group(); pv.rotation.y=-a; h.add(pv);
      const pt=new THREE.Mesh(sph(.12,16,12),m(mat)); pt.scale.set(1.4,.32,.95); pt.position.set(r,y,0); pt.rotation.z=tilt; outline(pt,.01); pv.add(pt); }
    const bud=new THREE.Mesh(sph(.07,14,10),polMat('Y','light')); bud.position.y=.2; outline(bud,.01); h.add(bud);
    for(let i=0;i<5;i++){ const a=i*1.26, d=new THREE.Mesh(sph(.018,8,6),polMat('Y','dark')); d.position.set(Math.cos(a)*.035,.255,Math.sin(a)*.035); h.add(d); } }
  else if(id==='miner'){ // a round hard hat with a little lamp, for a worm who digs
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.25,24,12,0,Math.PI*2,0,Math.PI/2),m('miner')); dome.scale.y=.82; outline(dome,.012); h.add(dome);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.035,28),m('minerDark')); brim.position.y=.005; outline(brim,.01); h.add(brim);
    const ridge=new THREE.Mesh(new THREE.TorusGeometry(.2,.022,8,24,Math.PI),m('minerDark')); ridge.rotation.y=Math.PI/2; ridge.position.y=.0; h.add(ridge);
    const lamp=new THREE.Group(); lamp.position.set(0,.13,.2); lamp.rotation.x=.35; h.add(lamp);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.08,18),m('pole')); body.rotation.x=Math.PI/2; outline(body,.008); lamp.add(body);
    const glass=new THREE.Mesh(new THREE.CircleGeometry(.055,18),new THREE.MeshBasicMaterial({color:C.lamp})); glass.position.z=.042; lamp.add(glass);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(.09,18),new THREE.MeshBasicMaterial({color:C.lamp,transparent:true,opacity:.35,depthWrite:false})); glow.position.z=.046; lamp.add(glow); }
  else if(id==='sprout'){ // a seedling growing out of the top of the head: a stem and two round leaves
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.024,.2,8),m('leaf')); stem.position.y=.07; stem.rotation.z=.12; outline(stem,.008); h.add(stem);
    for(const sd of [-1,1]){ const lf=new THREE.Mesh(sph(.09,14,10),m('leaf')); lf.scale.set(1.15,.22,.7); lf.position.set(sd*.085-.015,.18+(sd>0?.02:0),0); lf.rotation.z=-sd*.45; outline(lf,.008); h.add(lf);
      const v=new THREE.Mesh(new THREE.BoxGeometry(.11,.006,.012),m('leafVein')); v.position.set(sd*.085-.015,.2+(sd>0?.02:0),0); v.rotation.z=-sd*.45; h.add(v); }
    h.position.y=-.03; }
  else if(id==='teacup'){ // a teacup on its saucer, a little tea inside and a curl of steam
    const sau=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.035,28),m('chef')); outline(sau,.01); h.add(sau);
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.15,.1,.17,26,1,true),m('teacup')); cup.position.y=.1; outline(cup,.01); h.add(cup);
    const bot=new THREE.Mesh(new THREE.CircleGeometry(.1,20),m('teacup')); bot.rotation.x=-Math.PI/2; bot.position.y=.018; h.add(bot);
    const tea=new THREE.Mesh(new THREE.CircleGeometry(.135,24),m('tea')); tea.rotation.x=-Math.PI/2; tea.position.y=.165; h.add(tea);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.05,.016,8,16,Math.PI*1.3),m('teacup')); handle.position.set(.15,.1,0); handle.rotation.z=-Math.PI*.65; outline(handle,.006); h.add(handle);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+.3, d=new THREE.Mesh(sph(.018,8,6),m('teacupDot')); d.position.set(Math.cos(a)*.128,.11,Math.sin(a)*.128); d.scale.set(1,1,.4); d.lookAt(Math.cos(a),.11,Math.sin(a)); h.add(d); }
    const st=[]; for(let k=0;k<=6;k++){ const t=k/6; st.push(new THREE.Vector3(Math.sin(t*5)*.03,.2+t*.16,0)); }
    const steam=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(st),16,.012,6,false),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75})); h.add(steam); }
  else if(id==='nest'){ // a nest woven from thin twig rings in two browns, a few loose ends curving round it, two speckled eggs
    const bowl=new THREE.Mesh(new THREE.SphereGeometry(.17,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),m('acornCap')); bowl.scale.y=.45; bowl.position.y=.07; h.add(bowl);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.17,.055,10,28),m('twig')); rim.rotation.x=Math.PI/2; rim.scale.z=.75; rim.position.y=.055; outline(rim,.01); h.add(rim);
    for(let i=0;i<9;i++){ const tw=new THREE.Mesh(new THREE.TorusGeometry(.175+(i%3)*.012,.011,5,30,Math.PI*(1.1+(i%4)*.25)),i%2?m('acornNut'):m('twig'));
      tw.rotation.set(Math.PI/2+((i*37)%7-3)*.06,((i*53)%9-4)*.05,i*.83); tw.position.y=.04+(i%4)*.022; h.add(tw); }
    for(let i=0;i<5;i++){ const a=i*1.31+.4, pts=[]; for(let k=0;k<=4;k++){ const t=a+k*.16; pts.push(new THREE.Vector3(Math.cos(t)*(.2+k*.012),.07+(i%2?.03:-.01)+k*.008,Math.sin(t)*(.2+k*.012))); }
      h.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,.008,4,false),m('acornNut'))); }
    for(const [x,z,r] of [[-.05,.02,.2],[.05,-.02,-.3]]){ const e=new THREE.Mesh(sph(.06,16,12),m('egg')); e.scale.set(.85,1.1,.85); e.position.set(x,.1,z); e.rotation.z=r; outline(e,.008); h.add(e);
      for(let k=0;k<4;k++){ const d=new THREE.Mesh(sph(.009,6,4),m('eggDot')); const a=k*1.7+x*20, el=.6+k*.3; d.position.set(x+Math.cos(a)*Math.sin(el)*.05,.1+Math.cos(el)*.064,z+Math.sin(a)*Math.sin(el)*.05); h.add(d); } } }
  else if(id==='cloud'){ // a little rain cloud hovering over the head, a few drops falling from it
    const c=new THREE.Group(); c.position.y=.22; h.add(c);
    [[0,0,0,.11],[-.1,-.02,0,.08],[.1,-.02,0,.08],[.05,.05,0,.08],[-.05,.05,0,.075]].forEach(p=>{ const s=new THREE.Mesh(sph(p[3],16,12),m('cloud')); s.position.set(p[0],p[1],p[2]); outline(s,.01); c.add(s); });
    const face=new THREE.Group(); face.position.set(0,0,.105); c.add(face);
    for(const sd of [-1,1]){ const e=new THREE.Mesh(new THREE.TorusGeometry(.016,.006,6,10,Math.PI),m('pupil')); e.position.set(sd*.035,.01,0); e.rotation.z=Math.PI; face.add(e); }
    for(const [x,y] of [[-.07,-.12],[.02,-.15],[.08,-.1]]){ const d=new THREE.Mesh(sph(.018,8,6),m('water')); d.scale.y=1.5; d.position.set(x,y,.02); c.add(d); } }
  else if(id==='explorer'){ // a pith helmet for the long trek: a tall khaki dome on a wide brim, a leather band and a feather
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.33,.35,.03,30),m('explorer')); brim.rotation.x=.08; outline(brim,.012); h.add(brim);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.22,26,12,0,Math.PI*2,0,Math.PI/2),m('explorer')); dome.scale.y=1.05; dome.position.y=.01; outline(dome,.012); h.add(dome);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(.222,.222,.055,26,1,true),m('explorerBand')); band.position.y=.04; h.add(band);
    const nub=new THREE.Mesh(sph(.03,10,8),m('explorer')); nub.position.y=.24; outline(nub,.008); h.add(nub);
    const fe=new THREE.Mesh(sph(.06,12,8),m('leaf')); fe.scale.set(.35,1.6,.5); fe.position.set(-.2,.13,-.04); fe.rotation.z=.5; outline(fe,.008); h.add(fe); }
  else if(id==='gnome'){ // a tall red gnome hat, tip flopping forward, on a fluffy white band
    const H=.5, cg=new THREE.ConeGeometry(.2,H,26,10), cp=cg.attributes.position;
    for(let k=0;k<cp.count;k++){ const t=cp.getY(k)/H+.5; cp.setXYZ(k,cp.getX(k),cp.getY(k)-.05*t*t*t,cp.getZ(k)+.17*t*t*t); }
    cg.computeVertexNormals(); const cone=new THREE.Mesh(cg,m('gnome')); cone.position.y=H/2+.02; outline(cone,.012); h.add(cone);
    const band=new THREE.Mesh(new THREE.TorusGeometry(.2,.05,10,28),m('chef')); band.rotation.x=Math.PI/2; band.position.y=.03; outline(band,.01); h.add(band);
    const tip=new THREE.Mesh(sph(.045,12,10),m('chef')); tip.position.set(0,H+.02-.05,.17); outline(tip,.008); h.add(tip); }
  else if(id==='horn'){ // a headband hugging the head side to side, with a curved beetle horn on top
    const band=new THREE.Mesh(new THREE.TorusGeometry(.355,.03,8,30,Math.PI-.7),m('beetleDark')); band.rotation.z=.35; band.position.y=-.27; h.add(band);
    const pts=[]; for(let k=0;k<=8;k++){ const t=k/8, a=t*1.4; pts.push(new THREE.Vector3(0,.06+Math.sin(a)*.2,-.06+(1-Math.cos(a))*.2)); }
    const path=new THREE.CatmullRomCurve3(pts), g=new THREE.TubeGeometry(path,12,.06,12,false), hp=g.attributes.position;
    for(let k=0;k<hp.count;k++){ const t=Math.floor(k/13)/12, c=path.getPointAt(Math.min(1,t)), f=1-t*.7; hp.setXYZ(k,c.x+(hp.getX(k)-c.x)*f,c.y+(hp.getY(k)-c.y)*f,c.z+(hp.getZ(k)-c.z)*f); }
    g.computeVertexNormals(); g.computeBoundingSphere(); const c0=g.boundingSphere.center.clone(); g.translate(-c0.x,-c0.y,-c0.z);
    const horn=new THREE.Mesh(g,m('beetle')); horn.position.copy(c0); outline(horn,.01); h.add(horn);
    const base=new THREE.Mesh(sph(.075,14,10),m('beetleDark')); base.position.set(0,.05,-.06); base.scale.y=.6; outline(base,.01); h.add(base);
    const tip=new THREE.Mesh(sph(.024,8,6),m('beetleSpot')); tip.position.copy(pts[8]); h.add(tip);
    for(const [x,y,z] of [[.03,.16,-.02],[-.02,.22,.04]]){ const sp=new THREE.Mesh(sph(.018,8,6),m('beetleSpot')); sp.position.set(x,y,z); h.add(sp); } }
  h.traverse(o=>{ if(o.isMesh&&o.material!==lineMat) o.castShadow=true; });
  return h; }
let hatId=store.get('squirm-hat')||'none';
const chapterCleared=k=>{ const ch=CHAPTERS[k]; if(!ch) return false; for(let i=ch.from;i<=ch.to;i++) if(!isCleared(i)) return false; return true; };
const hatUnlocked=h=>h[4]?h[4]():h[2]<0||chapterCleared(h[2]);
function dressHat(g){ const slot=g&&g.userData.hatSlot; if(!slot) return; slot.clear();
  const h=HATS.find(x=>x[0]===hatId); if(!h||h[0]==='none'||!hatUnlocked(h)) return;
  const k=hatId+'|'+tintOf(hatId); if(!hatProto[k]) hatProto[k]=tinted(hatId,buildHat(hatId)); slot.add(hatProto[k].clone()); }
