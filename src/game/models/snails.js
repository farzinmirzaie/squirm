// ---------- snails ----------
// A soft cream foot with a paler skirt, a round lilac shell with a spiral groove on each side, eyes on stalks.
// inner is scaled by 1.4 on the board; userData.eyes are the stalk pivots loop.js leans toward the worm.
let snailMeshes=[];
const SNAIL_SHELL=new THREE.Vector3(0,.27,-.05), SNAIL_SR=.19, SNAIL_SX=.84;
// the groove: a spiral winding in from the shell's rim, laid on the shell's flattened side and half sunk into it (cached per side)
function snailSpiralGeo(s){ const k='snailSpiral'+s; if(GC[k]) return GC[k]; const pts=[];
  for(let i=0;i<=44;i++){ const a=i/44*Math.PI*3.4, r=.158*Math.exp(-a*.17), ph=a+2.2;
    const x=s*(SNAIL_SX*Math.sqrt(Math.max(0,SNAIL_SR*SNAIL_SR-r*r))-.002);
    pts.push(new THREE.Vector3(x,r*Math.sin(ph),r*Math.cos(ph))); }
  return GC[k]=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),64,.017,6,false); }
function makeSnail(){ const g=new THREE.Group(); const inner=new THREE.Group(); g.add(inner); g.userData.inner=inner;
  const bodyM=m('snail'), footM=m('snailFoot');
  // the solid body (foot, head, shell and its spirals) is one merged mesh plus its outline
  const bd=new THREE.Group();
  // the foot: a low body that lifts into the neck, a paler skirt round its edge and a tapering tail
  const body=new THREE.Mesh(sph(.16,24,16),bodyM); body.scale.set(.82,.52,1.7); body.position.set(0,.085,.03); outline(body,.02); bd.add(body);
  const skirt=new THREE.Mesh(sph(.16,24,12),footM); skirt.scale.set(.94,.15,1.84); skirt.position.set(0,.026,.01); outline(skirt,.012); bd.add(skirt);
  const tail=new THREE.Mesh(sph(.09,16,10),bodyM); tail.scale.set(.85,.42,1.5); tail.position.set(0,.04,-.25); outline(tail,.014); bd.add(tail);
  const neck=new THREE.Mesh(sph(.1,18,12),bodyM); neck.scale.set(.95,1.05,1.1); neck.position.set(0,.12,.2); bd.add(neck);
  const head=new THREE.Mesh(sph(.105,22,16),bodyM); head.position.set(0,.175,.27); outline(head,.018); bd.add(head);
  // the shell, its spiral groove on both sides and a glossy highlight
  const shell=new THREE.Mesh(sph(SNAIL_SR,28,20),m('snailShell')); shell.position.copy(SNAIL_SHELL); shell.scale.set(SNAIL_SX,1,1); outline(shell,.022);
    bd.add(shell);
  for(const s of [-1,1]){ const sp=new THREE.Mesh(snailSpiralGeo(s),m('snailSpiral')); sp.position.copy(SNAIL_SHELL); bd.add(sp);
    const dot=new THREE.Mesh(sph(.03,10,8),m('snailSpiral')); dot.scale.x=.35; dot.position.set(SNAIL_SHELL.x+s*SNAIL_SX*SNAIL_SR*.985,SNAIL_SHELL.y,SNAIL_SHELL.z); bd.add(dot); }
  // the lip where the shell opens over the body
  const lip=new THREE.Mesh(sph(.1,16,10),m('snailShellLight')); lip.scale.set(1.25,.42,1); lip.position.set(0,.14,.04); outline(lip,.01); bd.add(lip);
  const gloss=new THREE.Mesh(sph(.06,12,8),MC.beetleGloss||(MC.beetleGloss=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthWrite:false})));
  gloss.scale.set(.5,.35,1.2); gloss.position.set(-.06,.44,-.03); gloss.rotation.x=-.2; inner.add(gloss);
  // eyes on stalks (pivots at the top of the head), short feelers below, a smile and rosy cheeks
  const eyes=[]; for(const s of [-1,1]){ const st=new THREE.Group(); st.position.set(s*.045,.25,.29); st.rotation.z=-s*.25; st.rotation.x=-.3; inner.add(st);
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.014,.019,.15,8),bodyM); stalk.position.y=.07; st.add(stalk);
    const e=new THREE.Mesh(sph(.042,14,10),m('eye')); e.position.y=.155; outline(e,.012); st.add(e);
    const pu=new THREE.Mesh(sph(.023,10,8),m('pupil')); pu.position.set(0,.002,.026); e.add(pu);
    const hl=new THREE.Mesh(sph(.008,6,4),m('eye')); hl.position.set(.008,.009,.019); pu.add(hl); eyes.push(st);
    const fe=new THREE.Mesh(new THREE.CylinderGeometry(.011,.014,.06,6),bodyM); fe.position.set(s*.05,.13,.36); fe.rotation.set(1.15,0,-s*.5); bd.add(fe);
    const ft=new THREE.Mesh(sph(.016,8,6),bodyM); ft.position.set(s*.065,.115,.385); bd.add(ft);
    const ck=new THREE.Mesh(sph(.026,8,6),MC.critterCheek||(MC.critterCheek=new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.55})));
      ck.position.set(s*.072,.16,.355); ck.scale.set(1,.6,.4); ck.rotation.y=s*.5; inner.add(ck); }
  g.userData.eyes=eyes;
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.024,.007,6,12,Math.PI),m('pupil')); smile.position.set(0,.16,.377); smile.rotation.set(-.35,0,Math.PI);
    bd.add(smile); inner.add(merged(bd,1));
  g.traverse(o=>{ if(o.isMesh&&o.material!==lineMat&&o.material!==batchLine&&!o.material.transparent) o.castShadow=true; });
  board.add(g); return g; }
const snailYaw=n=>Math.atan2(n.dx,n.dy);
