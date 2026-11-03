// ---------- pollen and soft soil ----------
// Pollen flowers (P poppy, Y buttercup, U bluebell) are low cupped blooms with a fuzzy centre and motes above.
// Petal gates (p, y, u) are tall closed buds that fold down flat while the worm wears their colour or lies in them.
// The worm's body and head blend toward its pollen colour, with a few motes drifting round it.
const POLL={P:{n:'poppy',col:C.pollenP,light:C.pollenPLight,dark:C.pollenPDark},Y:{n:'buttercup',col:C.pollenY,light:C.pollenYLight,dark:C.pollenYDark},U:{n:'bluebell',col:C.pollenU,light:C.pollenULight,dark:C.pollenUDark}};
const polMat=(ch,k='col')=>MC['pol'+ch+k]||(MC['pol'+ch+k]=toon(POLL[ch][k]));
let polItems=[];
// each colour has its own bloom, so they tell apart by shape too: poppy four wide petals round a dark seed head,
// buttercup five round glossy cups, bluebell six slim pointed petals in a star; gates bud and open the same way
const BLOOM={P:{n:4,w:1.35,l:1.2,cup:.36,gw:1.7,gh:2.15},Y:{n:5,w:1.12,l:1.12,cup:.55,gw:1.38,gh:2.2},U:{n:6,w:.64,l:1.42,cup:.45,gw:1.02,gh:2.45}};
// an inverted hull that is t thick on every axis of a squashed mesh (outline() scales it evenly, which is thin on a flat side)
function hullFit(mesh,t,r0){ if(!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere(); const r=r0||mesh.geometry.boundingSphere.radius, s=mesh.scale;
  const o=mesh.userData.hull||(mesh.userData.hull=new THREE.Mesh(mesh.geometry,lineMat)); o.scale.set(1+t/(r*s.x),1+t/(r*s.y),1+t/(r*s.z)); if(!o.parent) mesh.add(o); return o; }
const polGloss=()=>MC.polGloss||(MC.polGloss=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6,depthWrite:false}));
function makePollenFlower(g,ch,x,y){ const fl=new THREE.Group(); fl.position.y=.02; fl.rotation.y=(x*3+y*5)%6*.5; g.add(fl); g.userData.pollenFlower=fl;
  g.userData.pcol=ch; const B=BLOOM[ch], st=new THREE.Group();
  // three leaves with a paler midrib
  for(let i=0;i<3;i++){ const a=i/3*Math.PI*2+.5, lf=new THREE.Mesh(sph(.12,14,8),m('leaf')); lf.scale.set(1.7,.16,.62);
    lf.position.set(Math.cos(a)*.31,0,Math.sin(a)*.31); lf.rotation.y=-a; hullFit(lf,.011); st.add(lf);
    const rib=new THREE.Mesh(sph(.12,10,6),m('polRib')); rib.scale.set(1.25,.17,.08); rib.position.set(Math.cos(a)*.33,.006,Math.sin(a)*.33); rib.rotation.y=-a; st.add(rib); }
  // cupped petals, tips turned up, each with a paler heart
  for(let i=0;i<B.n;i++){ const pv=new THREE.Group(); pv.rotation.y=-i/B.n*Math.PI*2; st.add(pv);
    const pt=new THREE.Mesh(sph(.13,18,12),polMat(ch)); pt.scale.set(B.l,.3,B.w); pt.position.set(.075+.13*B.l*.85,.08,0); pt.rotation.z=B.cup; hullFit(pt,.012); pv.add(pt);
    const ht=new THREE.Mesh(sph(.13,12,8),polMat(ch,'light')); ht.scale.set(.5,.6,.55); ht.position.set(-.45*.13,.6*.13,0); pt.add(ht);
    const x0=.075+.13*B.l*.85, ex=x0+.13*B.l*Math.cos(B.cup)*.92, ey=.08+.13*B.l*Math.sin(B.cup)*.92;
    if(ch==='U'){ const tip=new THREE.Mesh(sph(.03,8,6),polMat(ch)); tip.scale.set(1.4,.6,.7); tip.position.set(ex-.01,ey,0); tip.rotation.z=B.cup+.25; pv.add(tip); }
    // buttercups shine: a gloss on each cup (kept out of the merge, it is see-through)
    if(ch==='Y'){ const gp=new THREE.Group(); gp.rotation.y=pv.rotation.y; fl.add(gp); const pp=new THREE.Group(); pp.position.copy(pt.position); pp.rotation.z=B.cup;
      pp.scale.copy(pt.scale); gp.add(pp); const gl=new THREE.Mesh(sph(.04,8,6),polGloss()); gl.position.set(.01,.131,0); gl.scale.set(.9,.5,.5); pp.add(gl); } }
  if(ch==='P'){ // a dark seed head with a ring of pale stamens and a starred cap
    const c=new THREE.Mesh(sph(.09,18,12),polMat(ch,'dark')); c.scale.set(1,.85,1); c.position.y=.13; outline(c,.012); st.add(c);
    const cap=new THREE.Mesh(sph(.06,14,8),polMat(ch,'light')); cap.scale.set(1,.3,1); cap.position.y=.2; st.add(cap);
    for(let i=0;i<12;i++){ const a=i/12*Math.PI*2, d=new THREE.Mesh(sph(.022,8,6),polMat(ch,'light')); d.position.set(Math.cos(a)*.115,.12,Math.sin(a)*.115); st.add(d); } }
  else { const r0=ch==='Y'?.12:.1, c=new THREE.Mesh(sph(r0,20,14),polMat(ch,'light')); c.scale.set(1,.62,1); c.position.y=.11; outline(c,.012); st.add(c);
    for(let i=0;i<11;i++){ const a=i*2.4, r=i?r0*(.27+(i%3)*.2):0, d=new THREE.Mesh(sph(.02,8,6),polMat(ch,'dark'));
      d.position.set(Math.cos(a)*r,.11+r0*.62*Math.sqrt(Math.max(0,1-(r/r0)**2)),Math.sin(a)*r); st.add(d); } }
  fl.add(merged(st,1));
  const motes=[]; for(let i=0;i<4;i++){ const mo=new THREE.Mesh(sph(.026,8,6),polMat(ch,'light')); mo.userData.ph=i*1.6+x+y*.7; fl.add(mo); motes.push(mo); }
  polItems.push({motes,fl}); }
function makePetalGate(g,ch,x,y){ const P=ch.toUpperCase(), B=BLOOM[P], gt=new THREE.Group(); gt.rotation.y=(x+y)%2*.5; g.add(gt); g.userData.petalGate=gt;
  g.userData.pcol=P;
  // a ring of the colour on the grass, so even a folded gate says whose it is, a leafy cushion and sepals (merged: they never move)
  const st=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.43,36),polMat(P,'light')); ring.rotation.x=-Math.PI/2; ring.position.y=.006; st.add(ring);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.07,20),m('leaf')); base.position.y=.035; outline(base,.012); st.add(base);
  const top=new THREE.Mesh(sph(.2,20,8),m('polRib')); top.scale.set(1,.2,1); top.position.y=.07; st.add(top);
  for(let i=0;i<6;i++){ const a=(i+.5)/6*Math.PI*2, se=new THREE.Mesh(sph(.08,10,8),m('leaf')); se.scale.set(1.5,.3,.7);
    se.position.set(Math.cos(a)*.26,.03,Math.sin(a)*.26); se.rotation.y=-a; hullFit(se,.009); st.add(se); }
  gt.add(merged(st,1));
  const petals=[]; for(let i=0;i<B.n;i++){ const h=new THREE.Group(); h.rotation.y=-i/B.n*Math.PI*2; gt.add(h);
    const pv=new THREE.Group(); pv.position.set(.15,.06,0); pv.userData.h=B.gh; h.add(pv);
    const pt=new THREE.Mesh(sph(.18,22,20),polMat(P)); pt.scale.set(.32,B.gh,B.gw); pt.castShadow=true; pv.add(pt);
    // its inner face carries a pale oval, a thin lens laid on the surface (seen when it opens)
    const vein=new THREE.Mesh(sph(.18,22,20),polMat(P,'light')); vein.scale.set(.12,.72,.62); vein.position.x=-.172; pt.add(vein); pt.userData.vein=vein; petals.push(pv); }
  g.userData.petals=petals; setPetals(g.userData,0); }
// o: 0 is a closed bud (tips leaning in to meet), 1 is folded flat round the edge of the tile
function setPetals(u,o){ for(const pv of u.petals){ const H=pv.userData.h||2.3; pv.rotation.z=.27+(-1.45-.27)*o; const pt=pv.children[0], sy=H-(H-.85)*o; pt.scale.y=sy;
  pt.position.y=.18*sy; hullFit(pt,.012); pt.userData.vein.visible=o>.3; } u.open=o; }
function syncPetals(animate){ if(!state) return; let opened=false, closed=false;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const it=cells[y]&&cells[y][x]&&cells[y][x].item; if(!it||!it.userData.petalGate) continue;
    const u=it.userData;
    const want=state.pollen===u.pcol||occupied(x,y)?1:0; if(u.want===want) continue; const first=u.want===undefined; u.want=want;
    if(animate&&!first){ const o0=u.open; if(want){ opened=true; burst(wp(x,y,.5),POLL[u.pcol].light); } else closed=true;
      // opening overshoots a little, like a bloom springing open
      tween(want?460:300,(e,k)=>setPetals(u,o0+(want-o0)*(want?Math.min(1.08,e*1.08)-Math.max(0,e-.92):e))); }
    else setPetals(u,want); }
  if(opened) sfx('bloom'); else if(closed) sfx('bud'); }
function petalsNope(x,y){ const it=cells[y]&&cells[y][x]&&cells[y][x].item; if(!it||!it.userData.petalGate||reduceMotion) return;
  const gt=it.userData.petalGate, r0=gt.rotation.y;
  tween(320,(e,k)=>{ gt.rotation.y=r0+Math.sin(k*Math.PI*4)*.12*(1-k); },()=>{ gt.rotation.y=r0; }); }
// soft soil: a tilled bed (raised like grass, so it reads as somewhere to go) with a heap that rises while the worm is under it
// the heap's outline wobbles gently all round (a lumpy molehill, not a cog), and its top leans a little to one side
const softWob=a=>1+.06*Math.sin(4*a+.4)+.035*Math.sin(7*a+1.3);
function softDome(){ const g=new THREE.SphereGeometry(.4,32,12,0,Math.PI*2,0,Math.PI/2), pa=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i); const a=Math.atan2(v.z,v.x), f=softWob(a), up=v.y/.4;
    pa.setXYZ(i,v.x*f,v.y*(1+.09*Math.sin(3*a+.8)*Math.sin(up*Math.PI)),v.z*f); }
  g.computeVertexNormals(); return g; }
function makeSoftTile(g,x,y){ const top=new THREE.Mesh(TURF,(x+y)%2?m('turf1'):m('turf2')); top.position.y=-.15; top.receiveShadow=true; top.castShadow=true;
  outlineBox(top,.02,.94,.3,.94); g.add(top);
  // a low molehill of loose earth on the grass; it swells up while the worm burrows under it
  const md=new THREE.Group(); md.rotation.y=(x*7+y*3)%6; g.add(md); g.userData.mound=md;
  const dome=new THREE.Mesh(GC.softDome||(GC.softDome=softDome()),m('softSoil')); dome.castShadow=true; dome.receiveShadow=true; md.add(dome); md.userData.dome=dome;
  // clods riding on the heap (they keep their shape as it swells), in three earth tones
  const clods=[]; for(let i=0;i<12;i++){ const a=i*2.4+.3, r=i<4?.05+i*.05:.2+(i%3)*.05, big=i%4===1;
    const c=new THREE.Mesh(sph(big?.055:i%2?.045:.036,10,8),i%3===0?m('softRidge'):i%3===1?m('softClod'):m('softCrumb'));
    c.userData.r=r; c.userData.a=a; c.scale.set(1,.62,.85); c.rotation.y=-a; if(big) outline(c,.01); md.add(c); clods.push(c); }
  md.userData.clods=clods;
  // loose crumbs spilled on the grass round its foot (they never move, so they are one merged mesh)
  const sp=new THREE.Group(); for(let i=0;i<9;i++){ const a=i/9*Math.PI*2+(i%2)*.3, r=.37+(i%3)*.03;
    const c=new THREE.Mesh(sph(i%3?.032:.042,8,6),i%2?m('softCrumb'):m('softSoil')); c.position.set(Math.cos(a)*r*softWob(a),.004,Math.sin(a)*r*softWob(a));
    c.scale.set(1,.5,.8); c.rotation.y=-a; outline(c,.008); sp.add(c); }
  md.add(merged(sp,1));
  g.userData.moundH=-1; setMound(g.userData,0); }
// v: 0 a flat molehill, 1 a heap with the worm under it (a little more for two passes), .45 a collar round the head
function setMound(u,v){ const md=u.mound, h=.25+.27*Math.min(1.25,v), w=.84+.16*Math.min(1,v), dome=md.userData.dome; dome.scale.set(w,h,w);
  hullFit(dome,.012,.4);
  for(const c of md.userData.clods){ const a=c.userData.a, r=c.userData.r*w, R=.4*w*softWob(a), k=Math.max(0,1-(r/R)**2), up=Math.sqrt(k);
    c.position.set(Math.cos(a)*r,.4*h*up*(1+.09*Math.sin(3*a+.8)*Math.sin(up*Math.PI))-.008,Math.sin(a)*r); } u.moundV=v; }
// how deep an anchor at world position v sits under soft soil: 1 in the middle of a soft tile, easing to 0 at its edge
function soilDepth(v){ const gx=v.x+(state.w-1)/2, gy=v.z+(state.h-1)/2, x=Math.round(gx), y=Math.round(gy);
  if(tileAt(state,x,y)!==SOFT) return 0; const d=Math.max(Math.abs(gx-x),Math.abs(gy-y)); return 1-Math.min(1,Math.max(0,(d-.12)/.42)); }
function syncSoil(animate){ if(!state) return;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const t=cells[y]&&cells[y][x]&&cells[y][x].tile; if(!t||!t.userData.mound) continue;
    const u=t.userData;
    let n=0, head=false; state.segs.forEach((p,i)=>{ if(p[0]===x&&p[1]===y){ if(i) n++; else head=true; } });
    const want=n?(n>1?1.25:1):head?.45:0; if(u.moundH===want) continue; u.moundH=want; const v0=u.moundV;
    if(animate) tween(260,e=>setMound(u,v0+(want-v0)*e)); else setMound(u,want); } }
// the worm's pollen: its colour eases in, and a few motes drift round the body while it carries some
const DUST_K=.78, dustCol=new THREE.Color(), dustTarget=new THREE.Color(); let dustAmt=0, dustG=null;
MC.gameHead=toon(C.head);
const dusty=c=>dustAmt>.002?c.lerp(dustCol,DUST_K*dustAmt):c;
function snapPollen(){ const p=state&&POLL[state.pollen]; dustAmt=p?1:0; if(p) dustCol.setHex(p.col); }
function pollenPuff(pos,ch){ if(reduceMotion) return; const mt=polMat(ch,'light');
  for(let i=0;i<14;i++){ const p=new THREE.Mesh(sph(.03,8,6),mt), a=Math.random()*Math.PI*2, r=.25+Math.random()*.35, up=.25+Math.random()*.35;
    p.position.copy(pos); fx.add(p);
    tween(700+i*15,(e,k)=>{ p.position.set(pos.x+Math.cos(a)*r*e,pos.y+Math.sin(k*Math.PI)*up,pos.z+Math.sin(a)*r*e); p.scale.setScalar(Math.max(.01,1.4*(1-k*k))); },kill(p));
      } }
function updatePollen(dt){ if(!state) return; const sec=dt/1000, k=1-Math.exp(-sec*5), p=POLL[state.pollen];
  if(p){ dustTarget.setHex(p.col); if(dustAmt<.02) dustCol.copy(dustTarget); else dustCol.lerp(dustTarget,k); }
  dustAmt+=((p?1:0)-dustAmt)*k; MC.gameHead.color.copy(m('head').color).lerp(dustCol,DUST_K*dustAmt);
  if(!dustG){ dustG=new THREE.Group(); wormG.add(dustG); const mt=MC.dustMote=new THREE.MeshBasicMaterial({color:0xffffff});
    for(let i=0;i<7;i++){ const mo=new THREE.Mesh(sph(.028,8,6),mt); mo.userData.ph=i*.9; dustG.add(mo); } }
  dustG.visible=dustAmt>.03&&!reduceMotion; if(dustG.visible){ MC.dustMote.color.copy(dustCol).lerp(WHITE,.4); const n=segMeshes.length;
    dustG.children.forEach((mo,i)=>{ const s=segMeshes[Math.min(n-1,Math.floor(i*n/7))]; if(!s){ mo.visible=false; return; } const ph=mo.userData.ph+idleT*1.3;
      mo.visible=soilDepth(s.position)<.3;
        mo.position.set(s.position.x+Math.cos(ph*1.7)*.24,s.position.y+.18+Math.sin(ph*2.3)*.1,s.position.z+Math.sin(ph*1.7)*.24);
        mo.scale.setScalar(dustAmt*(.7+.3*Math.sin(ph*3))); }); }
  for(const it of polItems) it.motes.forEach((mo,i)=>{ const ph=mo.userData.ph+idleT*.9; mo.position.set(Math.cos(ph)*.13,.3+.08*Math.sin(ph*1.7+i)+i*.03,Math.sin(ph)*.13); });
    }

