// ---------- levels: starting a patch, and the garden map ----------
function loadLevel(i,withHint=true){ mode='garden'; li=i; startLevel(LEVELS[i],withHint); store.set('squirm-current-name',LEVELS[i].name); }
let nudged=false, playT=0;
const playTime=()=>{ const s=Math.round(playT); return s<60?`${s}s`:`${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`; };
let pollensHere=new Set();
function startLevel(def,withHint=true){ nudged=false; playT=0; pollensHere=new Set();
  L=def; state=initState(L); history=[]; queue.length=0; slideSteps.length=0; wasReady=false; hintsUsed=0; undosHere=0; clearHint(); $('wormSayG').hidden=true; gSayT=0;
  buildBoard(); snapWorm(); fitCamera(); updateHUD(true); hudIntro(); lastMoveT=idleT;
  const resumed=tryResume(); if(!resumed) clearResume();
  introAnim();
  if(resumed) toast('Picking up where you left off.',2400);
  else if(withHint){ const nm=newMechanics(); if(nm.length) setTimeout(()=>{ if(!$('homeOv').classList.contains('show')) showIntro(nm,()=>maybeTutorial()); },reduceMotion?0:900); else maybeTutorial(); }
  $('skipBtn').hidden = mode!=='endless' || !!L.daily;
}
function introAnim(){ if(reduceMotion) return;
  const items=[...snailMeshes,...beetleMeshes].map(s=>({o:s,d:.3,y0:s.position.y})); [...snailMeshes,...beetleMeshes].forEach(s=>s.scale.setScalar(.01)); for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++){ const c=cells[y][x]; [c.tile,c.item].forEach((o,j)=>{ if(o){ items.push({o,d:(x+y)*.035+j*.08,y0:o.position.y}); o.scale.setScalar(.01); } }); }
  const worm=segMeshes.slice(); worm.forEach(s=>s.scale.setScalar(.01)); wormG.visible=false;
  const total=.55+(state.w+state.h)*.035+.35; animating++;
  const back=t=>{ const c1=1.70158, c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
  tween(total*1000,(e,k)=>{ const tt=k*total;
    items.forEach(it=>{ const t=Math.max(0,Math.min(1,(tt-it.d)/.4)); it.o.scale.setScalar(Math.max(.01,back(t))); it.o.position.y=it.y0-(1-t)*.5; });
    const wt=Math.max(0,Math.min(1,(tt-(total-.45))/.4)); wormG.visible=wt>0; worm.forEach(s=>s.scale.setScalar(Math.max(.01,back(wt)))); },
    ()=>{ items.forEach(it=>{ it.o.scale.setScalar(1); it.o.position.y=it.y0; }); worm.forEach(s=>s.scale.setScalar(1)); wormG.visible=true; animating--; if(queue.length) tryMove(queue.shift()); });
}
const CHAPTERS=CHAPTER_NAMES.map((name,k)=>({name,from:k*10,to:Math.min(LEVELS.length-1,k*10+9)}));
const THUMB_COL={'O':'#7C8CF0','B':'#F7A8C4','H':'#4E8F40','i':'#8EE0B4','<':'#C9A0E6','>':'#C9A0E6','^':'#C9A0E6','v':'#C9A0E6','.':'#B9E49E','x':'#EBD59C','~':'#8CCFEA','=':'#D9A56E','|':'#D9A56E','E':'#3A2A22','C':'#F27DA2','K':'#F7C64F','G':'#C88A55','+':'#FFA27C','-':'#B79CF2','R':'#C9D6EA','w':'#9ED6EF','s':'#7CC95F','L':'#B98352','P':'#FF7A6B','Y':'#FFC63A','U':'#63A9F2','p':'#FFC6BC','y':'#FFE9A6','u':'#C4E2FF','#':'#C99063'};
function drawThumb(cv,lv){ const g=cv.getContext('2d'); const h=lv.map.length, w=Math.max(...lv.map.map(r=>r.length)); const s=Math.floor(80/Math.max(w,h)), ox=(88-w*s)/2, oy=(88-h*s)/2;
  g.fillStyle='#9A6A4C'; g.fillRect(0,0,88,88);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const c=lv.map[y][x]||' '; if(c===' ') continue; g.fillStyle=THUMB_COL[c]||(c>='1'&&c<='9'?'#7FCFEA':'#B9E49E'); g.fillRect(ox+x*s+1,oy+y*s+1,s-2,s-2); }
  g.fillStyle='#FF8FAF'; lv.worm.forEach(p=>{ g.fillRect(ox+p[0]*s+2,oy+p[1]*s+2,s-4,s-4); }); }
// the garden map: one little scene per chapter, its patches stepping stones along a winding path
const SCENE_COL=['#CFEFB8','#FFD9C2','#E2D6FA','#FFE9A8','#CBE7F7','#FBD3E0','#D3EFD0','#F3DCC4','#CFE1F8','#F8D8EA','#D9F2C9','#FFD6DE','#C9EEDF','#FFE0C2','#FFF0A8','#D9DEFC','#E8F2C0','#F9D2BE','#FDE0EA','#EED9C4','#DCEFD6','#E6EDC8'];
const SCENE_DECO=[['sprout','flag'],['peach','mushroom'],['wheat','crack'],['key','sunflower'],['tunnel','sprout'],['drop','rain'],['bridge','drop'],['blossom','butterfly'],['tree','bee'],['daisy','leaf'],['snail','leaf'],['blossom','hedge'],['wetleaf','drop'],['balloon','bowtie'],['sunflower','stars'],['beetle','daisy'],['snail','beetle'],['moon','wheat'],['pollenY','butterfly'],['soil','sprout'],['pollenU','soil'],['tree','flag']];
// a few pebble outlines so the stepping stones don't all look stamped from one mould
const STONES=['48% 52% 46% 54% / 56% 50% 50% 44%','54% 46% 52% 48% / 48% 56% 44% 52%','46% 54% 50% 50% / 52% 46% 54% 48%','52% 48% 56% 44% / 50% 54% 46% 50%','50% 50% 44% 56% / 46% 52% 48% 54%'];
const LOCK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M8 10.5V8.2a4 4 0 0 1 8 0v2.3"/><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M12 14.6v2.2"/></svg>';
let picked=-1;
function renderLevelList(){
  const g=$('lvGrid'); g.innerHTML=''; const stars=i=>progress.stars[LEVELS[i].name]||0;
  let total=0; LEVELS.forEach((l,i)=>total+=stars(i)); $('lvTotal').innerHTML=`${STAR(true,0).replace('width="44" height="44"','width="20" height="20"')} ${total} of ${LEVELS.length*3}`;
  const grown=LEVELS.filter((l,i)=>isCleared(i)).length; $('lvBar').style.setProperty('--p',(100*grown/LEVELS.length).toFixed(1)+'%'); $('lvGrown').textContent=`${grown} of ${LEVELS.length} patches grown`;
  $('chStrip').innerHTML=CHAPTERS.map((ch,k)=>{ const n=ch.to-ch.from+1, open=isUnlocked(ch.from), hat=HATS.find(h=>h[2]===k); let c=0; for(let i=ch.from;i<=ch.to;i++) if(isCleared(i)) c++;
    return `<button class="ch-chip ${c===n?'done':''} ${open?'':'locked'}" role="tab" data-k="${k}" aria-label="Chapter ${k+1}, ${ch.name}, ${c} of ${n} grown"><span class="ring" style="--p:${(100*c/n).toFixed(1)}%"><span class="emb">${open&&hat?hatArt(hat[0],28):art(open?'sprout':'lock',open?24:20)}</span></span>${k+1}</button>`; }).join('');
  qa($('chStrip'),'.ch-chip').forEach(b=>b.onclick=()=>{ const sc=g.querySelector(`.scene[data-k="${b.dataset.k}"]`); if(!sc) return;
    g.scrollTo({top:g.scrollTop+sc.getBoundingClientRect().top-g.getBoundingClientRect().top-2,behavior:reduceMotion?'auto':'smooth'}); markChapter(+b.dataset.k); settle(b.querySelector('.ring')); });
  const RH=96, TOP=56; let shownLocked=false;
  CHAPTERS.forEach((ch,k)=>{ const n=ch.to-ch.from+1, open=isUnlocked(ch.from); let cs=0, allDone=true, fresh=ch.from>0&&open;
    for(let i=ch.from;i<=ch.to;i++){ cs+=stars(i); if(!isCleared(i)) allDone=false; else fresh=false; }
    const hat=HATS.find(h=>h[2]===k), sc=document.createElement('section'); sc.className='scene'+(open?'':' later'); sc.dataset.k=k; sc.style.setProperty('--scene',SCENE_COL[k%SCENE_COL.length]);
    const sub=!open?(shownLocked?'Locked':`Finish ${CHAPTERS[k-1].name} to open`):allDone?(hat?`${hat[1]} earned`:'All done'):(hat?`Reward: ${hat[1].toLowerCase()}`:`${n} patches`);
    sc.innerHTML=`<div class="ch-banner"><span class="emb" aria-hidden="true">${!open?art('lock',28):hat?hatArt(hat[0],34):art('sprout',30)}</span><span class="tt"><b>${ch.name}${fresh?' <small class="new">New</small>':''}</b><small>${sub}</small></span><span class="cnt">${allDone?`<span class="done" aria-label="Finished">${UI_ICON.check}</span>`:''}${open?STAR(true,0).replace('width="44" height="44"','width="18" height="18"')+`${cs}/${n*3}`:''}</span></div>`;
    g.appendChild(sc);
    // a chapter you can't reach yet is just its banner and a row of dots
    if(!open){ shownLocked=true; sc.insertAdjacentHTML('beforeend',`<div class="peek" aria-hidden="true">${'<i></i>'.repeat(n)}</div>`); return; }
    const tr=document.createElement('div'); tr.className='trail'; const H=TOP+(n-1)*RH+56; tr.style.height=H+'px'; sc.appendChild(tr);
    const pts=[]; for(let j=0;j<n;j++) pts.push([50+28*Math.sin(j*1.05+k*1.7),TOP+j*RH]);
    const pathTo=last=>pts.slice(0,last+1).map((p,j)=>j?`C${pts[j-1][0]},${pts[j-1][1]+RH/2} ${p[0]},${p[1]-RH/2} ${p[0]},${p[1]}`:`M${p[0]},${p[1]}`).join(' ');
    let walked=-1; for(let j=0;j<n;j++) if(isUnlocked(ch.from+j)) walked=j;
    tr.innerHTML=`<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="road" d="${pathTo(n-1)}"/><path class="edge" d="${pathTo(n-1)}"/>${walked>0?`<path class="walked" d="${pathTo(walked)}"/>`:''}</svg>`;
    // a few garden bits near the edges, away from the path
    const deco=SCENE_DECO[k%SCENE_DECO.length]; [1,4,7].forEach((j,q)=>{ const x=pts[j][0]; const d=document.createElement('span'); d.className='deco'; d.innerHTML=art(deco[q%2],26);
      d.style.left=(x<50?88:12)+'%'; d.style.top=(pts[j][1]+RH/2)+'px'; d.style.setProperty('--r',((j*37+k*11)%40-20)+'deg'); tr.appendChild(d); });
    for(let j=0;j<n;j++){ const i=ch.from+j, lv=LEVELS[i], st=stars(i), best=progress.best[lv.name], locked=!isUnlocked(i), [x,y]=pts[j];
      const b=document.createElement('button'); b.className='node'+(i===li?' cur':'')+(locked?' locked':isCleared(i)?' done':'')+(st===3?' gold':''); b.dataset.i=i;
      b.style.left=x+'%'; b.style.top=y+'px';
      b.setAttribute('aria-label',`Patch ${i+1}, ${lv.name}`+(locked?', locked':`, ${st} ${st===1?'star':'stars'}${best?`, best ${best}`:''}, par ${lv.par}`));
      b.style.setProperty('--shape',STONES[(i*7+3)%STONES.length]);
      b.innerHTML=(locked?LOCK_SVG:`${i+1}`)+(locked?'':`<em class="mini" aria-hidden="true">${[0,1,2].map(q=>`<i class="${q<st?'on':''}"></i>`).join('')}</em>`);
      // first tap picks the stone and shows its card; tapping it again (or Play) opens it
      b.onclick=()=>{ if(locked){ nope(b,`Finish patch ${i} first, then this one opens.`,2200); return; }
        if(picked===i){ playPicked(); return; } pickPatch(i,true); };
      tr.appendChild(b); } });
  // the end of the map: what's next once it's all grown, or a note that more is on the way
  const end=document.createElement('div'); end.className='map-end';
  end.innerHTML=allCleared()?`<span class="emb" aria-hidden="true">${art('crown',30)}</span><b>The whole garden is grown!</b><small>More patches are growing and will show up here by themselves.</small><button class="btn primary">What's next?</button>`
    :`<span aria-hidden="true">${art('sprout',30)}</span><b>More patches are growing</b><small>New ones will show up here by themselves when they're ready.</small>`;
  const eb=end.querySelector('button'); if(eb) eb.onclick=()=>showFinale(true); g.appendChild(end);
  pickPatch(isUnlocked(li)?li:0,false);
  setTimeout(()=>{ const c=g.querySelector('.node.sel'); if(c) c.scrollIntoView({block:'center'}); spyChapter(); },30);
}
// the chip of the chapter in view lights up, and the strip keeps it on screen
function markChapter(k){ qa($('chStrip'),'.ch-chip').forEach(b=>{ const on=+b.dataset.k===k; b.classList.toggle('on',on); b.setAttribute('aria-selected',String(on));
  if(on){ const st=$('chStrip'), l=b.offsetLeft-st.offsetLeft, want=l-(st.clientWidth-b.offsetWidth)/2; if(Math.abs(st.scrollLeft-want)>20) st.scrollTo({left:want,behavior:reduceMotion?'auto':'smooth'}); } }); }
let spyQ=false;
function spyChapter(){ const g=$('lvGrid'), top=g.getBoundingClientRect().top+60; let k=0; qa(g,'.scene').forEach(sc=>{ if(sc.getBoundingClientRect().top<=top) k=+sc.dataset.k; }); markChapter(k); }
$('lvGrid').addEventListener('scroll',()=>{ if(spyQ) return; spyQ=true; requestAnimationFrame(()=>{ spyQ=false; spyChapter(); }); },{passive:true});
function pickPatch(i,anim){ picked=i; const lv=LEVELS[i], st=progress.stars[lv.name]||0, best=progress.best[lv.name], ch=CHAPTERS.find(c=>i>=c.from&&i<=c.to);
  document.querySelectorAll('#lvGrid .node').forEach(n=>n.classList.toggle('sel',+n.dataset.i===i));
  const p=$('lvPick'); p.innerHTML=`<canvas class="thumb" width="88" height="88" aria-hidden="true"></canvas><span class="pt"><b>${i+1}. ${lv.name}</b><small><em class="mini" aria-hidden="true">${[0,1,2].map(q=>`<i class="${q<st?'on':''}"></i>`).join('')}</em>${best?`best ${best} · par ${lv.par}`:`par ${lv.par}`}</small><small>${ch?ch.name:''}<span class="mechs" aria-hidden="true">${Object.keys(MECH).filter(k=>k!=='basics'&&MECH[k].k.test(lv.map.join(''))).map(k=>MECH[k].i.replace(/width="40" height="40"/,'width="21" height="21"').replace(/stroke-width="[\d.]+"/,'stroke-width="2.2"')).join('')}</span></small></span><button class="go" aria-label="Play patch ${i+1}"><svg width="26" height="26" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg></button>`;
  drawThumb(p.querySelector('canvas'),lv); p.querySelector('.go').onclick=playPicked;
  if(anim){ settle(document.querySelector('#lvGrid .node.sel')); animOnce(p,'swap'); } }
function playPicked(){ if(picked<0) return; hideAll(); loadLevel(picked); enterGame(); }

