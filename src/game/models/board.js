// ---------- tiles and items ----------
const flowTex=canvasTex(64,64,g=>{ g.fillStyle='#fff'; g.fillRect(0,0,64,64);
  g.strokeStyle='rgba(255,255,255,1)'; g.fillStyle='rgba(120,190,220,.18)'; for(let i=0;i<3;i++){ g.fillRect(0,i*21+8,64,2); }
  g.strokeStyle='rgba(255,255,255,.95)'; g.lineWidth=2.5; g.lineCap='round'; for(let i=0;i<5;i++){ const y=Math.random()*64,x=Math.random()*64; g.beginPath();
    g.moveTo(x,y); g.quadraticCurveTo(x+6,y-3,x+12,y); g.stroke(); } },1);
flowTex.anisotropy=turfTex.anisotropy; const flowH=flowTex, flowV=flowTex.clone(); flowV.needsUpdate=true; flowV.center.set(.5,.5); flowV.rotation=Math.PI/2;
const waterMatH=toon(C.riverWater,{map:flowH}), waterMatV=toon(C.riverWater,{map:flowV});
const WATER=new THREE.BoxGeometry(1,.1,1);
// the burrow's tile: a grass slab with a round hole through it, and the shaft below
const BURROW_R=.25, TURF_HOLE=(()=>{ const b=.08, sh=rrShape(.94-2*b,.94-2*b,.16), hp=new THREE.Path(); hp.absarc(0,0,BURROW_R+b,0,Math.PI*2,true);
  sh.holes.push(hp); const g=new THREE.ExtrudeGeometry(sh,{depth:.3-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:5,curveSegments:24});
  g.rotateX(-Math.PI/2); g.center(); g.computeVertexNormals(); return g; })();
const WELL=new THREE.CylinderGeometry(BURROW_R+.004,BURROW_R-.03,.26,28,4,true), WELL_FLOOR=new THREE.CircleGeometry(BURROW_R,28);
// the shaft fades from earth at the lip to black at the bottom, so it reads as deep from any angle
{ const pa=WELL.attributes.position, top=new THREE.Color(C.burrowWall), bot=new THREE.Color(C.burrow), c=new THREE.Color(), col=[];
  for(let i=0;i<pa.count;i++){ const k=Math.pow((pa.getY(i)+.13)/.26,1.6); c.copy(bot).lerp(top,k); col.push(c.r,c.g,c.b); }
  WELL.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); }
// a dry patch's cracks: a network of dark splits between plates, each plate lit along its upper edge
const dryTex=canvasTex(256,256,g=>{ const L=[[[28,80],[92,116],[120,184],[200,220]],[[92,116],[168,80],[224,40]],[[120,184],[52,220]],[[168,80],[192,144],[240,164]],
    [[192,144],[120,184]],[[92,116],[72,40]],[[52,220],[30,170],[28,80]]];
  const path=o=>{ g.beginPath(); for(const l of L){ g.moveTo(l[0][0]+o,l[0][1]+o); for(const p of l.slice(1)) g.lineTo(p[0]+o,p[1]+o); } };
  g.lineCap='round'; g.lineJoin='round';
  path(-3); g.strokeStyle='rgba(255,247,222,.75)'; g.lineWidth=5; g.stroke();
  path(0); g.strokeStyle='rgba(150,104,62,.95)'; g.lineWidth=10; g.stroke();
  path(1); g.strokeStyle='rgba(98,64,40,.95)'; g.lineWidth=4; g.stroke(); });
const DRY_DEC=new THREE.PlaneGeometry(.8,.8); dryTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
// a big leaf lying flat (wet leaves, grown seedlings): rounded at the stalk end (-x), pointed at the tip, its rim curling up a little
function leafPadGeo(){ if(GC.leafPad) return GC.leafPad; const g=new THREE.SphereGeometry(.45,40,14), pa=g.attributes.position;
  for(let i=0;i<pa.count;i++){ const x=pa.getX(i), t=x/.45, z=pa.getZ(i)*(1-.5*Math.pow(Math.max(0,t),1.3))*.94, e=z/.42;
    pa.setXYZ(i,x+.02,pa.getY(i)*.075+.05*e*e+.03*Math.max(0,t)*Math.max(0,t),z); }
  g.computeVertexNormals(); return GC.leafPad=g; }
// a midrib from the stalk to the tip and side veins sweeping forward, laid on that leaf
function leafVeins(leaf,mt,y){ const rib=new THREE.Mesh(VEIN,mt); rib.scale.set(.74,1,1.3); rib.position.set(.02,y,0); leaf.add(rib);
  for(const sd of [-1,1]) for(const [t,l] of [[-.2,.26],[0,.24],[.18,.17]]){ const v=new THREE.Mesh(VEIN,mt); v.scale.set(l,1,.85);
    v.position.set(t+l*.4,y+.004,sd*l*.32); v.rotation.y=-sd*.62; leaf.add(v); }
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.018,.026,.1,8),mt); st.rotation.z=Math.PI/2; st.position.set(-.39,y-.008,0); leaf.add(st); }
const VEIN=new THREE.BoxGeometry(1,.012,.024);
function riverAt(x,y){ const c=tileAt(state,x,y); return c==='~'||c==='='||c==='|'; }
const glintMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:.9}), glintGeo=new THREE.CircleGeometry(.05,12), rippleGeo=new THREE.RingGeometry(.1,.13,28);
let flowTiles=[];
function waterTile(g,x,y){ const horiz=riverAt(x-1,y)||riverAt(x+1,y); const vert=riverAt(x,y-1)||riverAt(x,y+1);
  const w=new THREE.Mesh(WATER, (vert&&!horiz)?waterMatV:waterMatH); w.position.y=-.19; w.receiveShadow=true; g.add(w);
  // little things on the current: a leaf drifting downstream on some tiles, glints twinkling on all of them
  const along=vert&&!horiz?'z':'x', f={w,along,ph:(x*1.7+y*2.9)%6.28,glints:[],leaf:null};
  if((x*7+y*13)%3===0){ const leaf=new THREE.Group(); leaf.position.y=-.125; g.add(leaf); f.leaf=leaf;
    const pad=new THREE.Mesh(sph(.1,14,8),m('leaf')); pad.scale.set(1.3,.2,.75); pad.castShadow=true; outline(pad,.012); leaf.add(pad);
    const vein=new THREE.Mesh(new THREE.BoxGeometry(.2,.01,.012),m('leafRib')); vein.position.y=.022; leaf.add(vein); }
  f.rippleMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0,depthWrite:false});
  f.ripple=new THREE.Mesh(rippleGeo,f.rippleMat); f.ripple.rotation.x=-Math.PI/2; f.ripple.position.y=-.13; g.add(f.ripple);
  for(let i=0;i<2;i++){ const gl=new THREE.Mesh(glintGeo,glintMat); gl.rotation.x=-Math.PI/2; gl.position.set((i-.5)*.36,-.132,((x+y+i)%3-1)*.22);
    gl.scale.set(1,.45,1); gl.userData.ph=f.ph+i*2.1; g.add(gl); f.glints.push(gl); }
  flowTiles.push(f);
  for(let i=0;i<2;i++){ const st=new THREE.Mesh(sph(.05+Math.random()*.03,12,8),m('stone')); st.scale.y=.5;
    const sx=(Math.random()<.5?-1:1)*.42, sz=(Math.random()-.5)*.8; st.position.set(vert&&!horiz?sx:sz,-.14,vert&&!horiz?sz:sx); g.add(st); } }
function makeBridge(ch){ const br=new THREE.Group(); const wm=m('plank'), dm=m('plankDark');
  for(let i=0;i<5;i++){ const p=new THREE.Mesh(new THREE.BoxGeometry(.17,.07,.8),i%2?wm:dm); p.position.set(-.4+i*.2,-.03,0); p.castShadow=true;
    p.receiveShadow=true; outlineBox(p,.012,.17,.07,.8); br.add(p); }
  for(const z of [-.3,.3]){ const s=new THREE.Mesh(new THREE.BoxGeometry(1.06,.06,.08),dm); s.position.set(0,-.09,z); br.add(s); }
  for(const z of [-.42,.42]){ for(const x of [-.46,.46]){ mk(new THREE.CylinderGeometry(.035,.04,.34,10),dm,br,[x,.1,z],.012); }
    mk(new THREE.BoxGeometry(.96,.05,.06),wm,br,[0,.24,z],.012); }
  br.rotation.y = ch==='|'?Math.PI/2:0; return br; }
function makeTile(x,y,ch){
  const g=new THREE.Group(); const dry=ch==='x';
  if(ch===SOFT){ makeSoftTile(g,x,y); g.position.copy(wp(x,y)); board.add(g); return g; }
  if(ch===DIG){ makeDirtTile(g,x,y); g.position.copy(wp(x,y)); board.add(g); return g; }
  if(ch==='~'||ch==='='||ch==='|'){ waterTile(g,x,y); if(ch!=='~'){ const br=makeBridge(ch); g.add(br); g.userData.bridge=br; } g.userData.river=true;
    g.position.copy(wp(x,y)); board.add(g); return g; }
  if(ch==='i'){ // a big wet leaf lying on the grass: slippery
    const top=new THREE.Mesh(TURF,m('turf2')); top.position.y=-.15; top.receiveShadow=true; outlineBox(top,.02,.94,.3,.94); g.add(top);
    const leaf=new THREE.Group(); leaf.position.y=.01; leaf.rotation.y=(x*5+y*3)%4*.35; g.add(leaf);
    const pad=new THREE.Mesh(leafPadGeo(),m('wetLeaf')); pad.receiveShadow=true; pad.castShadow=true; outline(pad,.018); leaf.add(pad);
    leafVeins(leaf,m('leafVein'),.034);
    const shine=new THREE.Mesh(new THREE.CircleGeometry(.2,20),MC.leafShine||(MC.leafShine=new THREE.MeshBasicMaterial({color:C.glint,transparent:true,opacity:.35,depthWrite:false})));
      shine.rotation.x=-Math.PI/2; shine.scale.set(1.3,.35,1); shine.position.set(-.08,.04,-.13); leaf.add(shine);
    for(let i=0;i<3;i++){ const dw=new THREE.Mesh(sph(.035,10,8),m('dew')); dw.scale.y=.6; dw.position.set(Math.cos(i*2.3+x)*.22,.045,Math.sin(i*2.3+y)*.2);
      leaf.add(dw); }
    g.userData.wetLeaf=leaf; g.position.copy(wp(x,y)); board.add(g); return g; }
  if(ch==='s'){ // a seedling in the soil; rain grows it into a big leaf you can crawl on
    // a little heap of fresh earth with a seedling in it: two round seed leaves and a curled bud, kept low enough to hide under the grown leaf
    const sp=new THREE.Group(); sp.position.y=-.22; sp.rotation.y=(x*3+y*7)%5*.6; g.add(sp); g.userData.sprout=sp;
    const heap=mk(sph(.17,18,10),m('soilDark'),sp,[0,0,0],.014); heap.scale.set(1,.3,.9); heap.receiveShadow=true;
    mk(new THREE.CylinderGeometry(.016,.024,.13,8),m('leaf'),sp,[0,.065,0],.01);
    for(const sd of [-1,1]){ const lg=new THREE.Group(); lg.position.y=.125; lg.rotation.set(0,sd>0?0:Math.PI,.2); sp.add(lg);
      mk(leafletGeo(),m('leafBig'),lg,[.1,0,0],.012).scale.setScalar(1.2); }
    const bud=mk(sph(.035,12,8),m('leaf'),sp,[0,.15,0],.01); bud.scale.set(.8,1.2,.8);
    const leaf=new THREE.Group(); const lm=m('leafBig');
    const pad=new THREE.Mesh(leafPadGeo(),lm); pad.scale.set(1.04,1.6,1.04); pad.castShadow=true; pad.receiveShadow=true; outline(pad,.02); leaf.add(pad);
    leafVeins(leaf,m('leafBigRib'),.052);
    leaf.position.y=-.03; leaf.rotation.y=(x*7+y*3)%4*.4; leaf.scale.setScalar(.01); leaf.visible=false; g.add(leaf); g.userData.leaf=leaf;
    g.position.copy(wp(x,y)); board.add(g); return g; }
  const holed=ch==='E'||(ch>='1'&&ch<='9')||MOLE[ch];
  const top=new THREE.Mesh(holed?TURF_HOLE:TURF, dry?m('dry'):((x+y)%2?m('turf1'):m('turf2')));
  top.position.y=-.15; top.receiveShadow=true; top.castShadow=true; outlineBox(top,.02,.94,.3,.94); g.add(top);
  if(holed){ // the burrow and tunnels go down into the dark: an earthy shaft with a black floor, so the worm really crawls in
    const wall=new THREE.Mesh(WELL,MC.burrowWall||(MC.burrowWall=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide}))); wall.position.y=-.13; wall.receiveShadow=true;
      g.add(wall);
    const floor=new THREE.Mesh(WELL_FLOOR,MC.burrowFloor||(MC.burrowFloor=new THREE.MeshBasicMaterial({color:C.burrow}))); floor.rotation.x=-Math.PI/2;
      floor.position.y=-.255; g.add(floor); }
  if(dry){ // baked earth split into plates, a few flakes curling up at the cracks
    const dec=new THREE.Mesh(DRY_DEC,MC.dryDecal||(MC.dryDecal=new THREE.MeshBasicMaterial({map:dryTex,transparent:true,depthWrite:false})));
    dec.rotation.x=-Math.PI/2; dec.rotation.z=(x*3+y*5)%4*Math.PI/2; dec.position.y=.004; g.add(dec);
    for(let i=0;i<3;i++){ const a=i*2.2+x*1.3+y*.7, r=.18+(i%2)*.14, fl=new THREE.Mesh(sph(.06,12,8),m('dry')); fl.scale.set(1,.16,.7);
      fl.position.set(Math.cos(a)*r,.012,Math.sin(a)*r); fl.rotation.set(.35,a,.25); fl.castShadow=true; outline(fl,.01); g.add(fl); } }
  if(ch==='w'){ // a dip that fills with water when it rains
    const mud=new THREE.Mesh(new THREE.CircleGeometry(.37,32),m('mud')); mud.rotation.x=-Math.PI/2; mud.position.y=.004; mud.receiveShadow=true; g.add(mud);
    // a ring of pebbles round the dip, so it reads as a hollow even while it's dry
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+(x+y)*.5, p=new THREE.Mesh(sph(i%3?.045:.06,12,8),i%2?m('stone'):m('stoneDark'));
      p.position.set(Math.cos(a)*.38,.012,Math.sin(a)*.38); p.scale.set(1,.5,.8); p.rotation.y=a; p.castShadow=true; outline(p,.01); g.add(p); }
    const water=new THREE.Group(); water.position.y=.012; g.add(water);
    const wm=new THREE.Mesh(new THREE.CircleGeometry(.4,32),new THREE.MeshBasicMaterial({color:C.water,transparent:true,opacity:.92}));
      wm.rotation.x=-Math.PI/2; water.add(wm);
    const shine=new THREE.Mesh(new THREE.RingGeometry(.2,.25,24,1,0.4,1.2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7}));
      shine.rotation.x=-Math.PI/2; shine.position.y=.003; water.add(shine);
    water.scale.setScalar(.01); water.visible=false; g.userData.water=water; }
  g.position.copy(wp(x,y)); board.add(g); return g;
}
function numberTex(n){ return canvasTex(128,128,g=>{
  g.fillStyle='#FFF8EA'; g.beginPath(); g.arc(64,64,52,0,Math.PI*2); g.fill(); g.lineWidth=7; g.strokeStyle='#5B4436'; g.stroke();
  g.fillStyle='#5B4436'; g.font='800 70px "Baloo 2", sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(n),64,70);
  }); }
function faceCamera(o){ const yaw=(typeof camYaw==='number'?camYaw:0)*Math.PI/180;
  if(o.userData.faceCam){ o.rotation.y=yaw; if(o.userData.lean){ o.rotation.order='YXZ'; o.rotation.x=o.userData.lean; } }
  if(o.userData.signs) o.userData.signs.forEach(s=>{ s.rotation.y=yaw-o.rotation.y; s.position.set(-Math.sin(yaw)*.36+Math.cos(yaw)*.26,0,-Math.cos(yaw)*.36-Math.sin(yaw)*.26); });
    }
// the soil heaped around a tunnel: a low torus whose thickness wobbles, so it reads as dug-up earth
function lumpyTorus(R,r,seed,amp=1){ const g=new THREE.TorusGeometry(R,r,10,44), pa=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i); const u=Math.atan2(v.y,v.x), cx=Math.cos(u)*R, cy=Math.sin(u)*R;
    const f=1+amp*(.1*Math.sin(5*u+seed)+.05*Math.sin(11*u+seed*1.7)); pa.setXYZ(i,cx+(v.x-cx)*f,cy+(v.y-cy)*f,v.z*f*.8); }
  g.computeVertexNormals(); return g; }
function moundGeo(seed){ const g=lumpyTorus(.32,.095,seed); g.rotateX(-Math.PI/2); g.computeVertexNormals(); return g; }
// a mushroom cap as one closed shape (dome, rolled rim, shallow underside), so its outline hugs it and it casts a solid shadow
// (an open half sphere let the light through its open side and drew a thin crescent of shadow on the grass)
function capGeo(R,H){ const k='cap_'+R+'_'+H; if(GC[k]) return GC[k]; const p=[[0,.04],[R*.5,.034],[R*.82,.016],[R*.95,.008],[R*1.01,.022]];
  for(let i=0;i<=14;i++){ const a=i/14*Math.PI/2; p.push([Math.max(.0001,R*1.03*Math.cos(a)),.045+(H-.045)*Math.sin(a)]); }
  return GC[k]=new THREE.LatheGeometry(p.map(q=>new THREE.Vector2(q[0],q[1])),36); }
// a point on that cap's dome, el from the top (0) to the rim (pi/2), lifted off the surface by `up`
const capPt=(R,H,az,el,up=0)=>new THREE.Vector3(Math.cos(az)*Math.sin(el)*(R*1.03+up),.045+(H-.045+up)*Math.cos(el),Math.sin(az)*Math.sin(el)*(R*1.03+up));
// a peach: a round fruit with a dimple where the stalk sits and a soft crease down its front
function peachGeo(){ if(GC.peach) return GC.peach; const g=new THREE.SphereGeometry(.2,40,28), pa=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i); const r=v.length(), w=Math.min(1,Math.max(0,(v.z+.1)/.14));
    const crease=.026*Math.exp(-(v.x*v.x)/(.032*.032))*w*(.35+.65*(v.y+.2)/.4); v.multiplyScalar((r-crease)/r);
    if(v.y>0) v.y-=.05*Math.exp(-(v.x*v.x+v.z*v.z)/(.075*.075)); v.y*=.94; pa.setXYZ(i,v.x,v.y,v.z); }
  g.computeVertexNormals(); return GC.peach=g; }
// a leaf blade: rounded at the stalk, pointed at the tip (+x), with its edges curling up a little
function leafletGeo(){ if(GC.leaflet) return GC.leaflet; const g=new THREE.SphereGeometry(.1,20,10), pa=g.attributes.position;
  for(let i=0;i<pa.count;i++){ const x=pa.getX(i), t=x/.1, z=pa.getZ(i);
    const zz=z*(1-.45*Math.max(0,t))*.6; pa.setXYZ(i,x*1.15,pa.getY(i)*.22+zz*zz*2.2+.012*t*t,zz); }
  g.computeVertexNormals(); return GC.leaflet=g; }
function mk(geo,mt,parent,pos,ol=.022){ const o=new THREE.Mesh(geo,mt); if(pos) o.position.set(...pos); o.castShadow=true; if(ol) outline(o,ol); parent.add(o);
  return o; }
function makeItem(x,y,ch){
  const g=new THREE.Group(); g.position.copy(wp(x,y)); g.userData.kind=ch;
  if(ch==='+'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b;
    const f=mk(peachGeo(),m('peach'),b,[0,.3,0],.022); f.rotation.y=.5;
    // a curved woody stalk out of the dimple, and a pointed leaf with a darker rib
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.016,.022,.1,8),m('stalk')); st.position.set(0,.49,0); st.rotation.z=-.25; b.add(st);
      st.castShadow=true; outline(st,.01);
    const lf=new THREE.Group(); lf.position.set(.03,.52,0); lf.rotation.set(.3,-.6,.35); b.add(lf);
    const bl=mk(leafletGeo(),m('leaf'),lf,[.1,0,0],.014); bl.scale.setScalar(1.05);
    const rib=new THREE.Mesh(new THREE.BoxGeometry(.17,.008,.012),m('leafRib')); rib.position.set(.1,.024,0); lf.add(rib);
    const lf2=new THREE.Group(); lf2.position.set(-.02,.5,.01); lf2.rotation.set(-.2,2.5,.45); b.add(lf2);
    const bl2=mk(leafletGeo(),m('leaf'),lf2,[.08,0,0],.012); bl2.scale.setScalar(.7);
    // a rosy blush on the cheek beside the crease (it sits on the skin: radius .2, squashed to .94 in y)
    const blush=new THREE.Mesh(sph(.09,14,10),MC.peachBlushFx||(MC.peachBlushFx=new THREE.MeshBasicMaterial({color:C.peachBlush,transparent:true,opacity:.4,depthWrite:false})));
      const bn=new THREE.Vector3(.55,.15,.82).normalize(); blush.position.copy(bn).multiplyScalar(.192); blush.position.y*=.94;
      blush.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),bn); blush.scale.set(1,1.15,.25); f.add(blush); }
  else if(ch==='-'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b; const R=.22, H=.2;
    mk(new THREE.CylinderGeometry(.075,.1,.24,18),m('stem'),b,[0,.12,0],.018);
    const cap=mk(capGeo(R,H),m('cap'),b,[0,.215,0],.02);
    const gills=new THREE.Mesh(new THREE.CircleGeometry(R*.88,28),m('gills')); gills.rotation.x=Math.PI/2; gills.position.y=.215+.012; b.add(gills);
    // white spots pressed into the dome
    const dm=m('stem'); [[0,0],[1.2,.75],[2.4,.7],[3.6,.8],[4.8,.72],[.6,1.12],[3,1.15],[5.4,1.2],[1.9,1.25]].forEach(([az,el],i)=>{
      const p=capPt(R,H,az,el,-.012), n=capPt(R,H,az,el,.1).sub(p).normalize(); const d=new THREE.Mesh(sph(i?.042:.05,12,8),dm);
      d.position.copy(p).y+=.215; d.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n); d.scale.set(1,1,.42); b.add(d); }); }
  else if(ch==='T'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b; const R=.23, H=.22; // a turnaround mushroom: a mint twirl-cap with a cream spiral
    mk(new THREE.CylinderGeometry(.072,.1,.24,18),m('stem'),b,[0,.12,0],.018);
    const cap=mk(capGeo(R,H),m('turnCap'),b,[0,.215,0],.02);
    const gills=new THREE.Mesh(new THREE.CircleGeometry(R*.88,28),m('turnGills')); gills.rotation.x=Math.PI/2; gills.position.y=.215+.012; b.add(gills);
    // the swirl: a cream ribbon winding from the top of the cap down to its rim, two and a half turns, half sunk into the dome
    const pts=[]; for(let i=0;i<=72;i++){ const t=i/72; const q=capPt(R,H,t*Math.PI*5,.14+t*1.36,.002); q.y+=.215; pts.push(q); }
    const sw=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),110,.026,7,false),m('turnSwirl')); b.add(sw);
    const tip=mk(sph(.05,14,10),m('turnSwirl'),b,[0,.215+H+.004,0],.014); tip.scale.y=.75; }
  else if(ch==='K'){ const b=new THREE.Group(); g.add(b); g.userData.bob=b; g.userData.noSpin=true; g.userData.faceCam=true; const km=m('key');
    const k=new THREE.Group(); k.position.y=.36; k.rotation.x=-.75; b.add(k); g.userData.keyBody=k;
    mk(new THREE.TorusGeometry(.12,.05,14,30),km,k,[0,.16,0],.016);
    mk(new THREE.CylinderGeometry(.035,.035,.3,12),km,k,[0,-.05,0],.016).rotation.z=0;
    mk(new THREE.BoxGeometry(.11,.05,.05),km,k,[.07,-.17,0],.014); mk(new THREE.BoxGeometry(.08,.05,.05),km,k,[.06,-.09,0],.014);
    const gem=new THREE.Mesh(sph(.04,12,10),m('keyGem')); gem.position.set(0,.16,0); gem.scale.z=.6; k.add(gem); }
  else if(ch==='G'){ const gm=m('gateWood'); // little wooden garden gate
    for(const sx of [-.38,.38]){ mk(new THREE.CylinderGeometry(.06,.065,.72,14),gm,g,[sx,.36,0]); mk(sph(.075,16,12),gm,g,[sx,.74,0]); }
    const door=new THREE.Group(); door.position.x=-.32; g.add(door); g.userData.door=door;
    for(const sx of [.1,.25,.4,.55]){ mk(new THREE.BoxGeometry(.1,.5,.05),gm,door,[sx,.31,0],.016);
      mk(new THREE.ConeGeometry(.07,.1,4),gm,door,[sx,.6,0],0).rotation.y=Math.PI/4; }
    mk(new THREE.BoxGeometry(.6,.07,.06),gm,door,[.32,.22,.03],.014); mk(new THREE.BoxGeometry(.6,.07,.06),gm,door,[.32,.44,.03],.014);
    mk(new THREE.BoxGeometry(.13,.13,.08),m('key'),door,[.32,.33,.07],.016);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(.38,.045,10,28,Math.PI),gm); arch.position.y=.74; arch.castShadow=true; outline(arch,.014); g.add(arch);
    for(let i=0;i<4;i++){ const lf=new THREE.Mesh(sph(.06,10,8),m('leaf')); const a=.5+i*.7; lf.position.set(Math.cos(a)*.38,.74+Math.sin(a)*.38,.03);
      lf.scale.set(1,.6,.5); g.add(lf); }
    g.userData.faceCam=true; g.userData.lean=-.28; }
  else if(ch==='C'||ch==='c'){ const done=ch==='c';
    mk(new THREE.CylinderGeometry(.028,.028,.74,10),m('pole'),g,[0,.37,0],.014);
    mk(sph(.05,14,10),m('key'),g,[0,.76,0],.014);
    const fg=new THREE.PlaneGeometry(.42,.26,14,1); fg.translate(.21,0,0); g.userData.faceCam=true;
    if(done) g.add(bloom(.9));
    const fl=new THREE.Mesh(fg,toon(done?C.flagDone:C.flag,{side:THREE.DoubleSide})); fl.position.set(.02,.6,0); fl.castShadow=true; g.add(fl);
    // its outline is its own slightly larger cloth that waves exactly like the flag (same bend at the same x)
    const fog=new THREE.PlaneGeometry(.45,.3,15,1); fog.translate(.21,0,0); const fo=new THREE.Mesh(fog,flatLineMat); fl.add(fo);
    g.userData.flagLine=fo; g.userData.flagLineBase=Float32Array.from(fog.attributes.position.array);
    g.userData.flag=fl; g.userData.flagBase=Float32Array.from(fg.attributes.position.array);
    mk(new THREE.CylinderGeometry(.11,.14,.05,18),m('pole'),g,[0,.025,0],.014); }
  else if(ch>='1'&&ch<='9'){ const col=C.portal[ch]||0x9fd8e8; // a tunnel dug into the soil, marked with flowers of its pair colour
    // the hole itself is cut through the tile (see makeTile); here the dug-up earth round it and the pair's flowers
    const dm=m('tunnelSoil'), dm2=m('tunnelClod');
    const ring=new THREE.Mesh(moundGeo(x*3+y*5),dm); ring.position.y=-.03; ring.castShadow=true; ring.receiveShadow=true; outline(ring,.014,.4); g.add(ring);
    for(let i=0;i<4;i++){ const a=i*1.9+x+y*2, c=new THREE.Mesh(sph(.045,10,8),dm2); c.position.set(Math.cos(a)*.33,.065,Math.sin(a)*.33); c.scale.set(1,.6,.8);
      c.rotation.y=a; g.add(c); }
    const fm=toon(col); for(let i=0;i<3;i++){ const a=i/3*Math.PI*2+.6; const f=new THREE.Group(); f.position.set(Math.cos(a)*.36,.075,Math.sin(a)*.36);
      for(let k=0;k<5;k++){ const pt=new THREE.Mesh(sph(.044,12,8),fm); const b=k/5*Math.PI*2+a; pt.position.set(Math.cos(b)*.052,.035,Math.sin(b)*.052);
        pt.scale.set(1,.42,.75); pt.rotation.y=-b; pt.castShadow=true; f.add(pt); }
      const c=new THREE.Mesh(sph(.03,12,8),m('key')); c.position.y=.05; c.scale.y=.7; f.add(c); g.add(f); } }
  else if(ch==='B'){ // a big flower lying flat: a button that holds the hedges open while the worm rests on it
    const fl=new THREE.Group(); fl.position.y=.02; g.add(fl); g.userData.flower=fl;
    const base=mk(new THREE.CylinderGeometry(.36,.38,.04,24),m('leaf'),fl,[0,.0,0],.014); base.receiveShadow=true;
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; const pt=new THREE.Mesh(sph(.13,16,10),m('petalB')); pt.scale.set(1.2,.28,.62);
      pt.position.set(Math.cos(a)*.21,.05,Math.sin(a)*.21); pt.rotation.y=-a; pt.castShadow=true; outline(pt,.012); fl.add(pt); }
    const c=mk(sph(.12,18,12),m('key'),fl,[0,.07,0],.014); c.scale.y=.5; }
  else if(ch==='H'){ // a little hedge that sinks into the ground while a flower is held
    const hg=new THREE.Group(); g.add(hg); g.userData.hedge=hg;
    const box=new THREE.Mesh(HEDGE,m('hedge')); box.position.y=.25; box.castShadow=true; box.receiveShadow=true; outlineBox(box,.02,.8,.5,.8); hg.add(box);
    for(let i=0;i<9;i++){ const b=new THREE.Mesh(sph(.17,14,10),i%2?m('hedge'):m('hedgeDark'));
      b.position.set(((i%3)-1)*.27,.5+((i*7)%3)*.02,(Math.floor(i/3)-1)*.27); b.castShadow=true; outline(b,.012); hg.add(b); }
    for(let i=0;i<4;i++){ const fl=new THREE.Mesh(sph(.04,10,8),m('petalB')); fl.position.set(Math.cos(i*1.7)*.3,.62,Math.sin(i*1.7)*.3); hg.add(fl); } }
  else if(ch==='L'){ mk(new THREE.CylinderGeometry(.14,.17,.1,18),m('stone'),g,[0,.05,0],.014);
    mk(new THREE.BoxGeometry(.09,.5,.09),m('plankDark'),g,[0,.3,0],.014);
    const wheel=new THREE.Group(); wheel.position.set(0,.5,.07); wheel.rotation.x=-.6; g.add(wheel); g.userData.wheel=wheel; g.userData.faceCam=true;
    mk(new THREE.TorusGeometry(.17,.03,10,28),m('plank'),wheel,null,.012);
    for(let i=0;i<3;i++){ const sp=new THREE.Mesh(new THREE.BoxGeometry(.34,.035,.035),m('plankDark')); sp.rotation.z=i*Math.PI/3; wheel.add(sp); }
    mk(sph(.045,12,10),m('key'),wheel,[0,0,.02],.012); mk(new THREE.CylinderGeometry(.02,.02,.12,8),m('key'),wheel,[.17,0,.06],.01).rotation.x=Math.PI/2; }
  else if(ch==='R'){ const st=mk(sph(.22,20,14),m('stone'),g,[0,.04,0],.016); st.scale.set(1,.45,.9);
    const moss=new THREE.Mesh(sph(.16,16,10),m('leaf')); moss.scale.set(1,.3,.8); moss.position.set(-.04,.11,0); g.add(moss);
    const cl=new THREE.Group(); cl.position.y=.76; cl.scale.setScalar(1.6); cl.rotation.x=-.6; g.add(cl); g.userData.bob=cl; g.userData.bobBase=.76;
      g.userData.at=[x,y]; g.userData.noSpin=true; g.userData.cloud=cl; g.userData.faceCam=true; const cm=toon(C.cloud);
    const face=new THREE.Group(); face.position.set(0,.02,.158); cl.add(face); const fm=m('pupil');
    for(const s of [-1,1]){ const e=new THREE.Mesh(new THREE.TorusGeometry(.026,.009,6,12,Math.PI),fm); e.position.set(s*.055,.01,0); e.rotation.z=Math.PI;
      face.add(e);
      const ck=new THREE.Mesh(sph(.02,8,6),new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.6})); ck.position.set(s*.085,-.025,-.005);
        ck.scale.set(1,.6,.4); face.add(ck); }
    const mo=new THREE.Mesh(new THREE.TorusGeometry(.016,.006,6,12,Math.PI),fm); mo.position.set(0,-.03,0); mo.rotation.z=Math.PI; face.add(mo);
      g.userData.cloudMouth=mo;
    [[0,0,0,.15],[-.15,-.03,0,.11],[.15,-.03,0,.11],[.07,.08,0,.11],[-.07,.07,0,.1]].forEach(p=>{ const s=new THREE.Mesh(sph(p[3],20,14),cm); s.position.set(p[0],p[1],p[2]); s.castShadow=true; outline(s,.016); cl.add(s); });
    g.userData.cloudMat=cm;
    const drops=new THREE.Group(); drops.visible=false; cl.add(drops); g.userData.drops=drops;
    for(let i=0;i<3;i++){ const d=new THREE.Mesh(sph(.025,10,8),toon(C.water)); d.scale.y=1.6; d.position.set((i-1)*.1,-.15,0); d.userData.ph=i*.33;
      drops.add(d); } }
  else if(ch==='E'){ // the burrow: a real hole in the tile (see makeTile) ringed by a heap of dug-up earth
    const rim=mk(lumpyTorus(.335,.09,x*2+y*3,.7),toon(C.mound),g,[0,.05,0],.018); rim.rotation.x=-Math.PI/2; rim.scale.z=.8; rim.receiveShadow=true;
    // earth under the heap: a flat ring over the turf round the hole and a short collar down to the shaft, so no grass
    // shows between the heap and the hole
    const em=MC.burrowEarth||(MC.burrowEarth=new THREE.MeshToonMaterial({color:C.mound,gradientMap:gradTex,side:THREE.DoubleSide}));
    const ring=new THREE.Mesh(GC.burrowRing||(GC.burrowRing=new THREE.RingGeometry(BURROW_R-.004,.38,32)),em); ring.rotation.x=-Math.PI/2; ring.position.y=.006;
    const collar=new THREE.Mesh(GC.burrowCollar||(GC.burrowCollar=new THREE.CylinderGeometry(BURROW_R-.002,BURROW_R-.002,.13,28,1,true)),em);
    collar.position.y=-.06; ring.receiveShadow=collar.receiveShadow=true; g.add(ring,collar);
    for(let i=0;i<4;i++){ const a=i*1.55+x+y*2.3, c=new THREE.Mesh(sph(.04,10,8),m('tunnelClod')); c.position.set(Math.cos(a)*.44,.025,Math.sin(a)*.44);
      c.scale.set(1,.6,.8); c.rotation.y=a; c.castShadow=true; g.add(c); }
    const sign=new THREE.Group(); sign.position.set(.3,0,-.34); sign.scale.setScalar(1.55); g.add(sign); sign.userData.faceCam=true;
    mk(new THREE.CylinderGeometry(.03,.035,.5,10),m('pole'),sign,[0,.25,0],.014);
    const face=new THREE.Group(); face.position.y=.55; face.rotation.x=-.35; sign.add(face);
    g.userData.signBoard=mk(slab(.38,.07,.06,.32,.025),m('plank'),face,[0,0,0],.016);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.28,.28),new THREE.MeshBasicMaterial({map:numberTex(state.exitLen),transparent:true}));
      label.position.set(0,0,.04); face.add(label);
    for(let i=0;i<3;i++){ const t=new THREE.Mesh(new THREE.ConeGeometry(.03,.12,6),m('leaf')); const a=i*2.1+.4;
      t.position.set(Math.cos(a)*.36,.05,Math.sin(a)*.3); t.rotation.z=(i-1)*.3; t.castShadow=true; g.add(t); }
    g.userData.rim=rim; g.userData.sprite=sign; g.userData.signs=[sign]; }
  else if(POLLEN[ch]) makePollenFlower(g,ch,x,y);
  else if(MOLE[ch]) makeMoleHill(g,x,y);
  else if(PETALS[ch]) makePetalGate(g,ch,x,y);
  else return null;
  faceCamera(g); board.add(g); return g;
}
// Each patch builds its own meshes; free their GPU memory when the next patch replaces them.
// Cached and module-level geometries, materials and textures are shared, so they are kept.
function disposeTree(root){
  const keepG=new Set([...Object.values(GC),TURF,HEDGE,WATER,TURF_HOLE,WELL,WELL_FLOOR,DRY_DEC,VEIN,spriteGeo,ringGeo,glintGeo,rippleGeo]);
  const keepM=new Set([...Object.values(MC),lineMat,flatLineMat,batchMat,batchLine,tubeMat,capMat,waterMatH,waterMatV,lawnMat,sparkMat,glintMat]);
  const keepT=new Set([gradTex,glowTex,sparkTex,turfTex,crackTex,dryTex,swirlTex,lawnTex,flowH,flowV,blobTex,zTex,slimeTex]);
  root.traverse(o=>{ if(o.geometry&&!keepG.has(o.geometry)) o.geometry.dispose();
    for(const mt of o.material?[].concat(o.material):[]){ if(keepM.has(mt)) continue; if(mt.map&&!keepT.has(mt.map)) mt.map.dispose(); mt.dispose(); } }); }
function buildBoard(){
  disposeTree(board); disposeTree(fx); board.clear(); fx.clear(); cells=[]; flowTiles=[]; polItems=[]; moleItems=[]; snapPollen();
  for(let y=0;y<state.h;y++){ const row=[]; for(let x=0;x<state.w;x++){
    const ch=state.grid[y][x]; row.push({ch, tile: ch===' '?null:makeTile(x,y,ch), item: makeItem(x,y,ch)}); } cells.push(row); }
  buildGarden(); buildRain(); syncWeather(false); buildSnails(); buildBeetles(); syncHedges(false);
}
// hedges stand while no flower is held and sink while one is (or while the worm is inside them)
function syncHedges(animate){ if(!state) return; const open=hedgesOpen(state); let changed=false;
  for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const it=cells[y]&&cells[y][x]&&cells[y][x].item; if(!it) continue; const u=it.userData;
    if(u.flower){ const want=occupied(x,y)||beetleAt(state,x,y)>=0?.35:1; if(u.pressed!==want){ u.pressed=want; const f=u.flower, s0=f.scale.y;
      if(animate) tween(180,e=>{ f.scale.y=s0+(want-s0)*e; }); else f.scale.y=want; } }
    // an open hedge sinks to a low cushion and pulls in from the tile edges, so grass shows round it even from above
    if(u.hedge){ const want=occupied(x,y)?.06:open?.22:1, wide=want<1?.66:1; if(u.hedgeH!==want){ if(u.hedgeH!==undefined) changed=true; u.hedgeH=want;
      const h=u.hedge, s0=h.scale.y, w0=h.scale.x;
        if(animate) tween(300,e=>{ h.scale.y=Math.max(.06,s0+(want-s0)*e); const w=w0+(wide-w0)*e; h.scale.x=h.scale.z=w; h.position.y=-(1-h.scale.y)*.06; });
          else { h.scale.set(wide,want,wide); h.position.y=-(1-want)*.06; } } } }
  if(changed&&animate){ sfx(open?'hedgeOpen':'hedgeClose'); if(open) bumpStat('hedges'); }
  syncPetals(animate); syncSoil(animate); syncMoles(animate); }
function removeObj(o){ if(o&&o.parent) o.parent.remove(o); }
