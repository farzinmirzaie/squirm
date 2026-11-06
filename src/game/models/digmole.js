// ---------- dirt mounds and moles ----------
// A dirt mound (D) is a heap of loose earth rising out of the bed's soil, with crumbs, pebbles, a root and a little
// trowel stuck in its top; the head digs into it, it crumbles away and a grass tile pops up in its place (digOut).
// A molehill (M, N) is a grass tile with a hole ringed by a heap of earth; its mole pops up every other move and ducks
// while it's down or while the worm lies on the hill (syncMoles, eased by updateMoles). Blocked: moleNope, digNope.
let moleItems=[];
// the mound: a lumpy dome whose foot sits just under the soil, crumbly all over
const DIRT_R=.44, DIRT_H=.42, DIRT_Y=-.24;
const dirtWob=a=>1+.07*Math.sin(5*a+.7)+.04*Math.sin(9*a+2.1);
function dirtDome(){ if(GC.dirtDome) return GC.dirtDome; const g=new THREE.SphereGeometry(DIRT_R,40,14,0,Math.PI*2,0,Math.PI/2), pa=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i); const a=Math.atan2(v.z,v.x), up=v.y/DIRT_R, s=Math.sin(up*Math.PI);
    const f=dirtWob(a)*(1+.035*Math.sin(13*a+7*up)*s);
    pa.setXYZ(i,v.x*f,v.y*(DIRT_H/DIRT_R)*(1+.12*Math.sin(3*a+.4)*s),v.z*f); }
  g.computeVertexNormals(); return GC.dirtDome=g; }
// the height of the dome's surface at angle a and a fraction q of the way out from its middle
const dirtAt=(a,q)=>DIRT_Y+DIRT_H*Math.sqrt(Math.max(0,1-q*q))*(1+.12*Math.sin(3*a+.4)*Math.sin(Math.sqrt(Math.max(0,1-q*q))*Math.PI));
function makeDirtTile(g,x,y){ const md=new THREE.Group(); md.rotation.y=(x*5+y*3)%6*.9; g.add(md); g.userData.dirt=md;
  const st=new THREE.Group();
  const dome=new THREE.Mesh(dirtDome(),m('dirt')); dome.position.y=DIRT_Y; hullFit(dome,.016,DIRT_R); st.add(dome);
  // crumbs and clods all over it in three earth tones, a few bigger ones outlined
  for(let i=0;i<16;i++){ const a=i*2.4+.5, q=i<3?.12+i*.12:.3+((i*7)%5)*.13, big=i%5===2, r=big?.065:i%2?.05:.04;
    const c=new THREE.Mesh(sph(r,10,8),i%3===0?m('dirtDark'):i%3===1?m('dirtCrumb'):m('dirt'));
    c.position.set(Math.cos(a)*q*DIRT_R*dirtWob(a),dirtAt(a,q)-.006,Math.sin(a)*q*DIRT_R*dirtWob(a)); c.scale.set(1,.6,.85); c.rotation.y=-a;
    if(big) hullFit(c,.01); st.add(c); }
  // crumbs spilled at its foot, on the soil
  for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+.3, r=DIRT_R*dirtWob(a)+.03;
    const c=new THREE.Mesh(sph(i%2?.035:.045,8,6),i%2?m('dirtCrumb'):m('dirtDark')); c.position.set(Math.cos(a)*r,-.215,Math.sin(a)*r);
    c.scale.set(1,.5,.8); hullFit(c,.008); st.add(c); }
  // two pebbles on the slope
  for(const [a,q,r] of [[2.2,.72,.06],[4.4,.62,.05]]){ const p=new THREE.Mesh(sph(r,12,8),m('stone')); p.position.set(Math.cos(a)*q*DIRT_R,dirtAt(a,q)+.005,Math.sin(a)*q*DIRT_R);
    p.scale.set(1.2,.6,.9); p.rotation.y=a; hullFit(p,.01); st.add(p); }
  // a pale root curling out of the side
  { const a=.9, pts=[]; for(let i=0;i<=8;i++){ const t=i/8, q=.55+t*.42; pts.push(new THREE.Vector3(Math.cos(a+t*.5)*q*DIRT_R,dirtAt(a+t*.5,q)+.02*Math.sin(t*Math.PI)-.01,Math.sin(a+t*.5)*q*DIRT_R)); }
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.018,6,false), rt=new THREE.Mesh(geo,m('root')); st.add(rt);
    st.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.03,6,false),lineMat)); }
  // the trowel: its blade dug into the top, a red handle leaning out
  const tr=new THREE.Group(); tr.position.set(-.04,DIRT_Y+DIRT_H-.08,.02); tr.rotation.set(-.15,.6,.45); tr.scale.setScalar(1.35); st.add(tr);
  const blade=new THREE.Mesh(GC.trowelBlade||(GC.trowelBlade=trowelBladeGeo()),m('trowel')); hullFit(blade,.012); tr.add(blade);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.08,8),m('trowel')); neck.position.y=.16; tr.add(neck);
  const hd=new THREE.Mesh(new THREE.CylinderGeometry(.034,.03,.17,12),m('trowelHandle')); hd.position.y=.27; hullFit(hd,.012); tr.add(hd);
  const knob=new THREE.Mesh(sph(.038,12,8),m('trowelHandle')); knob.position.y=.36; knob.scale.y=.7; hullFit(knob,.012); tr.add(knob);
  md.add(merged(st,1)); }
// a garden trowel's blade: a pointed scoop, flat and a little cupped, pointing down (-y)
function trowelBladeGeo(){ const g=new THREE.SphereGeometry(.07,18,14), pa=g.attributes.position;
  for(let i=0;i<pa.count;i++){ const x=pa.getX(i), y=pa.getY(i), z=pa.getZ(i), t=y/.07; // t: -1 the tip, 1 the shoulder
    const w=1-.55*Math.max(0,-t)*Math.max(0,-t)+.1*Math.max(0,t); pa.setXYZ(i,x*1.15*w,y*1.6+.07,z*.28+.02*(x/.07)*(x/.07)); }
  g.computeVertexNormals(); return g; }
// dug out: the mound crumbles into the soil with a puff of dust and a grass tile springs up in its place
function digOut(cell,x,y){ const t=cell.tile; cell.tile=makeTile(x,y,'.'); const nt=cell.tile; sfx('scrunch'); react('wow',700);
  dustPuff(wp(x,y,.05),C.dirtCrumb); burst(wp(x,y,.2),C.dirtDark);
  if(t) tween(300,(e)=>{ t.scale.set(1+e*.25,Math.max(.02,1-e),1+e*.25); t.position.y=-e*.12; },kill(t));
  nt.position.y=-.34; nt.scale.setScalar(.75);
  tween(180,(e,k)=>{ const b=1+2.2*Math.pow(k-1,3)+1.2*Math.pow(k-1,2); nt.position.y=-.34*(1-b); nt.scale.setScalar(.75+.25*Math.min(1.06,b)); },
    ()=>{ nt.position.y=0; nt.scale.setScalar(1); }); }
// too short to dig: the mound gives a little shrug
function digNope(x,y){ const c=cells[y]&&cells[y][x], t=c&&c.tile; if(!t||!t.userData.dirt||reduceMotion) return; const d=t.userData.dirt;
  tween(320,(e,k)=>{ const s=Math.sin(k*Math.PI*3)*.06*(1-k); d.scale.set(1+s,1-s,1+s); },()=>d.scale.set(1,1,1)); }

// ---------- the molehill and its mole ----------
function makeMoleHill(g,x,y){ g.userData.mole=true;
  // the heap round the hole: taller and rounder than the burrow's, with clods tumbling down it
  const st=new THREE.Group();
  const rim=new THREE.Mesh(lumpyTorus(.335,.115,x*3+y*7,1.2),m('moleHill')); rim.rotation.x=-Math.PI/2; rim.scale.z=1.15; rim.position.y=.04;
    outline(rim,.016,.45); st.add(rim);
  for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+x+y*1.7, r=.36+(i%2)*.1, c=new THREE.Mesh(sph(i%3?.045:.06,10,8),i%2?m('dirtDark'):m('dirtCrumb'));
    c.position.set(Math.cos(a)*r,i%2?.03:.12,Math.sin(a)*r); c.scale.set(1,.6,.8); c.rotation.y=-a; hullFit(c,.009); st.add(c); }
  g.add(merged(st,1));
  // earth over the turf between the heap and the hole, and a collar down into the shaft (shared with the burrow)
  const em=MC.burrowEarth||(MC.burrowEarth=new THREE.MeshToonMaterial({color:C.mound,gradientMap:gradTex,side:THREE.DoubleSide}));
  const ring=new THREE.Mesh(GC.burrowRing||(GC.burrowRing=new THREE.RingGeometry(BURROW_R-.004,.38,32)),em); ring.rotation.x=-Math.PI/2; ring.position.y=.006;
  const collar=new THREE.Mesh(GC.burrowCollar||(GC.burrowCollar=new THREE.CylinderGeometry(BURROW_R-.002,BURROW_R-.002,.13,28,1,true)),em); collar.position.y=-.06;
  g.add(ring,collar);
  const mo=makeMole(); g.add(mo); g.userData.moleG=mo; const u=mo.userData; u.v=0; u.vel=0; u.want=0; u.at=[x,y];
  setMole(u,0); moleItems.push(mo); }
function makeMole(){ const mo=new THREE.Group(), inner=new THREE.Group(); mo.add(inner); mo.scale.setScalar(1.1); const u=mo.userData; u.inner=inner;
  const body=new THREE.Group();
  // a velvety pear of a body with a paler tummy, and a tuft on top
  const b=new THREE.Mesh(sph(.2,28,20),m('mole')); b.scale.set(1,1.3,.95); outline(b,.02); body.add(b);
  const belly=new THREE.Mesh(sph(.16,20,14),m('moleBelly')); belly.scale.set(.85,1.15,.55); belly.position.set(0,-.07,.11); body.add(belly);
  for(const [sx,r] of [[-.025,.035],[.025,.03],[0,.04]]){ const t=new THREE.Mesh(sph(r,10,8),m('mole')); t.position.set(sx,.255,-.01); t.scale.set(.8,1.2,.8); body.add(t); }
  // the long pink snout and its nose
  const sn=new THREE.Mesh(sph(.07,18,12),m('moleSnout')); sn.scale.set(1,.78,1.35); sn.position.set(0,.06,.18); outline(sn,.014); body.add(sn);
  inner.add(merged(body,1));
  const nose=new THREE.Mesh(sph(.042,14,10),m('moleNose')); nose.scale.set(1.25,.95,.9); nose.position.set(0,.075,.27); outline(nose,.012); inner.add(nose); u.nose=nose;
  // tiny bead eyes with a glint, closed arcs for the raspberry, rosy cheeks
  const F={eyes:[],arcs:[]}; u.face=F;
  for(const sd of [-1,1]){ const e=new THREE.Mesh(sph(.026,10,8),m('pupil')); e.position.set(sd*.075,.135,.155); inner.add(e);
    const hl=new THREE.Mesh(sph(.009,6,4),m('eye')); hl.position.set(.008,.01,.02); e.add(hl);
    const arc=new THREE.Mesh(new THREE.TorusGeometry(.024,.008,6,12,Math.PI),m('pupil')); arc.position.set(sd*.075,.13,.165); arc.rotation.y=sd*.35; arc.visible=false; inner.add(arc);
    const ck=new THREE.Mesh(sph(.032,8,6),MC.critterCheek||(MC.critterCheek=new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.55})));
      ck.position.set(sd*.12,.06,.135); ck.scale.set(1,.6,.4); ck.rotation.y=sd*.6; inner.add(ck);
    F.eyes.push(e); F.arcs.push(arc); }
  const tongue=new THREE.Mesh(sph(.035,12,8),m('cheek')); tongue.scale.set(.9,.35,1.2); tongue.position.set(0,.0,.25); tongue.visible=false; inner.add(tongue); u.tongue=tongue;
  // big pink digging paws with pale claws, resting on the rim of the hill
  u.paws=[]; for(const sd of [-1,1]){ const pw=new THREE.Group(); pw.position.set(sd*.16,-.06,.21); pw.rotation.set(.45,sd*.45,-sd*.25); inner.add(pw);
    const pp=new THREE.Group(); const p=new THREE.Mesh(sph(.07,14,10),m('molePaw')); p.scale.set(1.15,.45,1); outline(p,.012); pp.add(p);
    for(let i=0;i<3;i++){ const c=new THREE.Mesh(sph(.022,8,6),m('moleClaw')); c.position.set((i-1)*.04,0,.065); c.scale.set(.8,.6,1.2); pp.add(c); }
    pw.add(merged(pp,1)); u.paws.push(pw); }
  u.blink=1+Math.random()*3; u.ph=Math.random()*6; u.nope=0;
  mo.traverse(o=>{ if(o.isMesh&&o.material!==lineMat&&o.material!==batchLine&&!o.material.transparent) o.castShadow=true; });
  return mo; }
// v: 1 up out of the hole, 0 tucked down inside it, below 0 deeper still (the worm is lying on the hill)
function setMole(u,v){ const inner=u.inner; inner.position.y=-.4+.62*v; inner.visible=v>.02;
  const s=Math.max(0,Math.min(1,v)); u.paws.forEach(p=>{ p.position.y=-.06+.04*(1-s); }); }
function moleWant(x,y){ return occupied(x,y)?-.3:moleUp(tileAt(state,x,y),state.moves)?1:0; }
// after every move, undo, restart and load: each mole heads up or down to match the state
function syncMoles(animate){ if(!state) return; let popped=null;
  for(const mo of moleItems){ const u=mo.userData, [x,y]=u.at, want=moleWant(x,y); if(u.want===want) continue; const was=u.want; u.want=want;
    if(!animate||reduceMotion){ u.v=want; u.vel=0; setMole(u,want); continue; }
    if(want===1&&was<1){ popped=popped||[x,y]; u.vel=Math.max(u.vel,3.2); dustPuff(wp(x,y,.12),C.dirtCrumb); } }
  if(popped) sfx('molePop'); }
// blocked by an up mole: it shakes its head, squeezes its eyes shut and blows a raspberry
function moleNope(x,y){ const it=cells[y]&&cells[y][x]&&cells[y][x].item, mo=it&&it.userData.moleG; if(!mo) return; mo.userData.nope=.75;
  setTimeout(()=>sfx('raspberry'),90); }
function updateMoles(dt){ if(!moleItems.length) return; const sec=Math.min(.05,dt/1000), yaw=(typeof camYaw==='number'?camYaw:0)*Math.PI/180, hp=segMeshes[0]&&segMeshes[0].position;
  for(const mo of moleItems){ const u=mo.userData, F=u.face;
    if(!reduceMotion&&Math.abs(u.want-u.v)+Math.abs(u.vel)>.002){ // a springy pop up, a quicker duck down
      const k=u.want>u.v?150:220, d=u.want>u.v?11:24; u.vel+=((u.want-u.v)*k-u.vel*d)*sec; u.v+=u.vel*sec;
      if(Math.abs(u.want-u.v)<.002&&Math.abs(u.vel)<.01){ u.v=u.want; u.vel=0; } setMole(u,u.v);
      u.inner.scale.set(1-Math.min(.12,Math.abs(u.vel)*.02),1+Math.min(.18,Math.abs(u.vel)*.03),1-Math.min(.12,Math.abs(u.vel)*.02)); }
    else u.inner.scale.set(1,1,1);
    // face the camera, turned a little toward the worm's head
    let look=0; if(hp){ const p=new THREE.Vector3(); mo.getWorldPosition(p); const a=Math.atan2(hp.x-p.x,hp.z-p.z); let dd=a-yaw; dd=Math.atan2(Math.sin(dd),Math.cos(dd)); look=Math.max(-.4,Math.min(.4,dd*.4)); }
    mo.rotation.y=yaw+(reduceMotion?0:look);
    if(u.nope>0){ u.nope-=sec; const k=Math.max(0,u.nope)/.75; u.inner.rotation.z=reduceMotion?0:Math.sin(k*Math.PI*6)*.22*k; u.tongue.visible=u.nope>.1;
      u.tongue.scale.set(.9,.35,1.2+(reduceMotion?0:Math.sin(idleT*40)*.15)); F.eyes.forEach(e=>e.visible=false); F.arcs.forEach(a=>a.visible=true);
      if(u.nope<=0){ u.inner.rotation.z=0; u.tongue.visible=false; F.eyes.forEach(e=>e.visible=true); F.arcs.forEach(a=>a.visible=false); } continue; }
    if(reduceMotion) continue;
    // a sniffing nose, a gentle sway while it's up, and a blink now and then
    const t=idleT+u.ph; u.nose.scale.set(1.25+Math.sin(t*9)*.08*(Math.sin(t*1.3)>.2?1:0),.95,.9);
    u.inner.rotation.z=u.v>.5?Math.sin(t*1.7)*.05:0;
    u.blink-=sec; let bl=1; if(u.blink<0){ bl=Math.max(.1,Math.abs(u.blink+.07)/.07); if(u.blink<-.14) u.blink=2+Math.random()*3.5; }
    F.eyes.forEach(e=>e.scale.set(1,bl,1)); } }
