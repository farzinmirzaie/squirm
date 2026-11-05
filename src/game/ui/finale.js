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
function showFinale(push){ renderFinale(); show('finOv'); if(push) pushLayer('finale'); petals(); sfx('badge');
  stagger(qa($('finOv'),'.fin-emb,.m-stat,.set-link'),'rise',100,60); }
// each choice takes over the finale's place in the back stack, so back leads home
function finGo(k,el){
  if(k==='shine'){ const t=shineable(); if(!t.length){ nope(el,'Every patch already has 3 stars.'); return; } layers[layers.length-1]='game'; hideAll();
    loadLevel(t[0]); return; }
  if(k==='daily'){ if(progress.daily.results[todayKey()]){ nope(el,'Today\'s patch is done. Come back tomorrow for a new one.'); return;
    } layers[layers.length-1]='game'; hide('finOv'); $('dailyBtn').onclick(); return; }
  layers[layers.length-1]='tab'; hide('finOv'); showTab(k,true); }
$('finClose').onclick=()=>{ hide('finOv'); popLayer('finale'); renderHome(); };
$('endlessGo').onclick=()=>{ newEndless(); };
$('surprise').onclick=()=>{ const ks=['fruit','keys','portals','dry','rain','rivers','snails','buttons','leaves','beetles','pollen','soil','turn'];
  ks.forEach(k=>endlessOpts[k]=false); endlessOpts.flags=Math.random()<.8;
  const n=2+Math.floor(Math.random()*2); for(let i=0;i<n;i++) endlessOpts[ks[Math.floor(Math.random()*ks.length)]]=true; renderEndless();
    qa($('featGrid'),'.mech.on').forEach(settle); };
$('meadowBtn').onclick=()=>{ ensureAudio(); if(!continueEndless()) newEndless(); };
// the badge closest to being earned, as a little goal on the Play tab; tapping opens it on the Badges tab
// the home card for the closest badge: its name as the title and what earns it below, with a bar when it counts up
function renderGoal(){ const g=$('goalCard'), id=nearestBadge(), b=badgeById(id), p=badgeProg(b);
  if(!b||progress.badges[id]){ g.hidden=true; return; } g.hidden=false; g.dataset.b=id;
  g.innerHTML=`<span class="b-medal" aria-hidden="true">${art(b[1],32)}<span class="b-lock">${art('lock',12)}</span></span><span class="gt"><b>${b[2]}</b><small>${b[3]}</small>`
    +(p?`<span class="gbar"><span class="b-bar" style="--p:${pct(p)}"></span>${p[0].toLocaleString()} of ${p[1].toLocaleString()}</span>`:'')+`</span>`; }
// Your garden so far, from the stars pill: the big totals, the badges closest to earning and every counter we keep,
// so players can see where they stand for the badges they're after
const GAR_STATS=[['worm','Moves crawled','moves'],['peach','Snacks eaten','fruit'],['flag','Flags touched','flags'],['key','Gates opened','gates'],
  ['tunnel','Tunnel trips','tunnels'],['rain','Rains started','rains'],['bridge','Bridge swings','swings'],['flowerbtn','Hedges opened','hedges'],
  ['wetleaf','Leaf slides','slides'],['beetle','Beetle bumps','pushes'],['sunflower','Pollen dustings','dusts'],['sprout','Burrowed under','burrows'],
  ['turnshroom','Twirls','turns'],['zzz','Naps','naps'],['calendar','Days played','days'],['sun','Daily patches','dailies'],
  ['flame','Best daily streak',()=>progress.daily.best||0],['tulip','Meadow patches',()=>Object.values(progress.endless||{}).reduce((n,e)=>n+(e&&e.cleared||0),0)],
  ['hintseed','Seeds grown','seedsGot'],['camera','Photos','photos'],['bowtie','Outfit changes','outfits'],['rewind','Undos','undos'],
  ['race','Races','races'],['trophy','Races won','raceWins']];
function gardenInfo(){ const st=progress.stats, v=x=>typeof x==='function'?x():(st[x]||0);
  const grown=LEVELS.filter((l,i)=>isCleared(i)).length, got=BADGES.filter(b=>progress.badges[b[0]]).length;
  const near=BADGES.map(b=>[b,badgeProg(b)]).filter(x=>x[1]&&x[1][0]>0).sort((x,y)=>y[1][0]/y[1][1]-x[1][0]/x[1][1]).slice(0,4);
  $('garBody').innerHTML=`<p>Everything you do in the garden counts toward a badge. Here's where you stand.</p>`
    +`<div class="gar-tops"><span>${starTotal().toLocaleString()}<small>of ${(LEVELS.length*3).toLocaleString()} stars</small></span><span>${grown}<small>of ${LEVELS.length} patches</small></span><span>${got}<small>of ${BADGES.length} badges</small></span></div>`
    +(near.length?`<p class="label">Closest badges</p><ul class="seed-how gar-near">${near.map(([b,p])=>`<li data-b="${b[0]}" role="button" tabindex="0"><span class="ic" aria-hidden="true">${art(b[1],18)}</span><span><b>${b[2]}</b><small>${b[3]}</small></span><b>${p[0].toLocaleString()} of ${p[1].toLocaleString()}</b></li>`).join('')}</ul>`:'')
    +`<p class="label">What we've counted</p><div class="gar-grid">${GAR_STATS.map(([ic,t,k])=>`<span><span class="ic" aria-hidden="true">${art(ic,18)}</span><span class="gv"><b>${v(k).toLocaleString()}</b><small>${t}</small></span></span>`).join('')}</div>`;
  $('garBody').scrollTop=0; show('garOv'); pushLayer('gar'); }
const garTo=id=>{ hide('garOv'); if(layers.includes('tab')) popLayer('gar'); else swapLayers('gar','tab'); badgeSel=id; badgeFilter='all'; showTab('badges'); };
$('homeStars').onclick=()=>{ ensureAudio(); gardenInfo(); };
$('garOk').onclick=()=>{ hide('garOv'); popLayer('gar'); };
$('garBadges').onclick=()=>garTo(nearestBadge());
$('garBody').addEventListener('click',e=>{ const li=e.target.closest('[data-b]'); if(li) garTo(li.dataset.b); });
$('garBody').addEventListener('keydown',e=>{ const li=e.target.closest('[data-b]'); if(li&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); garTo(li.dataset.b); } });
$('goalCard').onclick=()=>{ badgeSel=$('goalCard').dataset.b; badgeFilter='all'; showTab('badges'); };
// The home worm speaks now and then, not all the time: a greeting on the first visit and sometimes after that, a word on
// some taps, and a run of jokes when someone keeps poking it. Every bubble fades away after a few seconds.
const SAY_TAP=['Hi there!','That tickles!','Wheee!','Hello, friend!','*wiggle wiggle*','I like your hat.','Shall we crawl?','Mmm, peaches.'];
const SAY_SPAM=['Hey, that tickles!','Okay, okay, I\'m awake!','Boop received.','You poke, I wiggle. Deal.','I\'m getting dizzy...',
  'Are you trying to wake the snails?','*giggles uncontrollably*','Boop limit reached!','I\'ll tell the beetles.','My hat is going to fall off!',
  'Is this a tickle attack?','I surrender! Take my peaches!','Fine. I\'ll just wiggle forever.','You must really like worms.'];
let sayI=0, spamI=0, sayT=0, lastHello=0, pokes=[];
function say(t,ms=4200){ const el=$('wormSay'); if(!el) return; clearTimeout(sayT); el.classList.remove('bye');
  if(el.textContent!==t){ el.textContent=t; animOnce(el,'say'); }
  sayT=setTimeout(()=>{ el.classList.add('bye'); sayT=setTimeout(()=>{ el.textContent=''; el.classList.remove('bye'); },reduceMotion?0:180); },ms); }
function sayHello(){ const now=performance.now(); if(lastHello&&(now-lastHello<90000||Math.random()>.35)) return; lastHello=now;
  const h=new Date().getHours(), d=progress.daily, done=!!d.results[todayKey()];
  const hi=h<5?'Up late?':h<12?'Good morning!':h<18?'Hello again!':'Good evening!', played=LEVELS.some((l,i)=>isCleared(i));
  say(!done&&played?`${hi} Today's patch is ready.`:h<5?'Up late? Me too.':hi,6000); }
// a tap on the home worm: four or more within a couple of seconds is a poking spree
function sayTap(){ const now=performance.now(); pokes=pokes.filter(t=>now-t<2500); pokes.push(now);
  if(pokes.length>=4) say(SAY_SPAM[spamI++%SAY_SPAM.length],2600);
  else if(Math.random()<.3) say(SAY_TAP[sayI++%SAY_TAP.length]); }
$('dailyBtn').onclick=()=>{ ensureAudio(); const r=readResume('endless'); if(r&&r.def&&r.def.daily===todayKey()){ mode='endless'; hideAll();
  startLevel(r.def,false); enterGame(); return; } startDaily(); };
$('homeEndlessCont').onclick=()=>{ continueEndless(); };
$('homeSound').onclick=()=>toggleMute($('homeSound'));
// colour theme: follow the system, or force light or dark
const THEMES=['auto','light','dark'];
let theme=store.get('squirm-theme')||'auto'; if(!THEMES.includes(theme)) theme='auto';
function applyTheme(){ if(theme==='auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=theme;
  $('setTheme').querySelectorAll('button').forEach(b=>{ const on=b.dataset.t===theme; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); });
    }
$('setTheme').querySelectorAll('button').forEach(b=>b.onclick=()=>{ theme=b.dataset.t; store.set('squirm-theme',theme); applyTheme(); settle(b); });
applyTheme();

