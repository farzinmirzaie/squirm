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
  rivers:{t:'Rivers and bridges',d:'Water blocks the way. Bridges only go along their planks, and a crank swings every bridge you are not standing on.',k:/[~=|L]/,i:art('bridge',40)},
};
let seenMech=store.json('squirm-seen')||{};
let introDone=null;
function newMechanics(){ const m=L.map.join(''); return Object.keys(MECH).filter(k=>!seenMech[k]&&MECH[k].k.test(m)); }
// one card per mechanic: a big bobbing sticker, its name and what it does; Next pages through, the last says Let's go
let introList=[], introI=0;
const INTRO_TINT=['--tint-leaf','--tint-honey','--tint-berry'];
function renderIntro(anim){ const k=introList[introI], n=introList.length, b=$('introBody');
  b.innerHTML=`<p class="label">${n===1?'Something new':`New in this patch · ${introI+1} of ${n}`}</p>`
    +`<div class="intro-art" style="--tint:var(${INTRO_TINT[(Object.keys(MECH).indexOf(k))%3]})"><span class="ia">${MECH[k].i.replace('width="40" height="40"','width="64" height="64"').replace(/stroke-width="[\d.]+"/,'stroke-width="1.5"')}</span><i></i><i></i><i></i></div>`
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
function wormSays(t,ms=2000){ const el=$('wormSayG'); if(!state||anyOverlay()||photoOn) return; el.textContent=t; el.hidden=false; gSayT=ms/1000; placeSay(); animOnce(el,'say'); }
function placeSay(){ const el=$('wormSayG'), h=segMeshes[0]; if(el.hidden) return;
  if(!h||anyOverlay()||photoOn||document.body.classList.contains('at-home')){ el.hidden=true; gSayT=0; return; }
  const v=h.position.clone(); v.y+=.45; v.project(camera); const W=window.innerWidth, H=window.innerHeight, x=(v.x+1)/2*W, y=(1-v.y)/2*H;
  const w=el.offsetWidth, left=x+30+w>W-8; el.classList.toggle('left',left);
  el.style.transform=`translate(${Math.round(Math.max(8,left?x-30-w:x+30))}px,${Math.round(Math.max(8,y-el.offsetHeight/2))}px)`; }
const SAY={ '+':['Yum!','Peachy!','Nom nom!'], '-':['Whoa, smaller!','Shrinking!'], C:['Got it!','A flag!','Tagged!'], K:['A key!','Ooh, shiny!'], G:['Open sesame!'], pollen:['Achoo!','Tickles!','So fluffy!','Pretty colour!'] };
let sayN=0;
let sayLast=-99;
const sayFor=k=>{ const a=SAY[k]; if(!a||idleT-sayLast<40||Math.random()>.25) return null; sayLast=idleT; return a[sayN++%a.length]; };
function closeIntro(fromBack){ hide('introOv'); if(!fromBack) popLayer('intro'); const d=introDone; introDone=null; if(d) d(); }
$('introOk').onclick=introNext;

// ---------- first-time tutorial ----------
function maybeTutorial(){ if(store.get('squirm-tutorial')==='1'||mode!=='garden'||li!==0||history.length) return false; $('tutorial').classList.add('show'); return true; }
function dismissTutorial(){ const t=$('tutorial'); if(!t.classList.contains('show')) return; t.classList.remove('show'); store.set('squirm-tutorial','1'); }

