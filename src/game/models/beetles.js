// ---------- beetles: round, sturdy, a little grumpy about being pushed ----------
let beetleMeshes=[];
function makeBeetle(){ const g=new THREE.Group(), size=new THREE.Group(), inner=new THREE.Group(); size.scale.setScalar(1.15); g.add(size); size.add(inner); g.userData.inner=inner;
  // the solid body (shell, seam, spots, neck plate, head, horn) is one merged mesh plus its outline
  const body=new THREE.Group();
  const shell=new THREE.Mesh(sph(.28,28,20),m('beetle')); shell.scale.set(1,.76,1); shell.position.set(0,.19,-.05); outline(shell,.02); body.add(shell);
  // a darker rim where the shell meets the body, and the seam between the two wing covers
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.272,.026,8,32),m('beetleDark')); rim.rotation.x=Math.PI/2; rim.position.set(0,.12,-.05); body.add(rim);
  const seam=new THREE.Mesh(new THREE.TorusGeometry(.283,.012,6,28,Math.PI),m('beetleDark')); seam.rotation.y=Math.PI/2; seam.scale.set(1,.76,1); seam.position.set(0,.19,-.05); body.add(seam);
  // pale spots sitting on the shell surface
  const C0=new THREE.Vector3(0,.19,-.05);
  for(const sd of [-1,1]) for(const [a,e,r] of [[.55,.95,.055],[.95,.5,.045],[.3,.45,.04]]){ const dir=new THREE.Vector3(sd*Math.sin(a)*Math.cos(e),Math.sin(e),-Math.cos(a)*Math.cos(e)*.2-.25).normalize();
    const pos=new THREE.Vector3(dir.x*.28,dir.y*.28*.76,dir.z*.28).add(C0); const sp=new THREE.Mesh(sph(r,12,8),m('beetleSpot')); sp.scale.set(1,.3,1); sp.position.copy(pos);
    sp.lookAt(pos.clone().add(new THREE.Vector3(dir.x,dir.y/.76,dir.z))); sp.rotateX(Math.PI/2); body.add(sp); }
  const neck=new THREE.Mesh(sph(.17,20,14),m('beetleDark')); neck.scale.set(1.15,.72,.78); neck.position.set(0,.17,.22); outline(neck,.016); body.add(neck);
  const head=new THREE.Mesh(sph(.16,22,16),m('beetleHead')); head.position.set(0,.17,.37); outline(head,.016); body.add(head);
  // a little rhino horn: rises from the top of the head and curls forward, thinning to a rounded tip
  const hornPts=[]; for(let k=0;k<=8;k++){ const t=k/8, a=t*1.35; hornPts.push(new THREE.Vector3(0,.29+Math.sin(a)*.13,.33+(1-Math.cos(a))*.13)); }
  const hornPath=new THREE.CatmullRomCurve3(hornPts), hornG=new THREE.TubeGeometry(hornPath,12,.04,10,false), hp=hornG.attributes.position;
  // taper the tube toward the tip
  for(let k=0;k<hp.count;k++){ const ring=Math.floor(k/11), t=ring/12, c=hornPath.getPointAt(Math.min(1,t)); const f=1-t*.6; hp.setXYZ(k,c.x+(hp.getX(k)-c.x)*f,c.y+(hp.getY(k)-c.y)*f,c.z+(hp.getZ(k)-c.z)*f); }
  hornG.computeVertexNormals(); hornG.computeBoundingSphere(); const hc=hornG.boundingSphere.center.clone(); hornG.translate(-hc.x,-hc.y,-hc.z); // centred, so its outline scales in place
  const horn=new THREE.Mesh(hornG,m('beetleDark')); horn.position.copy(hc); outline(horn,.008); body.add(horn);
  const hb=new THREE.Mesh(sph(.045,12,8),m('beetleDark')); hb.position.copy(hornPts[0]); body.add(hb);
  const tip=new THREE.Mesh(sph(.018,8,6),m('beetleSpot')); tip.position.copy(hornPts[8]); body.add(tip);
  inner.add(merged(body,1));
  // a soft gloss on the shell
  const gloss=new THREE.Mesh(sph(.07,12,8),MC.beetleGloss||(MC.beetleGloss=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthWrite:false})));
  gloss.scale.set(1.3,.35,.8); gloss.position.set(-.1,.385,0); gloss.rotation.z=.35; inner.add(gloss);
  // the face, on the front of the head: big eyes that follow the worm, closed arcs for blinks and bumps
  const face=new THREE.Group(); face.position.set(0,.19,.49); inner.add(face); const F={eyes:[],pupils:[],arcs:[]}; g.userData.face=F;
  for(const sd of [-1,1]){ const e=new THREE.Mesh(sph(.058,14,10),m('eye')); e.position.set(sd*.062,.03,0); outline(e,.012); face.add(e);
    const pu=new THREE.Mesh(sph(.03,10,8),m('pupil')); pu.position.set(0,0,.042); e.add(pu); const hl=new THREE.Mesh(sph(.011,6,4),m('eye')); hl.position.set(.012,.012,.026); pu.add(hl);
    const arc=new THREE.Mesh(new THREE.TorusGeometry(.036,.009,6,12,Math.PI),m('pupil')); arc.position.set(sd*.062,.03,.04); arc.visible=false; face.add(arc);
    const ck=new THREE.Mesh(sph(.028,8,6),new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.55})); ck.position.set(sd*.1,-.04,.0); ck.scale.set(1,.55,.4); face.add(ck);
    F.eyes.push(e); F.pupils.push(pu); F.arcs.push(arc); }
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.022,.007,6,12,Math.PI),m('pupil')); smile.position.set(0,-.045,.05); smile.rotation.z=Math.PI; face.add(smile); F.smile=smile;
  const oo=new THREE.Mesh(new THREE.TorusGeometry(.016,.007,6,12),m('pupil')); oo.position.set(0,-.05,.05); oo.visible=false; face.add(oo); F.oo=oo;
  // antennae and six stubby legs, each on a pivot so they can wiggle
  const ants=[]; for(const sd of [-1,1]){ const a=new THREE.Group(); a.position.set(sd*.09,.27,.38); a.rotation.set(-.2,0,-sd*.75); inner.add(a);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.009,.011,.1,6),m('beetleLeg')); st.position.y=.05; a.add(st);
    const bl=new THREE.Mesh(sph(.022,8,6),m('beetleSpot')); bl.position.y=.105; outline(bl,.008); a.add(bl); ants.push(a); }
  g.userData.ants=ants;
  const legs=[]; for(const sd of [-1,1]) for(const z of [.15,-.02,-.19]){ const lg=new THREE.Group(); lg.position.set(sd*.21,.08,z); lg.rotation.z=sd*1.15; lg.rotation.y=sd*z*1.2; inner.add(lg);
    const l=new THREE.Mesh(new THREE.CylinderGeometry(.032,.028,.09,8),m('beetleLeg')); l.position.y=-.045; lg.add(l);
    const ft=new THREE.Mesh(sph(.036,10,8),m('beetleLeg')); ft.position.y=-.095; ft.scale.set(1,.65,1.25); lg.add(ft); lg.userData.sd=sd; legs.push(lg); }
  g.userData.legs=legs; g.userData.blink=2+Math.random()*3; g.userData.ph=Math.random()*6;
  g.traverse(o=>{ if(o.isMesh&&o.material!==lineMat&&o.material!==MC.beetleGloss) o.castShadow=true; });
  board.add(g); return g; }
function beetleFace(b,mode){ const F=b.userData.face; if(!F) return; b.userData.mood=mode;
  const shut=mode==='oof'||mode==='happy'; F.eyes.forEach(e=>e.visible=!shut); F.arcs.forEach(a=>{ a.visible=shut; a.rotation.z=mode==='happy'?0:Math.PI; });
  F.smile.visible=mode!=='oof'&&mode!=='wow'; F.oo.visible=mode==='oof'||mode==='wow'; }
// face the camera by default; once pushed, face back toward the worm that pushed it
function buildBeetles(){ beetleMeshes.forEach(g=>{ disposeTree(g); removeObj(g); }); beetleMeshes=(state.beetles||[]).map(b=>{ const g=makeBeetle(); g.position.copy(wp(b.x,b.y,0)); g.rotation.y=camYaw*Math.PI/180; beetleFace(g,'idle'); return g; }); }
// undo, restart and resume: put the beetles back where the state says, without rebuilding them
function snapBeetles(){ const bs=state.beetles||[]; if(beetleMeshes.length!==bs.length) return buildBeetles();
  bs.forEach((b,i)=>{ const g=beetleMeshes[i]; g.userData.moving=false; g.userData.scrabble=0; g.userData.inner.scale.set(1,1,1); g.position.copy(wp(b.x,b.y,0)); beetleFace(g,'idle'); }); }
// shoved along its path: it turns to face the worm, scrabbles backwards with its eyes squeezed shut, then looks up
function pushBeetle(p,dur){ const g=beetleMeshes[p.i]; if(!g) return; const pts=[p.from,...p.path].map(q=>wp(q[0],q[1],0));
  const dx=pts[1].x-pts[0].x, dz=pts[1].z-pts[0].z, face=Math.atan2(-dx,-dz); sfx('push'); dustPuff(pts[0]);
  if(reduceMotion){ g.position.copy(pts[pts.length-1]); g.rotation.y=face; return; }
  const n=pts.length-1, total=dur*(n>1?.6+n*.55:1), r0=g.rotation.y; let dr=face-r0; dr=((dr+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  g.userData.moving=true; beetleFace(g,'oof'); const inner=g.userData.inner;
  tween(total,(e,k)=>{ const f=Math.min(n-1e-6,k*n), j=Math.floor(f), t=f-j, a=pts[j], b=pts[j+1];
    g.position.lerpVectors(a,b,n>1?t:e); g.rotation.y=r0+dr*Math.min(1,k*3);
    const hop=n>1?Math.sin(k*Math.PI)*.05:Math.sin(t*Math.PI)*.07; g.position.y=hop;
    const sq=Math.sin(k*Math.PI); inner.scale.set(1+sq*.08,1-sq*.12,1+sq*.06); g.userData.scrabble=1; },
    ()=>{ g.position.copy(pts[n]); g.position.y=0; g.rotation.y=face; inner.scale.set(1,1,1); g.userData.moving=false; g.userData.scrabble=0;
      beetleFace(g,n>1?'wow':'idle'); g.userData.moodT=n>1?1.2:0; if(n>1) burst(pts[n],C.beetleSpot); dustPuff(pts[n]); }); }
// tried to push it into something: a little head shake
function beetleNope(i){ const g=beetleMeshes[i]; if(!g||reduceMotion) return; const r0=g.rotation.y; beetleFace(g,'oof'); g.userData.moodT=.6;
  tween(360,(e,k)=>{ g.rotation.y=r0+Math.sin(k*Math.PI*4)*.18*(1-k); },()=>{ g.rotation.y=r0; }); }
function updateBeetles(dt){ const sec=dt/1000, hp=segMeshes[0]&&segMeshes[0].position;
  beetleMeshes.forEach((g,i)=>{ const u=g.userData, F=u.face, t=idleT+u.ph;
    if(u.moodT>0){ u.moodT-=sec; if(u.moodT<=0) beetleFace(g,'idle'); }
    // sitting on a flower makes a beetle very content
    const b=state.beetles&&state.beetles[i]; if(b&&!u.moving&&u.mood==='idle'&&tileAt(state,b.x,b.y)==='B') beetleFace(g,'happy');
    if(b&&!u.moving&&u.mood==='happy'&&tileAt(state,b.x,b.y)!=='B') beetleFace(g,'idle');
    if(reduceMotion) return;
    u.inner.position.y=u.moving?0:Math.sin(t*2.1)*.008;
    u.ants.forEach((a,j)=>{ a.rotation.x=-.35+Math.sin(t*3+j)*.12; });
    u.legs.forEach((l,j)=>{ l.rotation.x=u.scrabble?Math.sin(idleT*40+j*2.1)*.6:Math.sin(t*1.3+j)*.05; });
    // eyes follow the worm's head, and blink now and then
    if(hp&&F){ const lp=g.worldToLocal(hp.clone()); const ax=Math.max(-.012,Math.min(.012,lp.x*.02)), ay=Math.max(-.01,Math.min(.01,(lp.y-.2)*.02)); F.pupils.forEach(p=>{ p.position.x=ax; p.position.y=ay; }); }
    u.blink-=sec; let bl=1; if(u.blink<0){ bl=Math.max(.1,Math.abs(u.blink+.07)/.07); if(u.blink<-.14) u.blink=2+Math.random()*3.5; }
    if(F) F.eyes.forEach(e=>e.scale.set(1,bl,1)); }); }
function buildSnails(){ snailMeshes.forEach(removeObj); snailMeshes=(state.snails||[]).map(n=>{ const s=makeSnail(); s.userData.inner.scale.setScalar(1); s.children[0].scale.setScalar(1.4); s.position.copy(wp(n.x,n.y,0)); s.rotation.y=snailYaw(n); return s; }); }
function syncSnails(animate,ev){ const ss=state.snails||[]; if(snailMeshes.length!==ss.length) return buildSnails();
  ss.forEach((n,i)=>{ const s=snailMeshes[i], to=wp(n.x,n.y,0), yaw=snailYaw(n);
    if(!animate||reduceMotion){ s.position.copy(to); s.rotation.y=yaw; return; }
    const from=s.position.clone(), r0=s.rotation.y; const turned=ev&&ev.snails&&ev.snails[i]&&ev.snails[i].turned;
    if(!turned){ trail(from,to); tween(260,(e,k)=>{ s.position.lerpVectors(from,to,e); s.userData.inner.scale.set(1.4,1.4*(1-Math.sin(k*Math.PI)*.08),1.4*(1+Math.sin(k*Math.PI)*.12)); },()=>s.userData.inner.scale.setScalar(1.4)); }
    else { sfx('snail'); let d=yaw-r0; d=((d+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; if(Math.abs(d)<.01) d=Math.PI;
      tween(380,(e,k)=>{ s.rotation.y=r0+d*e; s.userData.inner.position.y=Math.sin(k*Math.PI)*.05; },()=>{ s.rotation.y=yaw; s.userData.inner.position.y=0; }); } }); }
const slimeTex=canvasTex(128,32,c=>{
  const g=c.createLinearGradient(0,0,0,32); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.3,'rgba(235,248,255,.75)'); g.addColorStop(.5,'rgba(255,255,255,1)'); g.addColorStop(.7,'rgba(235,248,255,.75)'); g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g; c.beginPath(); c.roundRect?c.roundRect(2,0,124,32,16):c.rect(2,0,124,32); c.fill(); });
// where the strip crosses the gap between two tiles it thins to a strand and sags a little, instead of a flat bar floating over it
const slimeGap=s=>{ const d=Math.abs(s-.56)/.12; return d>=1?0:(1+Math.cos(d*Math.PI))/2; };
function trail(from,to){ if(reduceMotion) return; const dx=to.x-from.x, dz=to.z-from.z, len=Math.hypot(dx,dz)+.12;
  const mt=new THREE.MeshBasicMaterial({map:slimeTex,color:0xF2FAFF,transparent:true,opacity:.7,depthWrite:false});
  const t=new THREE.Group(); t.position.set(from.x-dx/Math.hypot(dx,dz)*.06,.012,from.z-dz/Math.hypot(dx,dz)*.06); t.rotation.y=Math.atan2(-dz,dx);
  const geo=new THREE.PlaneGeometry(1,.2,18,1).translate(.5,0,0), pa=geo.attributes.position;
  const strip=new THREE.Mesh(geo,mt); strip.rotation.x=-Math.PI/2; strip.scale.x=.01; t.add(strip); board.add(t);
  const done=kill(t);
  tween(260,e=>{ const L=Math.max(.01,e*len); strip.scale.x=L; for(let v=0;v<pa.count;v++){ const b=slimeGap(pa.getX(v)*L); pa.setY(v,(v<pa.count/2?.1:-.1)*(1-.65*b)); pa.setZ(v,-.02*b); } pa.needsUpdate=true; },
    ()=>tween(2600,(e,k)=>{ mt.opacity=.7*(1-k); },()=>{ mt.dispose(); geo.dispose(); done(); })); }
function dent(x,y){ const d=new THREE.Mesh(new THREE.CircleGeometry(.36,24),new THREE.MeshBasicMaterial({color:C.soilDark})); d.rotation.x=-Math.PI/2; d.position.copy(wp(x,y,-.215));
  // a few crumbs of the dry patch lie in the hollow it left
  for(let i=0;i<4;i++){ const a=i*1.7+x*.9+y*1.3, r=.07+(i%2)*.15, c=new THREE.Mesh(sph(.04+.012*(i%3),10,8),m('dry')); c.scale.z=.5; c.position.set(Math.cos(a)*r,Math.sin(a)*r,.012); d.add(c); }
  board.add(d); return d; }
function syncBoard(animate){
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){
    const cell=cells[y][x], ch=state.grid[y][x]; if(cell.ch===ch) continue;
    const old=cell.ch; cell.ch=ch;
    if(animate && '=|'.includes(old) && '=|'.includes(ch) && cell.tile && cell.tile.userData.bridge){ const br=cell.tile.userData.bridge, r0=br.rotation.y;
      tween(520,(e)=>{ br.rotation.y=r0+e*Math.PI/2; br.position.y=Math.sin(e*Math.PI)*.12; },()=>{ br.position.y=0; }); continue; }
    if(animate && old==='x' && ch===' '){ const t=cell.tile; cell.tile=dent(x,y); sfx('crumble'); dustPuff(wp(x,y,.05));
      tween(500,(e)=>{ t.position.y=-e*.32; t.scale.set(1-e*.25,1,1-e*.25); },kill(t)); continue; }
    if(animate && old==='C' && ch==='c'){ react('grin',800); { const bl=bloom(.01); cell.item.add(bl); tween(500,(e,k)=>{ const t=Math.min(1,k*1.2); bl.scale.setScalar(Math.max(.01,.9*(1+Math.sin(t*Math.PI)*.3)*t)); }); } cell.item.userData.flag.material=toon(C.flagDone,{side:THREE.DoubleSide}); sfx('flag');
      const it=cell.item; tween(380,(e,k)=>{ it.scale.setScalar(1+Math.sin(k*Math.PI)*.35); }); burst(wp(x,y,.6),C.flagDone); continue; }
    if(animate && cell.item && ch==='.'){ const it=cell.item; cell.item=null;
      if(old==='G'){ sfx('gate'); const door=it.userData.door; burst(it.position.clone().setY(.45),C.key);
        // the door flies open while the whole gate shrinks away: the worm crawls right through where it stood
        tween(400,(e,k)=>{ const sw=Math.min(1,k*2.4), sh=Math.min(1,Math.max(0,(k-.04)/.7)); door.rotation.y=-(1-(1-sw)*(1-sw))*1.9; it.scale.setScalar(Math.max(.01,1-sh*sh*(3-2*sh))); },kill(it)); }
      else { sfx(old==='+'?'grow':old==='-'?'shrink':'key'); react(old==='+'?'joy':old==='-'?'wow':'grin'); burst(it.position.clone().setY(.4), old==='+'?C.peach:old==='-'?C.cap:C.key);
        tween(240,(e)=>{ it.scale.setScalar(Math.max(.01,1+e*.5-e*1.4)); it.position.y=e*.35; },kill(it)); }
      continue; }
    removeObj(cell.tile); removeObj(cell.item);
    cell.tile = ch===' '?null:makeTile(x,y,ch); cell.item=makeItem(x,y,ch);
    const pops=[cell.tile,cell.item].filter(Boolean); pops.forEach(p=>p.scale.setScalar(.7));
    tween(220,(e)=>pops.forEach(p=>p.scale.setScalar(.7+.3*e)));
  }
}
// every sprite shares three's one quad; keep it when a patch's meshes are freed
const spriteGeo=new THREE.Sprite().geometry;
// a key's twinkles: a four-pointed star with a warm rim, so it reads against the gold key and the grass
const sparkTex=canvasTex(64,64,c=>{ c.translate(32,32);
  const star=(R,r)=>{ c.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4-Math.PI/2, d=i%2?r:R; c.lineTo(Math.cos(a)*d,Math.sin(a)*d); } c.closePath(); };
  star(29,7); c.fillStyle='#F2A93B'; c.fill(); star(22,4.5); c.fillStyle='#FFFDF2'; c.fill(); });
let fxTimer=0; const sparkMat=new THREE.SpriteMaterial({map:sparkTex,transparent:true,depthWrite:false});
function sparkle(p){ const s=new THREE.Sprite(sparkMat); s.position.set(p.x+(Math.random()-.5)*.45,.3+Math.random()*.45,p.z+(Math.random()-.5)*.45); s.scale.setScalar(.01); fx.add(s);
  const sz=.13+Math.random()*.07; tween(600,(e,k)=>{ s.scale.setScalar(Math.max(.01,sz*Math.sin(k*Math.PI))); },kill(s)); }
const ringGeo=new THREE.RingGeometry(.03,.05,20);
function splash(){ const spots=[]; for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const ch=state.grid[y][x]; if(ch!==' ') spots.push([x,y,ch]); }
  if(!spots.length) return; const s=spots[Math.floor(Math.random()*spots.length)]; const wet=s[2]==='~'||s[2]==='='||s[2]==='|'||s[2]==='w';
  const p=wp(s[0]+(Math.random()-.5)*.8,s[1]+(Math.random()-.5)*.8, s[2]==='~'?-.085:s[2]==='s'?-.2:.012);
  const mt=new THREE.MeshBasicMaterial({color:0xEAF6FF,transparent:true,opacity:.8,depthWrite:false}); const r=new THREE.Mesh(ringGeo,mt); r.rotation.x=-Math.PI/2; r.position.copy(p); fx.add(r);
  tween(450,(e,k)=>{ r.scale.setScalar(1+k*(wet?4:2.5)); mt.opacity=.8*(1-k); },kill(r)); }
function burst(pos,color){
  if(reduceMotion) return; const geo=sph(.05,10,8), mt=MC['burst'+color]||(MC['burst'+color]=toon(color)); // one cached material per colour
  for(let i=0;i<10;i++){ const p=new THREE.Mesh(geo,mt); p.position.copy(pos); fx.add(p);
    const a=i/10*Math.PI*2, v=new THREE.Vector3(Math.cos(a)*.035,.05+Math.random()*.03,Math.sin(a)*.035);
    tween(520,(e,k)=>{ p.position.add(v); v.y-=.006; p.scale.setScalar(Math.max(.01,1-k)); },kill(p)); }
}
function dustPuff(pos,col=0xE6D2A8){ if(reduceMotion) return; const mt=toon(col,{transparent:true,opacity:.9,depthWrite:false});
  for(let i=0;i<8;i++){ const p=new THREE.Mesh(sph(.09,12,8),mt), a=i/8*Math.PI*2+Math.random()*.5, s0=.75+Math.random()*.5; p.position.copy(pos); fx.add(p); const done=kill(p);
    tween(650,(e,k)=>{ const r=.16+e*.34; p.position.set(pos.x+Math.cos(a)*r,pos.y+Math.sin(Math.min(1,k*1.5)*Math.PI/2)*.2,pos.z+Math.sin(a)*r); p.scale.setScalar(s0*(.55+e*.85)); mt.opacity=.85*Math.min(1,(1-k)*2); },
      ()=>{ done(); if(i===7) mt.dispose(); }); } }

