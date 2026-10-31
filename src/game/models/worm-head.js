// ---------- the worm's head: face, expressions, segments ----------
const HEAD_R=.34;
function segR(i,n){ if(i===0) return .22; const t=(i-1)/Math.max(1,n-2); return .27-.1*t; }
function segY(i,n){ return i===0?HEAD_R:segR(i,n); }
function makeSeg(i,parent){
  const g=new THREE.Group();
  if(i===0){
    // the worm in a patch has its own head material, so pollen can tint it without touching the home worm
    const head=new THREE.Mesh(sph(HEAD_R,36,28),parent?m('head'):MC.gameHead); head.castShadow=true; outline(head,.03); g.add(head); g.userData.body=head;
    const face=new THREE.Group(); head.add(face);
    const F={eyes:[],arcs:[],squints:[],pupils:[],mouths:{}}; g.userData.face=F;
    const dark=m('pupil');
    for(const s of [-1,1]){
      const e=new THREE.Mesh(sph(.11,24,18),m('eye')); e.position.set(s*.13,.14,.24); outline(e,.018); face.add(e); F.eyes.push(e);
      const pu=new THREE.Mesh(sph(.062,18,14),dark); pu.position.set(0,0,.064); e.add(pu); F.pupils.push(pu);
      const hl=new THREE.Mesh(sph(.022,10,8),new THREE.MeshBasicMaterial({color:0xffffff})); hl.position.set(.024,.03,.048); pu.add(hl);
      const arc=new THREE.Mesh(new THREE.TorusGeometry(.06,.016,8,18,Math.PI),dark); arc.position.set(s*.13,.13,.31); arc.visible=false; face.add(arc);
        F.arcs.push(arc);
      // squeezed shut, > <, for a bump
      const sq=new THREE.Group(); sq.position.set(s*.13,.14,.315); sq.visible=false; face.add(sq); F.squints.push(sq);
      for(const sy of [-1,1]){ const dx=s*.07, dy=sy*.035, bar=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,Math.hypot(dx,dy)+.016,8),dark);
        bar.position.set(0,dy/2,0); bar.rotation.z=Math.atan2(-dx,dy); sq.add(bar); }
      const ck=new THREE.Mesh(sph(.055,14,10),cheekMat); ck.position.set(s*.21,-.04,.25); ck.scale.set(1,.55,.4); face.add(ck);
    }
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,8,18,Math.PI),dark); smile.position.set(0,-.06,.325); smile.rotation.z=Math.PI;
      face.add(smile); F.mouths.smile=smile;
    const grin=new THREE.Group(); grin.position.set(0,-.05,.31); face.add(grin); F.mouths.grin=grin;
    const gm=new THREE.Mesh(new THREE.SphereGeometry(.075,20,12,0,Math.PI*2,Math.PI/2,Math.PI/2),dark); gm.scale.set(1,.85,.5); grin.add(gm);
    const tg=new THREE.Mesh(sph(.04,14,10),toon(0xFF6F8E)); tg.position.set(0,-.045,.015); tg.scale.set(1,.55,.6); grin.add(tg);
    const o=new THREE.Mesh(new THREE.TorusGeometry(.03,.014,8,18),dark); o.position.set(0,-.07,.33); face.add(o); F.mouths.o=o;
    const flat=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.075,8),dark); flat.rotation.z=Math.PI/2; flat.position.set(0,-.06,.33); face.add(flat);
      F.mouths.flat=flat;
    const tongue=new THREE.Mesh(sph(.035,14,10),toon(0xFF7A98)); tongue.position.set(.02,-.1,.31); tongue.scale.set(1,1.2,.5); tongue.visible=false;
      face.add(tongue); F.tongue=tongue;
    const hat=new THREE.Group(); hat.position.set(0,.27,-.02); hat.rotation.x=-.18; head.add(hat); g.userData.hatSlot=hat; dressHat(g);
    const acc=new THREE.Group(); head.add(acc); g.userData.accSlot=acc; dressExtra(g);
    g.userData.expr='smile'; applyExpr(g,'smile');
  }
  (parent||wormG).add(g); return g;
}
const EXPRS=['grin','joy','wink','wow','sleepy','cheeky'];
let reactT=0, zT=0;
const zTex=canvasTex(64,64,c=>{ c.font='800 48px Grandstander, Nunito, sans-serif'; c.textAlign='center'; c.textBaseline='middle';
  c.lineWidth=8; c.strokeStyle='#FFF8EA'; c.strokeText('z',32,34); c.fillStyle='#5B4436'; c.fillText('z',32,34); });
function snore(h){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:zTex,transparent:true,depthWrite:false}));
  s.position.copy(h.position).add(new THREE.Vector3(.15,.45,0)); s.scale.setScalar(.01); fx.add(s);
  const x0=s.position.x;
    tween(1800,(e,k)=>{ s.position.y+=.004; s.position.x=x0+Math.sin(k*5)*.08; s.scale.setScalar(.12+k*.18); s.material.opacity=1-k; },kill(s)); }
function react(name,ms=900){ const h=segMeshes[0]; if(!h||!h.userData.face) return; applyExpr(h,name); reactT=ms/1000; }
function applyExpr(g,name){ const F=g.userData.face; if(!F) return; g.userData.expr=name;
  const open=[true,true], eyeY=[1,1]; let mouth='smile', tongue=false, pupilY=0;
  if(name==='grin') mouth='grin';
  if(name==='joy'){ open[0]=open[1]=false; mouth='grin'; }
  if(name==='wink'){ open[0]=false; tongue=true; }
  if(name==='wow'){ mouth='o'; }
  if(name==='sleepy'){ open[0]=open[1]=false; mouth='flat'; }
  if(name==='cheeky'){ tongue=true; mouth='flat'; }
  if(name==='oops'){ open[0]=open[1]=false; mouth='o'; }
  if(name==='yawn'){ open[0]=open[1]=false; mouth='o'; }
  F.mouths.o.scale.set(1,1,1);
  F.eyes.forEach((e,i)=>{ e.visible=open[i]; e.userData.baseY=eyeY[i]; e.userData.baseS=name==='wow'?1.15:1; });
  // closed eyes: happy arcs, relaxed upside-down arcs when sleepy, or squeezed > < for a bump
  const squeeze=name==='oops', relaxed=name==='sleepy';
  F.arcs.forEach((a,i)=>{ a.visible=!open[i]&&!squeeze; a.rotation.z=relaxed?Math.PI:0; a.position.y=relaxed?.17:.13; });
  if(F.squints) F.squints.forEach(q=>q.visible=squeeze);
  F.pupils.forEach(p=>p.position.y=pupilY);
  for(const k in F.mouths) F.mouths[k].visible=(k===mouth);
  F.tongue.visible=tongue;
}
// frees an old worm segment: the head's face parts are its own, but its hat and extra share geometry with
// their cached protos, so they come off first
function dropSeg(sg){ const u=sg.userData; if(u.hatSlot) u.hatSlot.clear(); if(u.accSlot) u.accSlot.clear(); removeObj(sg); disposeTree(sg); }
function snapWorm(){
  act=null; segMeshes.forEach(dropSeg); segMeshes=[]; tailExtras=[];
  const n=state.segs.length;
  state.segs.forEach((p,i)=>{ const s=makeSeg(i); s.position.copy(wp(p[0],p[1],segY(i,n))); segMeshes.push(s); });
  if(n>1){ const a=state.segs[0], b=state.segs[1]; const dx=a[0]-b[0], dy=a[1]-b[1]; if(Math.abs(dx)+Math.abs(dy)===1) headDir=[dx,dy]; }
  segMeshes[0].rotation.y=Math.atan2(headDir[0],headDir[1]); wormG.visible=true; lookPhase='off';
}
let tailExtras=[];
