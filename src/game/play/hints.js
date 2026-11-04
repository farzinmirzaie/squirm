// ---------- hints ----------
let hintsUsed=0, undosHere=0, hintMesh=null, hintBusy=false, hintKey='';
// hint seeds: a garden or daily hint costs one from the pouch (progress.seeds, at most SEED_MAX). The daily and the
// meadow fill it (onWin). Hints are free in the first chapter and in the meadow, but a hinted meadow patch earns nothing.
const SEED_MAX=9;
const hintFree=()=>mode==='garden'?li<10:!(L&&L.daily);
function addSeeds(n){ const got=Math.max(0,Math.min(SEED_MAX,progress.seeds+n)-progress.seeds); progress.seeds+=got; if(got) bumpStat('seedsGot',got); return got; }
const seedChip=n=>`<span class="seed-chip">${art('hintseed',16)}+${n}</span>`;
function renderSeeds(){ const b=$('hintBtn'), free=hintFree(), n=progress.seeds; $('seedN').hidden=free; $('seedN').textContent=n; b.classList.toggle('empty',!free&&n<=0);
  b.setAttribute('aria-label',free?'Hint':`Hint, ${n} hint ${n===1?'seed':'seeds'} left`); }
// the pouch is empty: offer the daily (unless it's done or being played) and the meadow; this patch is saved meanwhile
function openSeeds(){ const daily=!progress.daily.results[todayKey()]&&!(L&&L.daily);
  $('seedTitle').textContent='Out of hint seeds'; $('seedText').textContent='Garden hints use hint seeds. Grow more in today\'s patch or out in the meadow. This patch will wait for you.';
  $('seedHow').hidden=true; $('seedKeep').textContent='Keep trying'; $('seedMeadow').hidden=false;
  $('seedDaily').hidden=!daily; $('seedDaily').innerHTML=`Today's patch ${seedChip(2)}`; $('seedMeadow').innerHTML=`A meadow patch ${seedChip(1)}`;
  $('seedMeadow').classList.toggle('primary',!daily); sfx('stuck'); show('seedOv'); pushLayer('seeds'); }
// the explainer, from the seed pill on the home screen
function seedInfo(){ const n=progress.seeds, row=(t,v)=>`<li>${art('hintseed',20)}<span>${t}</span><b>${v}</b></li>`;
  $('seedTitle').textContent='Hint seeds'; $('seedText').textContent=`Each hint in the garden uses one seed. You have ${n} of ${SEED_MAX}; your pouch holds ${SEED_MAX}. Grow more by playing:`;
  $('seedHow').innerHTML=row("Today's patch",'+2')+row('A meadow patch','+1')+row('A hard meadow patch','+2')+row('First meadow patch of the day','+1 more')+row('Every 7 days in a row','+1 more')
    +`<li>${art('bulb',20)}<span>Hints stay free in the first chapter and the meadow, and the same hint twice never costs a seed.</span></li>`
    +((progress.stats.seedsGot||0)<30?`<li>${hatArt('idea',20)}<span>Grow 30 seeds to earn the Bright idea hat</span><b>${progress.stats.seedsGot||0} of 30</b></li>`:'');
  $('seedHow').hidden=false; $('seedDaily').hidden=true; $('seedMeadow').hidden=true; $('seedKeep').textContent='Got it'; show('seedOv'); pushLayer('seeds'); }
$('homeSeeds').onclick=()=>{ ensureAudio(); seedInfo(); };
const seedGo=f=>()=>{ hide('seedOv'); popLayer('seeds'); f(); };
$('seedKeep').onclick=seedGo(()=>{}); $('seedDaily').onclick=seedGo(()=>$('dailyBtn').onclick()); $('seedMeadow').onclick=seedGo(()=>$('meadowBtn').onclick());
function solveFrom(s0,cap=350000,ms=2500){ const until=performance.now()+ms;
  const seen=new Set([stateKey(s0)]); let q=[[s0,null]];
  while(q.length){ const nq=[];
    for(const [s,first] of q){ for(const d of ['N','S','W','E']){ const r=step(s,d); if(r.blocked) continue; const f=first||d;
        if(r.state.status==='won') return f; const k=stateKey(r.state); if(seen.has(k)) continue; seen.add(k);
          if(seen.size>cap||((seen.size&1023)===0&&performance.now()>until)) return undefined; nq.push([r.state,f]); } }
    q=nq; }
  return null; }
function clearHint(){ if(hintMesh){ removeObj(hintMesh); hintMesh=null; } }
function showHint(){
  if(animating&&!hintBusy){ setTimeout(showHint,250); return; }
  if(hintBusy||anyOverlay()||state.status!=='play') return;
  // the same hint again is free: just point at it once more
  const key=stateKey(state); if(hintMesh&&hintKey===key){ pulse($('hintBtn')); return; }
  if(!hintFree()&&progress.seeds<=0){ openSeeds(); return; } hintBusy=true; $('hintBtn').classList.add('busy');
  wormSays('Hmm, let me think...',1600);
  setTimeout(()=>{ const d=solveFrom(state); hintBusy=false; $('hintBtn').classList.remove('busy');
    if(d===null){ sfx('stuck'); toast('No way to win from here. Undo a few moves and try again.',3600); pulse($('undoBtn')); return; }
    if(d===undefined){ sfx('stuck'); toast('This one is too tangled to work out from here. Hold Undo to start over.',3200); return; }
    hintsUsed++; hintKey=key; noteHint(); if(!hintFree()){ progress.seeds--; if(!progress.seeds) stat('seeds/empty'); save(); renderSeeds(); } saveResume(); clearHint(); const h=state.segs[0], dd=DIRS[d], tx=h[0]+dd[0], ty=h[1]+dd[1];
    hintMesh=new THREE.Group(); const am=m('key');
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.13,.26,20),am); cone.rotation.x=Math.PI; outline(cone,.02); hintMesh.add(cone);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,10,32),new THREE.MeshBasicMaterial({color:0xFFD866,transparent:true,opacity:.9}));
      ring.rotation.x=-Math.PI/2; ring.position.y=-.82; hintMesh.add(ring);
    hintMesh.position.copy(wp(tx,ty,.85)); fx.add(hintMesh);
    headDir=[dd[0],dd[1]]; lastMoveT=idleT; sfx('ready'); wormSays(`Let's try ${({N:'up',S:'down',W:'left',E:'right'})[screenWord(d)]}!`,2600);
  },60);
}
function screenWord(d){ const v=screenVec(DIRS[d]); return Math.abs(v.x)>Math.abs(v.y) ? (v.x>0?'E':'W') : (v.y>0?'S':'N'); }
