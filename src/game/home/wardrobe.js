// ---------- wardrobe (Me tab) ----------
// the worm on its stage shows the whole outfit; Hats / Colours / Patterns switch one grid of tiles
let wardTab='hats';
const tile=(key,val,on,ok,ico,name,note)=>`<button data-${key}="${val}" class="hat ${on?'on':''} ${ok?'':'locked'}" aria-pressed="${on}"><span class="hat-ico" aria-hidden="true">${ok?ico:art('lock',28)}</span><b>${name}</b><small>${ok?(on?'Wearing':'Tap to wear'):note}</small></button>`;
function outfitChanged(el){ bumpStat('outfits'); save(); if(hHead) homeReact('joy'); renderWardrobe(); const on=$('wardGrid').querySelector('.hat.on'); if(on) settle(on); }
function wearHat(id){ hatId=id; store.set('squirm-hat',hatId); dressHat(hHead); dressHat(segMeshes[0]); }
function wearColour(i){ wormCol=i; store.set('squirm-colour',String(i)); applyWormColour(); }
function wearPattern(id){ wormPat=id; store.set('squirm-pattern',wormPat); applyWormColour(); }
function wearExtra(id){ extraId=id; store.set('squirm-extra',extraId); dressExtra(hHead); dressExtra(segMeshes[0]); }
function renderWardrobe(){ const hats=HATS.filter(hatUnlocked), cols=coloursUnlocked(), pats=patternsUnlocked(), exs=EXTRAS.filter(e=>e[3]()), hat=HATS.find(h=>h[0]===hatId)||HATS[0], ex=EXTRAS.find(e=>e[0]===extraOn());
  $('outfitLine').textContent=[hat[0]==='none'?'No hat':hat[1],WORM_COLS[wormCol][0],PATTERNS.find(x=>x[0]===patOn())[1],...(ex[0]==='none'?[]:[ex[1]])].join(' · ');
  const n={hats:[hats.length-1,HATS.length-1],colours:[cols,WORM_COLS.length],patterns:[pats.length,PATTERNS.length],extras:[exs.length-1,EXTRAS.length-1]};
  qa($('wardSeg'),'button').forEach(b=>{ const on=b.dataset.w===wardTab, c=n[b.dataset.w]; b.classList.toggle('on',on); b.setAttribute('aria-selected',String(on)); b.querySelector('small').textContent=`${c[0]} of ${c[1]}`; });
  const g=$('wardGrid'); g.className=`hat-grid fade-scroll ward-${wardTab}`;
  if(wardTab==='hats') g.innerHTML=HATS.map(h=>tile('h',h[0],h[0]===hatId,hatUnlocked(h),hatArt(h[0]),h[1],h[3]||`Finish ${CHAPTERS[h[2]]?CHAPTERS[h[2]].name:'a chapter'}`)).join('');
  else if(wardTab==='extras') g.innerHTML=EXTRAS.map(e=>tile('x',e[0],e[0]===extraOn(),e[3](),extraArt(e[0],44),e[1],e[2])).join('');
  else if(wardTab==='colours') g.innerHTML=WORM_COLS.map((c,i)=>tile('c',i,i===wormCol,i<cols,patArt(patOn(),46,i),c[0],`${c[3]} stars`)).join('');
  else g.innerHTML=PATTERNS.map(p=>tile('p',p[0],p[0]===patOn(),pats.includes(p[0]),patArt(p[0],46),p[1],p[2])).join('');
  renderTints();
  qa(g,'button').forEach(b=>b.onclick=()=>{
    if(b.dataset.h){ const h=HATS.find(x=>x[0]===b.dataset.h); if(!hatUnlocked(h)){ nope(b,h[3]?`${h[1]}: ${h[3].charAt(0).toLowerCase()+h[3].slice(1)} to earn it.`:`Finish every patch in ${CHAPTERS[h[2]].name} to earn the ${h[1].toLowerCase()}.`,2800); return; } wearHat(h[0]); }
    else if(b.dataset.x){ const e=EXTRAS.find(x=>x[0]===b.dataset.x); if(!e[3]()){ nope(b,`${e[1]}: ${e[2].charAt(0).toLowerCase()+e[2].slice(1)} to earn it.`,2800); return; } wearExtra(e[0]); }
    else if(b.dataset.c!=null){ const i=+b.dataset.c, c=WORM_COLS[i]; if(i>=coloursUnlocked()){ nope(b,`${c[0]} unlocks at ${c[3]} stars. You have ${starTotal()}.`,2600); return; } wearColour(i); }
    else { const p=PATTERNS.find(x=>x[0]===b.dataset.p); if(!p[3]()){ nope(b,`${p[1]}: ${p[2].charAt(0).toLowerCase()+p[2].slice(1)} to earn it.`,2800); return; } wearPattern(p[0]); }
    outfitChanged(); }); }
// a colour picker for the hat or extra being worn, only on its tab and only for items with colour options
function renderTints(){ const row=$('wardTint'), id=wardTab==='hats'?hatId:wardTab==='extras'?extraOn():null, t=id&&TINTS[id];
  const item=t&&(wardTab==='hats'?HATS.find(h=>h[0]===id):EXTRAS.find(e=>e[0]===id));
  row.hidden=!t; if(!t) return; const k=tintOf(id);
  row.innerHTML=`<span class="tint-lbl">${item[1]}<small>${t.opts[k][0]}</small></span>`+t.opts.map((o,i)=>`<button role="radio" class="tint${i===k?' on':''}" aria-checked="${i===k}" aria-label="${o[0]}" data-t="${i}"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="${hexStr(o[1])}" stroke="#5B4436" stroke-width="2"/>${o[2]!=null?`<path d="M12 21.5a9.5 9.5 0 0 1 0-19z" fill="${hexStr(o[2])}" stroke="#5B4436" stroke-width="2" transform="rotate(45 12 12)"/>`:''}</svg></button>`).join('');
  qa(row,'button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.t; if(i===tintOf(id)) return; tints[id]=i; store.set('squirm-tints',JSON.stringify(tints));
    if(wardTab==='hats'){ dressHat(hHead); dressHat(segMeshes[0]); } else { dressExtra(hHead); dressExtra(segMeshes[0]); }
    outfitChanged(); settle($('wardTint').querySelector('.tint.on')); }); }
qa($('wardSeg'),'button').forEach(b=>b.onclick=()=>{ if(wardTab===b.dataset.w) return; wardTab=b.dataset.w; renderWardrobe(); $('wardGrid').scrollTop=0; settle(b);
  stagger(qa($('wardGrid'),'button'),'rise',0,22,12); });
// a random outfit from what's unlocked, different from the current one where possible
$('dressRandom').onclick=()=>{ const pick=(a,cur)=>{ const o=a.filter(x=>x!==cur); return (o.length?o:a)[Math.floor(Math.random()*(o.length||a.length))]; };
  for(const k in TINTS) if(Math.random()<.5) tints[k]=Math.floor(Math.random()*TINTS[k].opts.length); store.set('squirm-tints',JSON.stringify(tints)); bumpStat('outfits');
  wearHat(pick(HATS.filter(hatUnlocked).map(h=>h[0]),hatId)); wearColour(pick([...Array(coloursUnlocked()).keys()],wormCol)); wearPattern(pick(patternsUnlocked(),patOn())); wearExtra(pick(EXTRAS.filter(e=>e[3]()).map(e=>e[0]),extraOn()));
  if(hHead) homeReact('wow'); renderWardrobe(); };
const DIFF_ICON_KEY={easy:'sprout',medium:'tulip',hard:'tree'};
// short names for the mechanic tiles; the full name goes in the label
const FEAT_SHORT={flags:'Flags',buttons:'Flowers',leaves:'Leaves',fruit:'Fruit',keys:'Keys',portals:'Tunnels',dry:'Dry',rain:'Rain',rivers:'Rivers',snails:'Snails',beetles:'Beetles',pollen:'Pollen',soil:'Soil'};
const DIFF_DESC={easy:'Small patches. A gentle stroll.',medium:'Roomier patches with a few more twists.',hard:'Big patches, longer worms, real head-scratchers.'};
function renderEndless(anim){ const e=progress.endless[endlessDiff];
  const h=$('mHero'); h.dataset.d=endlessDiff;
  h.innerHTML=`<span class="m-em" aria-hidden="true">${art(DIFF_ICON_KEY[endlessDiff],46)}</span><div class="m-info"><b>${DIFF_NAME[endlessDiff]}</b><span class="m-desc">${DIFF_DESC[endlessDiff]}</span>`
    +`<div class="m-chips"><span>${art('flame',18)}${e.streak}<small>streak</small></span><span>${art('trophy',18)}${e.best}<small>best</small></span><span>${art('star',18)}${e.stars}<small>stars</small></span><span>${art('sprout',18)}${e.cleared}<small>cleared</small></span></div></div>`;
  if(anim) animOnce(h,'swap');
  $('diffSeg').innerHTML=['easy','medium','hard'].map(d=>`<button role="radio" aria-checked="${d===endlessDiff}" data-d="${d}" class="diff ${d===endlessDiff?'on':''}">${art(DIFF_ICON_KEY[d],22)}<b>${DIFF_NAME[d]}</b></button>`).join('');
  $('diffSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(endlessDiff===b.dataset.d) return; endlessDiff=b.dataset.d; renderEndless(true); settle($('diffSeg').querySelector('.diff.on')); });
  $('featGrid').innerHTML=FEATURES.map(([k,n])=>`<button role="checkbox" aria-checked="${!!endlessOpts[k]}" aria-label="${n}" title="${n}" data-k="${k}" class="mech ${endlessOpts[k]?'on':''}"><span class="mi" aria-hidden="true">${MECH[k].i}</span>${FEAT_SHORT[k]}<span class="ok" aria-hidden="true">${UI_ICON.check}</span></button>`).join('');
  $('featGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; endlessOpts[k]=!endlessOpts[k]; sfx(endlessOpts[k]?'on':'off'); renderEndless(); settle($('featGrid').querySelector(`[data-k="${k}"]`)); });
  const on=FEATURES.filter(([k])=>endlessOpts[k]).length; $('mixCount').textContent=on?`${on} of ${FEATURES.length}`:'just the basics';
  $('mixAll').textContent=on===FEATURES.length?'None':'All';
  const r=readResume('endless'); $('homeEndlessCont').hidden=!(r&&r.def&&!r.def.daily&&r.diff===endlessDiff);
}
// All turns every mechanic on; once they all are, the same link clears them back to just the basics
$('mixAll').onclick=()=>{ const all=FEATURES.every(([k])=>endlessOpts[k]); FEATURES.forEach(([k])=>endlessOpts[k]=!all); sfx(all?'off':'on'); renderEndless(); if(!all) qa($('featGrid'),'.mech.on').forEach(settle); };
// the patch to continue with: the current one, or the next if the current one is already cleared
function nextGardenIndex(){ const i=currentGardenIndex(); if(!isCleared(i)) return i;
  for(let j=i+1;j<LEVELS.length;j++) if(!isCleared(j)&&isUnlocked(j)) return j; return i; }
$('homePlay').onclick=()=>{ ensureAudio(); if(allCleared()){ showFinale(true); return; } hideAll(); loadLevel(nextGardenIndex()); enterGame(); };
