// ---------- first time you meet a mechanic ----------
const MECH={
  basics:{t:'Crawl to the burrow',d:'Swipe to crawl. The burrow only fits a worm of the exact length on its sign.',k:/E/,i:art('start',40)},
  flags:{t:'Flags',d:'Touch every flag before the burrow will let you in.',k:/C/,i:art('flag',40)},
  fruit:{t:'Peaches and mushrooms',d:'A peach makes you one longer. A mushroom makes you one shorter. Shorter worms can turn in tight spots.',k:/[+-]/,i:art('fruit',40)},
  keys:{t:'Keys and gates',d:'Pick up a key to open one wooden gate. Each key works once.',k:/[KG]/,i:art('key',40)},
  dry:{t:'Dry patches',d:'Cracked ground sinks into the soil once your tail leaves it. You only get one visit.',k:/x/,i:art('crack',40)},
  portals:{t:'Tunnels',d:'Worms dig! Crawl into a tunnel and come out of the one marked with the same flowers.',k:/[1-9]/,i:art('tunnel',40)},
  rain:{t:'Rain',d:'Step on a cloud stone to start or stop the rain. Rain grows seedlings into leaves you can cross, and fills puddles so you can\'t.',k:/[Rsw]/,i:art('rain',40)},
  snails:{t:'Snails',d:'A snail slides one tile every time you move and turns around when something blocks it. You cannot crawl through a snail, so time your moves.',k:/[<>^v]/,i:art('snail',40)},
  buttons:{t:'Flower buttons',d:'Hedges open while any part of you rests on a big flower. Keep your tail on the flower while your head slips through.',k:/[BH]/,i:art('flowerbtn',40)},
  beetles:{t:'Beetles',d:'Bump into a beetle to push it one tile ahead. Beetles only move onto grass, flowers, dry patches and leaves, where they slide. A beetle resting on a flower holds the hedges open for you.',k:/O/,i:art('beetle',40)},
  leaves:{t:'Wet leaves',d:'Dewy leaves are slippery. Crawl onto one and you slide along until you reach dry grass or bump into something.',k:/i/,i:art('wetleaf',40)},
  pollen:{t:'Pollen and petal gates',d:'Crawl over a flower to get dusted in its pollen. Petal gates only open for a worm wearing their colour, and the next flower you visit swaps your colour.',k:/[PYUpyu]/,i:art('pollenY',40)},
  soil:{t:'Soft soil',d:'Worms love loose earth! On soft soil you burrow under, so you can cross your own body there. Just never fold back onto yourself.',k:/#/,i:art('soil',40)},
  turn:{t:'Turnaround mushrooms',d:'Nibble a twirl-cap and you turn around: your tail becomes your head, and off you crawl the other way. Each one works once.',k:/T/,i:art('turnshroom',40)},
  rivers:{t:'Rivers and bridges',d:'Water blocks the way. Bridges only go along their planks, and a crank swings every bridge you are not standing on.',k:/[~=|L]/,i:art('bridge',40)},
};
let seenMech=store.json('squirm-seen')||{};
let introDone=null;
function newMechanics(){ const m=L.map.join(''); return Object.keys(MECH).filter(k=>!seenMech[k]&&MECH[k].k.test(m)); }
// one card per mechanic: a big bobbing sticker, its name and what it does; Next pages through, the last says Let's go
let introList=[], introI=0;
const INTRO_TINT=['--tint-leaf','--tint-honey','--tint-berry'];
// the card's picture: the real board pieces, turning slowly on their own (the sticker in a tile if that fails). They're
// drawn live into a small render target and copied to the card's canvas (flipped by CSS, as WebGL rows run bottom up).
const MECH_PIECES={basics:['E'],flags:['C'],fruit:['+','-'],keys:['K','G'],dry:['x'],portals:['1'],rain:['R','s'],snails:['>'],
  buttons:['B','H'],beetles:['O'],leaves:['i'],pollen:['P','p'],soil:['#'],turn:['T'],rivers:['=','L']};
const SPIN_PX=320;
let spin=null;
function spinBuild(k){ spinDrop(); const pcs=MECH_PIECES[k]; if(!pcs||!state) return false;
  const sc=new THREE.Scene(), pivot=new THREE.Group(), grp=new THREE.Group(), f0=flowTiles.length, p0=polItems.length;
  sc.add(new THREE.HemisphereLight(0xfffaf0,0xb7d79a,.38), new THREE.AmbientLight(0xfff4e2,.2));
  const sun=new THREE.DirectionalLight(0xfff1dc,.55); sun.position.set(-4,10,5); sc.add(sun, pivot); pivot.add(grp);
  try{ const at=pcs.map((ch,x)=>wp(x,0));
    pcs.forEach((ch,x)=>{ const tile=makeTile(x,0,ch==='>'||ch==='O'?'.':ch), item=makeItem(x,0,ch); [tile,item].forEach(o=>o&&grp.add(o));
      if(ch==='>'){ const sn=makeSnail(); sn.userData.inner.scale.setScalar(1); sn.children[0].scale.setScalar(1.4); sn.position.copy(at[x]); sn.rotation.y=Math.PI/2; grp.add(sn); }
      if(ch==='O'){ const bt=makeBeetle(); bt.position.copy(at[x]); bt.rotation.y=.4; beetleFace(bt,'idle'); grp.add(bt); } });
    // the pivot sits in the middle of the pieces, so they turn round their own centre
    const mid=at.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/at.length); grp.position.set(-mid.x,0,-mid.z);
    // the camera looks down from the patch's angle, as far back as the pieces need to fit at any turn, tall ones included
    pivot.updateMatrixWorld(true); const box=new THREE.Box3().setFromObject(pivot);
    const r=Math.max(Math.hypot(box.min.x,box.min.z),Math.hypot(box.max.x,box.max.z),Math.hypot(box.min.x,box.max.z),Math.hypot(box.max.x,box.min.z));
    const c=new THREE.Vector3(0,(box.min.y+box.max.y)/2,0), rad=Math.hypot(r,(box.max.y-box.min.y)/2);
    const cam=new THREE.PerspectiveCamera(28,1,.1,50), dir=new THREE.Vector3(0,.8,.75).normalize();
    cam.position.copy(c).addScaledVector(dir,rad/Math.sin(14*Math.PI/180)*.92); cam.lookAt(c);
    spin={k,sc,cam,pivot,grp,rt:new THREE.WebGLRenderTarget(SPIN_PX,SPIN_PX),px:new Uint8Array(SPIN_PX*SPIN_PX*4),acc:1,cv:null}; }
  catch(e){ disposeTree(grp); spin=null; }
  flowTiles.length=f0; polItems.length=p0; return !!spin; }
function spinDrop(){ if(!spin) return; disposeTree(spin.grp); spin.rt.dispose(); spin=null; }
function spinDraw(){ const cv=spin.cv||(spin.cv=$('introSpin')); if(!cv) return;
  const old=renderer.getRenderTarget(), cc=new THREE.Color(); renderer.getClearColor(cc); const ca=renderer.getClearAlpha();
  renderer.setRenderTarget(spin.rt); renderer.setClearColor(0x000000,0); renderer.clear(); renderer.render(spin.sc,spin.cam);
  renderer.readRenderTargetPixels(spin.rt,0,0,SPIN_PX,SPIN_PX,spin.px); renderer.setRenderTarget(old); renderer.setClearColor(cc,ca);
  cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(spin.px.buffer),SPIN_PX,SPIN_PX),0,0); }
// from frame: about a turn every 14 s, drawn at up to 30 fps; held still under reduced motion; freed once the card closes
function spinTick(dt){ if(!spin) return; if(!isOpen('introOv')){ spinDrop(); return; }
  if(reduceMotion&&spin.acc<0) return; spin.pivot.rotation.y+=reduceMotion?0:dt*.45; spin.acc+=dt;
  if(spin.acc<1/30) return; spin.acc=reduceMotion?-1:0; try{ spinDraw(); }catch(e){ spinDrop(); } }
function renderIntro(anim){ const k=introList[introI], n=introList.length, b=$('introBody'), live=spinBuild(k);
  b.innerHTML=`<p class="label">${n===1?'Something new':`New in this patch · ${introI+1} of ${n}`}</p>`
    +(live?`<canvas class="intro-spin" id="introSpin" width="${SPIN_PX}" height="${SPIN_PX}" aria-hidden="true"></canvas>`
      :`<div class="intro-art" style="--tint:var(${INTRO_TINT[(Object.keys(MECH).indexOf(k))%3]})"><span class="ia">${MECH[k].i.replace('width="40" height="40"','width="64" height="64"').replace(/stroke-width="[\d.]+"/,'stroke-width="1.5"')}</span><i></i><i></i><i></i></div>`)
    +`<h2 id="introTitle">${MECH[k].t}</h2><p class="desc">${MECH[k].d}</p>`;
  $('introDots').innerHTML=n>1?introList.map((x,i)=>`<i class="${i===introI?'on':''}"></i>`).join(''):'';
  $('introOk').textContent=introI<n-1?'Next':"Let's go!";
  if(anim&&!reduceMotion) animOnce(b,'swap'); }
function showIntro(list,done){ introList=list; introI=0; renderIntro(false);
  list.forEach(k=>seenMech[k]=1); store.set('squirm-seen',JSON.stringify(seenMech));
  introDone=done; show('introOv'); pushLayer('intro'); sfx('ready'); }
function introNext(){ if(introI<introList.length-1){ introI++; renderIntro(true); sfx('ready'); } else closeIntro(false); }
// ---------- the worm talks ----------
// a speech bubble that follows the worm's head during play: little reactions and hints
let gSayT=0;
function wormSays(t,ms=2000){ const el=$('wormSayG'); if(!state||anyOverlay()||photoOn) return; el.textContent=t; el.hidden=false; gSayT=ms/1000; placeSay();
  animOnce(el,'say'); }
function placeSay(){ const el=$('wormSayG'), h=segMeshes[0]; if(el.hidden) return;
  if(!h||anyOverlay()||photoOn||document.body.classList.contains('at-home')){ el.hidden=true; gSayT=0; return; }
  const v=h.position.clone(); v.y+=.45; v.project(camera); const W=window.innerWidth, H=window.innerHeight, x=(v.x+1)/2*W, y=(1-v.y)/2*H;
  const w=el.offsetWidth, left=x+30+w>W-8; el.classList.toggle('left',left);
  el.style.transform=`translate(${Math.round(Math.max(8,left?x-30-w:x+30))}px,${Math.round(Math.max(8,y-el.offsetHeight/2))}px)`; }
const SAY={ '+':['Yum!','Peachy!','Nom nom!'], '-':['Whoa, smaller!','Shrinking!'], C:['Got it!','A flag!','Tagged!'], K:['A key!','Ooh, shiny!'], G:['Open sesame!'], T:['Wheee, other way!','Tail first? Head first!','All turned around!'], pollen:['Achoo!','Tickles!','So fluffy!','Pretty colour!'] };
let sayN=0;
let sayLast=-99;
const sayFor=k=>{ const a=SAY[k]; if(!a||idleT-sayLast<40||Math.random()>.25) return null; sayLast=idleT; return a[sayN++%a.length]; };
function closeIntro(fromBack){ hide('introOv'); if(!fromBack) popLayer('intro'); const d=introDone; introDone=null; if(d) d(); }
$('introOk').onclick=introNext;

// ---------- first-time tutorial ----------
function maybeTutorial(){ if(store.get('squirm-tutorial')==='1'||mode!=='garden'||li!==0||history.length) return false; $('tutorial').classList.add('show');
  return true; }
function dismissTutorial(){ const t=$('tutorial'); if(!t.classList.contains('show')) return; t.classList.remove('show'); store.set('squirm-tutorial','1'); }

