// ---------- pollen and soft soil ----------
// Pollen flowers (P poppy, Y buttercup, U bluebell) are low cupped blooms with a fuzzy centre and motes above.
// Petal gates (p, y, u) are tall closed buds that fold down flat while the worm wears their colour or lies in them.
// The worm's body and head blend toward its pollen colour, with a few motes drifting round it.
const POLL={P:{n:'poppy',col:C.pollenP,light:C.pollenPLight,dark:C.pollenPDark},Y:{n:'buttercup',col:C.pollenY,light:C.pollenYLight,dark:C.pollenYDark},U:{n:'bluebell',col:C.pollenU,light:C.pollenULight,dark:C.pollenUDark}};
const polMat=(ch,k='col')=>MC['pol'+ch+k]||(MC['pol'+ch+k]=toon(POLL[ch][k]));
let polItems=[];
function makePollenFlower(g,ch,x,y){ const fl=new THREE.Group(); fl.position.y=.02; fl.rotation.y=(x*3+y*5)%6*.5; g.add(fl); g.userData.pollenFlower=fl;
  g.userData.pcol=ch;
  for(let i=0;i<3;i++){ const a=i/3*Math.PI*2+.5, lf=new THREE.Mesh(sph(.12,14,8),m('leaf')); lf.scale.set(1.7,.16,.6);
    lf.position.set(Math.cos(a)*.31,0,Math.sin(a)*.31); lf.rotation.y=-a; outline(lf,.01); fl.add(lf); }
  // six cupped petals, tips turned up, round a fuzzy dome dotted with darker stamens
  for(let i=0;i<6;i++){ const pv=new THREE.Group(); pv.rotation.y=-i/6*Math.PI*2; fl.add(pv);
    const pt=new THREE.Mesh(sph(.13,18,12),polMat(ch)); pt.scale.set(1.35,.32,.95); pt.position.set(.19,.08,0); pt.rotation.z=.42; pt.castShadow=true;
      outline(pt,.012); pv.add(pt); }
  const c=new THREE.Mesh(sph(.13,20,14),polMat(ch,'light')); c.scale.set(1,.62,1); c.position.y=.11; outline(c,.012); fl.add(c);
  for(let i=0;i<11;i++){ const a=i*2.4, r=i?.035+(i%3)*.027:0, d=new THREE.Mesh(sph(.02,8,6),polMat(ch,'dark'));
    d.position.set(Math.cos(a)*r,.11+.0806*Math.sqrt(Math.max(0,1-(r/.13)**2)),Math.sin(a)*r); fl.add(d); }
  const motes=[]; for(let i=0;i<4;i++){ const mo=new THREE.Mesh(sph(.026,8,6),polMat(ch,'light')); mo.userData.ph=i*1.6+x+y*.7; fl.add(mo); motes.push(mo); }
  polItems.push({motes,fl}); }
function makePetalGate(g,ch,x,y){ const P=ch.toUpperCase(), gt=new THREE.Group(); gt.rotation.y=(x+y)%2*.5; g.add(gt); g.userData.petalGate=gt;
  g.userData.pcol=P;
  // a ring of the colour on the grass, so even a folded gate says whose it is
  const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.43,36),polMat(P,'light')); ring.rotation.x=-Math.PI/2; ring.position.y=.006; ring.receiveShadow=true;
    gt.add(ring);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.07,20),m('leaf')); base.position.y=.035; outline(base,.012); gt.add(base);
  for(let i=0;i<6;i++){ const a=(i+.5)/6*Math.PI*2, se=new THREE.Mesh(sph(.08,10,8),m('leaf')); se.scale.set(1.5,.3,.7);
    se.position.set(Math.cos(a)*.26,.03,Math.sin(a)*.26); se.rotation.y=-a; gt.add(se); }
  const petals=[]; for(let i=0;i<6;i++){ const h=new THREE.Group(); h.rotation.y=-i/6*Math.PI*2; gt.add(h);
    const pv=new THREE.Group(); pv.position.set(.16,.05,0); h.add(pv);
    const pt=new THREE.Mesh(sph(.18,20,14),polMat(P)); pt.scale.set(.32,2.3,1.15); pt.castShadow=true; outline(pt,.012); pv.add(pt);
    const vein=new THREE.Mesh(sph(.18,12,10),polMat(P,'light')); vein.scale.set(.2,.8,.16); vein.position.x=-.14; pt.add(vein); petals.push(pv); }
  g.userData.petals=petals; setPetals(g.userData,0); }
// o: 0 is a closed bud (tips leaning in to meet), 1 is folded flat round the edge of the tile
function setPetals(u,o){ for(const pv of u.petals){ pv.rotation.z=.27+(-1.45-.27)*o; const pt=pv.children[0], sy=2.3-(2.3-.85)*o; pt.scale.y=sy;
  pt.position.y=.18*sy; } u.open=o; }
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
function softDome(){ const g=new THREE.SphereGeometry(.4,26,10,0,Math.PI*2,0,Math.PI/2), pa=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i); const a=Math.atan2(v.z,v.x), f=1+.07*Math.sin(5*a)+.04*Math.sin(9*a+1.3)+.05*Math.sin(v.y*30);
    pa.setXYZ(i,v.x*f,v.y,v.z*f); }
  g.computeVertexNormals(); return g; }
function makeSoftTile(g,x,y){ const top=new THREE.Mesh(TURF,(x+y)%2?m('turf1'):m('turf2')); top.position.y=-.15; top.receiveShadow=true; top.castShadow=true;
  outlineBox(top,.02,.94,.3,.94); g.add(top);
  // a low molehill of loose earth on the grass; it swells up while the worm burrows under it
  const md=new THREE.Group(); md.rotation.y=(x*7+y*3)%6; g.add(md); g.userData.mound=md;
  const dome=new THREE.Mesh(GC.softDome||(GC.softDome=softDome()),m('softSoil')); dome.castShadow=true; dome.receiveShadow=true; outline(dome,.012,.4);
    md.add(dome);
  for(let i=0;i<9;i++){ const a=i*2.4, r=i<3?.1+i*.04:.24+(i%3)*.05, c=new THREE.Mesh(sph(i%2?.045:.035,10,8),i%3?m('softClod'):m('softRidge'));
    c.position.set(Math.cos(a)*r,.0,Math.sin(a)*r); c.userData.r=r; c.scale.set(1,.65,.85); md.add(c); }
  g.userData.moundH=-1; setMound(g.userData,0); }
// v: 0 a flat molehill, 1 a heap with the worm under it (a little more for two passes), .45 a collar round the head
function setMound(u,v){ const md=u.mound, h=.17+.33*Math.min(1.25,v), w=.82+.18*Math.min(1,v); md.children[0].scale.set(w,h,w);
  for(const c of md.children.slice(1)){ const r=c.userData.r*w, k=Math.max(0,1-(r/.4)**2); c.position.y=.4*h*Math.sqrt(k)-.005; } u.moundV=v; }
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

