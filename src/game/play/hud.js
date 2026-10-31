// ---------- HUD ----------
function hudSub(){ if(mode==='garden'){ const ch=CHAPTERS.find(c=>li>=c.from&&li<=c.to); return ch?`${ch.name} · ${li-ch.from+1} of ${ch.to-ch.from+1}`:''; }
  if(L.daily) return 'Daily patch'; const k=progress.endless[endlessDiff].streak; return 'Endless · '+DIFF_NAME[endlessDiff]+(k?` · streak ${k}`:''); }
function statTip(k){ const par=curPar(), len=state.segs.length, fruit=/[+-]/.test(state.grid.map(r=>r.join('')).join(''));
  if(k==='moves') return `Par is ${par}. Finish in ${par} moves for 3 stars, or within ${Math.ceil(par*1.3)} for 2.`;
  if(k==='flags') return 'Touch every flag before the burrow will let you in.';
  if(k==='keys') return 'Each key opens one gate, then it is used up.';
  if(len===state.exitLen) return 'You are just the right length for the burrow.';
  return `The burrow fits a worm of ${state.exitLen}. You are ${len}.`+(fruit?(len<state.exitLen?' A peach makes you longer.':' A mushroom makes you shorter.'):''); }
document.querySelector('.hud-stats').addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.closest('.stat')){ e.preventDefault(); e.target.click(); } });
document.querySelector('.hud-stats').addEventListener('click',e=>{ const st=e.target.closest('.stat'); if(!st||!state) return; toast(statTip(st.dataset.tip||'moves'),3400); });
// one HUD tile: tip picks its statTip, v is the value row and k the caption under it; tappable unless tap is false
const hudTile=(tip,cls,label,v,k,tap=true)=>`<span${tap?' role="button" tabindex="0"':''} class="stat${cls?' '+cls:''}" data-tip="${tip}" aria-label="${label}"><span class="v">${v}</span><span class="k">${k}</span></span>`;
let shownStars=3;
function updateHUD(silent){
  $('lvlNum').style.fontSize=String(mode==='garden'?li+1:0).length>2?'16px':'';
    $('lvlNum').textContent= mode==='garden' ? li+1 : L.daily ? new Date().getDate() : (progress.endless[endlessDiff].cleared+1);
    $('lvlName').textContent=L.name;
  $('lvlSub').textContent=hudSub(); document.body.dataset.mode=mode;
  const tabTitle=(mode==='garden'?`${li+1} · `:'')+L.name+' · Squirm'; if(document.title!==tabTitle&&!$('homeOv').classList.contains('show')) document.title=tabTitle;
  const now=starsFor(state.moves,curPar(),hintsUsed>0), meter=[0,1,2].map(j=>`<i class="${j<now?'on':''}"></i>`).join('');
  const mv=$('moves'), mvHtml=`<span class="v">${sticker(ICON.steps)}<b>${state.moves}</b></span><span class="k mv"><em class="mini" aria-hidden="true">${meter}</em><span class="par">par ${curPar()}</span></span>`;
  if(mv.innerHTML!==mvHtml){ mv.innerHTML=mvHtml; if(!silent){ if(now<shownStars) animOnce(mv,'lost'); else pulse(mv); } }
  shownStars=now;
  mv.setAttribute('aria-label',`${state.moves} ${state.moves===1?'move':'moves'}, par ${curPar()}, on track for ${now} ${now===1?'star':'stars'}`); mv.classList.toggle('over',state.moves>curPar());
  const chips=[], map=L.map.join(''), flagsTotal=map.split('C').length-1;
  if(flagsTotal){ const left=countChar(state,'C');
    chips.push(hudTile('flags',left===0&&'done',`Flags ${flagsTotal-left} of ${flagsTotal}`,`${sticker(ICON.flag)}<b>${flagsTotal-left}</b><small>/${flagsTotal}</small>`,left?'Flags':'All flags')); }
  if(map.includes('K')) chips.push(hudTile('keys','',`${state.keys} ${state.keys===1?'key':'keys'}`,`${sticker(ICON.key)}<b>${state.keys}</b>`,state.keys===1?'Key':'Keys',false));
  const ok=state.segs.length===state.exitLen;
  chips.push(hudTile('length',ok&&'done',`Length ${state.segs.length}, burrow fits ${state.exitLen}`,
    `${sticker(ICON.worm)}<b>${state.segs.length}</b><span class="to" aria-hidden="true">${ok?'=':'&rarr;'}</span><b>${state.exitLen}</b>`,ok?'Fits!':'Length'));
  const html=chips.join('');
    if($('chips').innerHTML!==html){ const prev=[...$('chips').children], old=prev.map(c=>c.textContent), wasDone=prev.map(c=>c.classList.contains('done'));
    $('chips').innerHTML=html;
    if(!silent) [...$('chips').children].forEach((c,i)=>{ if(c.classList.contains('done')&&!wasDone[i]) animOnce(c,'cheer'); else if(old[i]!==c.textContent) pulse(c); });
      }
  for(const [id,off] of [['undoBtn',!history.length&&state.moves===0]]){ const b=$(id); if(b.disabled&&!off&&!silent) animOnce(b,'pop'); b.disabled=off; }
  const ready = countChar(state,'C')===0 && ok;
  if(ready && !wasReady && !silent && state.status==='play'){ sfx('ready'); glanceT=1.4; }
  wasReady=ready;
  for(const row of cells) for(const c of row) if(c.item&&c.item.userData.rim){ c.item.userData.rim.material = ready? m('ready') : toon(C.mound);
    c.item.userData.ready=ready; if(c.item.userData.signBoard) c.item.userData.signBoard.material = ready? m('ready') : m('plank'); }
}
