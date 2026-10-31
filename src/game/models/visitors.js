// ---------- little garden visitors: a ladybug on the wooden border, a bird hopping on the lawn ----------
let critters=[];
function ladybug(){ const g=new THREE.Group(), red=toon(0xE8544E), dark=m('pupil');
  const shell=new THREE.Mesh(sph(.075,16,12),red); shell.scale.set(1,.55,1.2); shell.position.y=.03; outline(shell,.012); g.add(shell);
  const head=new THREE.Mesh(sph(.04,12,10),dark); head.position.set(0,.025,.085); g.add(head);
  for(const [x,z] of [[.035,.02],[-.035,.02],[.03,-.045],[-.03,-.045],[0,-.01]]){ const d=new THREE.Mesh(sph(.017,8,6),dark); d.scale.y=.4;
    d.position.set(x,.068,z); g.add(d); }
  // the seam between the wing cases follows the curve of the shell
  const line=new THREE.Mesh(new THREE.TorusGeometry(.09,.006,4,24,Math.PI),dark); line.scale.y=.46; line.rotation.y=Math.PI/2; line.position.y=.03; g.add(line);
  return merged(g,1.5); }
// a critter's parts are merged into one mesh (plus outline), like the scenery
function merged(src,scale){ const g=new THREE.Group(); batchScenery(src,g); g.scale.setScalar(scale); return g; }
function birdie(){ const g=new THREE.Group(), body=toon(0x7DB4E8), belly=toon(0xFFE9C9), beak=toon(0xFFB24A), dark=m('pupil');
  const b=new THREE.Mesh(sph(.14,18,14),body); b.scale.set(1,.9,1.15); b.position.y=.17; outline(b,.016); g.add(b);
  const bl=new THREE.Mesh(sph(.1,14,10),belly); bl.position.set(0,.14,.07); bl.scale.set(1,.9,.8); g.add(bl);
  const head=new THREE.Group();
  const hd=new THREE.Mesh(sph(.095,16,12),body); outline(hd,.014); head.add(hd);
  const bk=new THREE.Mesh(new THREE.ConeGeometry(.03,.08,8),beak); bk.rotation.x=Math.PI/2; bk.position.set(0,-.01,.1); head.add(bk);
  for(const sd of [-1,1]){ const e=new THREE.Mesh(sph(.017,8,6),dark); e.position.set(sd*.055,.02,.07); head.add(e); }
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.06,.14,8),body); tail.rotation.x=-2.2; tail.position.set(0,.2,-.17); g.add(tail);
  for(const sd of [-1,1]){ const leg=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.06,5),beak); leg.position.set(sd*.04,.03,0); g.add(leg); }
  const bird=merged(g,1.7), hg=merged(head,1); hg.position.set(0,.3,.08); bird.add(hg); bird.userData.head=hg; return bird; }
function buildCritters(r,cx,cz,bw,bd){ critters=[];
  // the ladybug walks the top of the wooden border, now and then stopping for a rest
  const bug=ladybug(); garden.add(bug); critters.push({kind:'bug',o:bug,s:r()*4,rest:0,dir:r()<.5?1:-1,hw:bw/2+.12,hd:bd/2+.12,cx,cz});
  if(quality===0) return;
  // a bird visits the lawn in front of the bed and hops about
  const bird=birdie(); garden.add(bird); const c={kind:'bird',o:bird,cx,cz,hw:bw/2,hd:bd/2,mode:'eat',t:0,wait:0,to:null,peck:0,look:0,lookTo:0};
  critters.push(c); bird.visible=false; }
const BIRD_R=.28, BUG_Y=-.052; // the wooden border's top is at y -.07; the bug's shell reaches .011 below its origin (x1.5)
const clearAt=(x,z)=>![...lawnObstacles,...treeObstacles].some(o=>Math.hypot(x-o.x,z-o.z)<o.r+BIRD_R);
function clearPath(a,b){ const n=Math.ceil(a.distanceTo(b)/.12); for(let i=1;i<=n;i++){ const t=i/n; if(!clearAt(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)) return false;
  } return true; }
// a free spot on the lawn between the bed and the camera that the bird can reach without going through anything
function birdSpot(c,from){ const fx=camera.position.x-c.cx, fz=camera.position.z-c.cz, l=Math.hypot(fx,fz)||1, ux=fx/l, uz=fz/l;
  const ext=Math.abs(ux)*c.hw+Math.abs(uz)*c.hd, span=Math.abs(uz)*c.hw+Math.abs(ux)*c.hd, box=viewBox();
  for(let k=0;k<120;k++){ const wide=1+Math.floor(k%80/20)*.5; // look a little further out if the near lawn is crowded
    let side=(Math.random()-.5)*2*span*wide, d=ext+.7+Math.random()*.8*wide;
    // when the lawn in front is hidden (under the buttons on a phone), try the lawn beside the bed
    if(k>=80){ side=(Math.random()<.5?-1:1)*(span+.8+Math.random()*.9); d=(Math.random()-.3)*ext*1.4; }
    const p=new THREE.Vector3(c.cx+ux*d-uz*side,-.34,c.cz+uz*d+ux*side);
    if(!clearAt(p.x,p.z)||!inView(p,box)) continue; if(from&&(from.distanceTo(p)<.9||!clearPath(from,p))) continue; return p; }
  return null; }
// the open part of the screen between the HUD and the buttons, measured once per search
function viewBox(){ const W=window.innerWidth, H=window.innerHeight, hd=document.querySelector('header'), nv=document.querySelector('nav'), hr=hd&&hd.getBoundingClientRect(), nr=nv&&nv.getBoundingClientRect();
  return {W,H,t:hr&&hr.height?hr.bottom:0,b:nr&&nr.height?nr.top:H}; }
function inView(p,box){ const v=p.clone(); v.y+=.25; v.project(camera); if(v.z>1) return false; const px=(v.x+1)/2*box.W, py=(1-v.y)/2*box.H;
  return px>24 && px<box.W-24 && py>box.t+10 && py<box.b-14; }
function perimeter(c,s){ // a point on the border's centre line, s in 0..4 going round the bed
  const k=((s%4)+4)%4, f=k%1; const P=[[-1,-1],[1,-1],[1,1],[-1,1]][Math.floor(k)], Q=[[1,-1],[1,1],[-1,1],[-1,-1]][Math.floor(k)];
  return [c.cx+(P[0]+(Q[0]-P[0])*f)*c.hw, c.cz+(P[1]+(Q[1]-P[1])*f)*c.hd]; }
function updateCritters(dt){ const sec=dt/1000;
  for(const c of critters){ const o=c.o;
    if(c.kind==='bug'){ if(reduceMotion){ const [x,z]=perimeter(c,c.s); o.position.set(x,BUG_Y,z); continue; }
      if(c.rest>0){ c.rest-=sec; continue; }
      const sp=.035/Math.max(c.hw,c.hd); c.s+=c.dir*sp*sec*4; if(Math.random()<sec*.12){ c.rest=1.5+Math.random()*3; if(Math.random()<.3) c.dir*=-1; }
      const [x,z]=perimeter(c,c.s), [nx,nz]=perimeter(c,c.s+c.dir*.01); o.position.set(x,BUG_Y+Math.abs(Math.sin(idleT*30))*.004,z);
        o.rotation.y=Math.atan2(nx-x,nz-z); continue; }
    // bird: settles on a spot and eats there for a while (pecks, looks around), then hops a few times to another spot
    if(!o.visible){ if((c.retry=(c.retry||0)-sec)>0) continue; const p=birdSpot(c); if(!p){ c.retry=1; continue; } o.position.copy(p);
      o.rotation.y=Math.random()*6; o.visible=true; c.mode='eat'; c.t=3+Math.random()*4; } // placed once the camera has settled
    const head=o.userData.head; head.rotation.z=birdSong>0?Math.sin(birdSong*30)*.2:0;
    if(reduceMotion){ head.rotation.x=0; continue; }
    if(c.mode==='eat'){ c.t-=sec;
      if(c.peck>0){ c.peck-=sec; head.rotation.x=Math.sin((1-c.peck/.45)*Math.PI)*.95; }
      else { head.rotation.x*=.85; if(Math.random()<sec*1.1) c.peck=.45; }
      if(c.look>0){ c.look-=sec; head.rotation.y+=(c.lookTo-head.rotation.y)*Math.min(1,sec*8); } else { head.rotation.y*=.9;
        if(Math.random()<sec*.25){ c.look=.9; c.lookTo=(Math.random()-.5)*1.4; } }
      if(c.t<=0){ const p=birdSpot(c,o.position); if(p){ c.mode='go'; c.to=p; c.wait=0; } else c.t=2; }
      continue; }
    // travelling: short hops with small pauses, facing where it's going
    head.rotation.x*=.8; head.rotation.y*=.8;
    if(c.hop){ c.hop.t+=sec/c.hop.dur; const k=Math.min(1,c.hop.t); o.position.lerpVectors(c.hop.a,c.hop.b,k); o.position.y=-.34+Math.sin(k*Math.PI)*c.hop.h;
      if(k>=1){ c.hop=null; c.wait=.18+Math.random()*.25; } continue; }
    c.wait-=sec; if(c.wait>0) continue;
    const a=o.position.clone(); a.y=-.34; const dir=c.to.clone().sub(a); dir.y=0;
    if(dir.length()<.05){ c.mode='eat'; c.t=5+Math.random()*6; continue; }
    if(dir.length()>.32) dir.setLength(.26+Math.random()*.06);
    o.rotation.y=Math.atan2(dir.x,dir.z); c.hop={a,b:a.clone().add(dir),t:0,dur:.24,h:.1}; }
  birdSong=Math.max(0,birdSong-sec); }

