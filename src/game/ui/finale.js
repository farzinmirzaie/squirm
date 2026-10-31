// ---------- the whole garden: what to do once every patch is cleared ----------
function allCleared(){ return LEVELS.every((l,i)=>isCleared(i)); }
function shineable(){ return LEVELS.map((l,i)=>i).filter(i=>isCleared(i)&&(progress.stars[LEVELS[i].name]||0)<3); }
function renderFinale(){
  const todo=shineable(), left=BADGES.filter(b=>!progress.badges[b[0]]), dailyDone=!!progress.daily.results[todayKey()];
  $('finStats').innerHTML=`<div class="m-stat"><span class="ic" aria-hidden="true">${art('star',26)}</span><b>${starTotal()}</b><small>of ${LEVELS.length*3} stars</small></div>`
    +`<div class="m-stat"><span class="ic" aria-hidden="true">${art('medal',26)}</span><b>${Object.keys(progress.badges).length}</b><small>of ${BADGES.length} badges</small></div>`
    +`<div class="m-stat"><span class="ic" aria-hidden="true">${art('worm',26)}</span><b>${(progress.stats.moves||0).toLocaleString()}</b><small>moves</small></div>`;
  const row=(go,ico,title,sub,done)=>`<button class="set-link${done?' is-done':''}" data-go="${go}"><span class="set-ico" aria-hidden="true">${art(ico,28)}</span><span><b>${title}</b><small>${sub}</small></span><span class="chev" aria-hidden="true">${done?UI_ICON.check:UI_ICON.chev}</span></button>`;
  $('finNext').innerHTML=
    row('shine','star',todo.length?'Shine up your stars':'Every patch has 3 stars',todo.length?`${todo.length} can earn more · next: ${LEVELS[todo[0]].name}`:'Not a single star left to find. Wow.',!todo.length)
    +row('badges','medal',left.length?'Badges to find':'Every badge found',left.length?`${left.length} to go, like ${left.slice(0,2).map(b=>b[2]).join(' and ')}`:'You found every last one.',!left.length)
    +row('meadow','daisy','Endless meadow','Fresh patches, as many as you like',false)
    +row('daily','calendar','Daily patch',dailyDone?'Done today. A new one grows tomorrow.':'A new one for everyone, every day',dailyDone);
  qa($('finNext'),'.set-link').forEach(b=>b.onclick=()=>finGo(b.dataset.go,b)); }
// push: open it as a new layer (from home); otherwise the caller already put a 'finale' layer in place
function showFinale(push){ renderFinale(); show('finOv'); if(push) pushLayer('finale'); petals(); sfx('badge'); stagger(qa($('finOv'),'.fin-emb,.m-stat,.set-link'),'rise',100,60); }
// each choice takes over the finale's place in the back stack, so back leads home
function finGo(k,el){
  if(k==='shine'){ const t=shineable(); if(!t.length){ nope(el,'Every patch already has 3 stars.'); return; } layers[layers.length-1]='game'; hideAll(); loadLevel(t[0]); return; }
  if(k==='daily'){ if(progress.daily.results[todayKey()]){ nope(el,'Today\'s patch is done. Come back tomorrow for a new one.'); return; } layers[layers.length-1]='game'; hide('finOv'); $('dailyBtn').onclick(); return; }
  layers[layers.length-1]='tab'; hide('finOv'); showTab(k,true); }
$('finClose').onclick=()=>{ hide('finOv'); popLayer('finale'); renderHome(); };
$('endlessGo').onclick=()=>{ newEndless(); };
$('surprise').onclick=()=>{ const ks=['fruit','keys','portals','dry','rain','rivers','snails','buttons','leaves','beetles','pollen','soil']; ks.forEach(k=>endlessOpts[k]=false); endlessOpts.flags=Math.random()<.8;
  const n=2+Math.floor(Math.random()*2); for(let i=0;i<n;i++) endlessOpts[ks[Math.floor(Math.random()*ks.length)]]=true; renderEndless(); qa($('featGrid'),'.mech.on').forEach(settle); };
$('meadowBtn').onclick=()=>{ ensureAudio(); if(!continueEndless()) newEndless(); };
// the badge closest to being earned, as a little goal on the Play tab; tapping opens it on the Badges tab
function renderGoal(){ const g=$('goalCard'), id=nearestBadge(), b=badgeById(id), p=badgeProg(b);
  if(!b||progress.badges[id]){ g.hidden=true; return; } g.hidden=false; g.dataset.b=id;
  g.innerHTML=`<span class="b-medal" aria-hidden="true">${art(b[1],32)}<span class="b-lock">${art('lock',12)}</span></span><span class="gt"><small>${p?'Almost there':'Next badge'}</small><b>${b[2]}</b>`
    +(p?`<span class="gbar"><span class="b-bar" style="--p:${pct(p)}"></span>${p[0].toLocaleString()} of ${p[1].toLocaleString()}</span>`:`<em>${b[3]}</em>`)+`</span>`; }
$('goalCard').onclick=()=>{ badgeSel=$('goalCard').dataset.b; badgeFilter='all'; showTab('badges'); };
// the worm says hello: by time of day, about today's daily, and something new each time it's tapped
const SAY_TAP=['Hi there!','That tickles!','Wheee!','Hello, friend!','*wiggle wiggle*','I like your hat.','Shall we crawl?','Mmm, peaches.'];
let sayI=0;
function say(t){ const el=$('wormSay'); if(!el||el.textContent===t) return; el.textContent=t; animOnce(el,'say'); }
function sayHello(){ const h=new Date().getHours(), d=progress.daily, done=!!d.results[todayKey()];
  const hi=h<5?'Up late?':h<12?'Good morning!':h<18?'Hello again!':'Good evening!', played=LEVELS.some((l,i)=>isCleared(i));
  say(!done&&played?`${hi} Today's patch is ready.`:h<5?'Up late? Me too.':hi); }
$('dailyBtn').onclick=()=>{ ensureAudio(); const r=readResume('endless'); if(r&&r.def&&r.def.daily===todayKey()){ mode='endless'; hideAll(); startLevel(r.def,false); enterGame(); return; } startDaily(); };
$('homeEndlessCont').onclick=()=>{ continueEndless(); };
$('homeSound').onclick=()=>toggleMute($('homeSound'));
// colour theme: follow the system, or force light or dark
const THEMES=['auto','light','dark'];
let theme=store.get('squirm-theme')||'auto'; if(!THEMES.includes(theme)) theme='auto';
function applyTheme(){ if(theme==='auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=theme;
  $('setTheme').querySelectorAll('button').forEach(b=>{ const on=b.dataset.t===theme; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); }); }
$('setTheme').querySelectorAll('button').forEach(b=>b.onclick=()=>{ theme=b.dataset.t; store.set('squirm-theme',theme); applyTheme(); settle(b); });
applyTheme();

