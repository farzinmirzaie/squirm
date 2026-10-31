// ---------- snails ----------
let snailMeshes=[];
function makeSnail(){ const g=new THREE.Group(); const inner=new THREE.Group(); g.add(inner); g.userData.inner=inner;
  const bodyM=toon(0xF6E2B0), shellM=toon(0xC9A0E6), spiralM=toon(0xA67CCB);
  const body=new THREE.Mesh(sph(.16,24,16),bodyM); body.scale.set(.85,.55,1.75); body.position.set(0,.09,.04); body.castShadow=true; outline(body,.02); inner.add(body);
  const head=new THREE.Mesh(sph(.1,20,14),bodyM); head.position.set(0,.15,.25); head.castShadow=true; outline(head,.018); inner.add(head);
  const shell=new THREE.Mesh(sph(.19,24,18),shellM); shell.position.set(0,.27,-.04); shell.scale.set(.82,1,1); shell.castShadow=true; outline(shell,.022); inner.add(shell);
  for(const s of [-1,1]){ const sp=new THREE.Mesh(new THREE.TorusGeometry(.1,.022,8,24),spiralM); sp.position.set(s*.15,.27,-.04); sp.rotation.y=Math.PI/2; inner.add(sp);
    const sp2=new THREE.Mesh(sph(.04,10,8),spiralM); sp2.position.set(s*.155,.27,-.04); sp2.scale.x=.5; inner.add(sp2); }
  const eyes=[]; for(const s of [-1,1]){ const st=new THREE.Group(); st.position.set(s*.045,.22,.28); st.rotation.z=-s*.25; st.rotation.x=-.25; inner.add(st);
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.013,.016,.14,8),bodyM); stalk.position.y=.07; st.add(stalk);
    const e=new THREE.Mesh(sph(.04,14,10),m('eye')); e.position.y=.15; outline(e,.012); st.add(e);
    const pu=new THREE.Mesh(sph(.022,10,8),m('pupil')); pu.position.set(0,0,.025); e.add(pu); eyes.push(st); }
  g.userData.eyes=eyes;
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.025,.007,6,12,Math.PI),m('pupil')); smile.position.set(0,.13,.345); smile.rotation.z=Math.PI; inner.add(smile);
  board.add(g); return g; }
const snailYaw=n=>Math.atan2(n.dx,n.dy);
