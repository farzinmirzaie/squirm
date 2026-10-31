// ---------- home ----------
function showHome(quiet){ if(updateReady){ location.reload(); return; } document.title='Squirm'; const was=curTab; showTab('play',true); renderHome(); show('homeOv');
  if(quiet) return; if(was==='play') tabIntro('play'); stagger(document.querySelectorAll('.home-top .star-pill,.home-top .round:not([hidden])'),'enter',0,50); stagger(document.querySelectorAll('.tabbar .tab'),'rise',150,40); }
// ---------- home tabs: Play, Garden (patch list), Meadow (endless), Me (wardrobe), Badges ----------
let curTab='play';
const TAB_RENDER={garden:()=>renderLevelList(),meadow:()=>renderEndless(),me:()=>renderWardrobe(),badges:()=>renderBadges()};
function showTab(name,fromBack){ const prev=curTab; curTab=name;
  for(const t of ['play','garden','meadow','me','badges']){ const pg=$('tab'+t[0].toUpperCase()+t.slice(1)); pg.hidden=t!==name; }
  document.querySelectorAll('.tabbar .tab').forEach(b=>{ const on=b.dataset.tab===name; b.classList.toggle('on',on); b.setAttribute('aria-current',on?'page':'false'); });
  const pg=$('tab'+name[0].toUpperCase()+name.slice(1)); pg.scrollTop=0;
  // one worm, two homes: it sits on the Play tab and above the wardrobe on the Me tab
  const slot=name==='me'?$('slotMe'):$('slotPlay'); if(homeCanvas.parentNode!==slot) slot.appendChild(homeCanvas); homeStage(name==='me');
  if(TAB_RENDER[name]) TAB_RENDER[name]();
  if(prev!==name){ tabIntro(name); const tb=document.querySelector(`.tabbar .tab[data-tab="${name}"]`); if(tb) animOnce(tb,'pop'); }
  // the back button returns to Play from the other tabs
  if(fromBack) return;
  if(name==='play'){ if(layers[layers.length-1]==='tab') popLayer('tab'); }
  else if(layers[layers.length-1]!=='tab') pushLayer('tab'); }
document.querySelectorAll('.tabbar .tab').forEach(b=>b.onclick=()=>{ ensureAudio(); if(b.dataset.tab!==curTab) showTab(b.dataset.tab); });
function renderHome(){
  $('homeStars').innerHTML=`${ICON.star}<span>${starTotal()}</span>`;
  const k=todayKey(), dr=progress.daily.results[k]; $('dailyDay').textContent=new Date().getDate();
  const mid=new Date(); mid.setHours(24,0,0,0); const left=Math.max(1,Math.ceil((mid-new Date())/60000)), wait=left>=60?`${Math.floor(left/60)}h ${left%60}m`:`${left}m`;
  $('dailyBtn').classList.toggle('done',!!dr); $('dailySub').textContent = dr ? `Done in ${dr.moves} moves. Next one in ${wait}.` : (progress.daily.streak?`Keep your ${progress.daily.streak} day streak going`:'One patch for everyone today');
  $('dailyWeek').innerHTML=[6,5,4,3,2,1,0].map(n=>{ const d=new Date(); d.setDate(d.getDate()-n); return `<i class="${progress.daily.results[dateKey(d)]?'on':''} ${n?'':'today'}"></i>`; }).join('');
  const ni=nextGardenIndex(), started=LEVELS.some((l,i)=>isCleared(i));
  if(allCleared()){ const t=shineable().length; $('playTitle').textContent='Garden grown!'; $('playSub').textContent=t?`${t} ${t===1?'patch':'patches'} to shine up · what's next`:"All 3 stars · see what's next"; }
  else { $('playTitle').textContent=started?'Continue':'Play'; $('playSub').textContent=`Patch ${ni+1} · ${LEVELS[ni].name}`; }
  // Continue: how far along its chapter the next patch is
  const pc=CHAPTERS.find(c=>ni>=c.from&&ni<=c.to); $('playPips').innerHTML=pc&&!allCleared()?[...Array(pc.to-pc.from+1).keys()].map(j=>{ const i=pc.from+j; return `<i class="${isCleared(i)?'on':i===ni?'cur':''}"></i>`; }).join(''):'';
  // Meadow: the saved difficulty and its streak; one tap grows (or resumes) a patch
  const em=progress.endless[endlessDiff], er=readResume('endless'), canResume=er&&er.def&&!er.def.daily;
  $('meadowSub').textContent=canResume?'Pick up where you left off':`${DIFF_NAME[endlessDiff]}${em.streak?` · streak ${em.streak}`:em.cleared?` · ${em.cleared} cleared`:''}`;
  renderGoal(); sayHello();
  renderMute(); renderHaptic(); renderNews();
  // what the page shows before the game has loaded next time (see the boot script in shell.html)
  store.set('squirm-boot',JSON.stringify({stars:$('homeStars').innerHTML,title:$('playTitle').textContent,sub:$('playSub').textContent,daily:$('dailySub').textContent,done:!!dr,day:new Date().toDateString()}));
}
// a little sticker worm in the current colour wearing a pattern, for the wardrobe. Sunset and rainbow take their
// colours from colorAt, so the sticker shows the same tint the worm gets
function patArt(id,size=40,col=wormCol){ const c=WORM_COLS[col], hex=n=>'#'+n.toString(16).padStart(6,'0'), body=hex(c[1]), path='M3.5 15.5c2.2-4.4 5.3-4.4 7.5 0s5.3 4.4 7.5 0';
  const base=new THREE.Color(c[1]), sun=[0,.25,.5].map(o=>`<stop offset="${o}" stop-color="#${colorAt(4*(1-o/.75),5,'sunset',base).getHexString()}"/>`).join(''), r0=rainbowFrom(base);
  const over={stripes:`<path d="${path}" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="butt" stroke-dasharray="1.6 2.4" stroke-dashoffset="-6"/>`,
    spots:`<g fill="#fff" fill-opacity=".6" stroke="none"><circle cx="6.4" cy="13.6" r="1.1"/><circle cx="9.6" cy="13" r="1.1"/><circle cx="13" cy="17.4" r="1.1"/><circle cx="16.6" cy="17.6" r="1.1"/></g>`,
    fade:`<path d="${path}" stroke="url(#pf${size}-${col})" stroke-width="5"/>`,
    rainbow:`<path d="${path}" stroke="url(#pr${size}-${col})" stroke-width="5"/>`,
    bands:`<path d="${path}" stroke="#5B4436" stroke-opacity=".3" stroke-width="5" stroke-linecap="butt" stroke-dasharray=".9 3.1" stroke-dashoffset="-5"/>`,
    sunset:`<path d="${path}" stroke="url(#ps${size}-${col})" stroke-width="5"/>`,
    glitter:`<g fill="#fff" stroke="none"><circle cx="5.6" cy="14.2" r=".75"/><circle cx="8.6" cy="11.9" r=".55"/><circle cx="11.2" cy="15.4" r=".7"/><circle cx="13.8" cy="18.2" r=".55"/><circle cx="16.4" cy="17" r=".75"/></g>`}[id]||'';
  return `<svg class="art" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><linearGradient id="pf${size}-${col}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="ps${size}-${col}" x1="0" x2="1">${sun}<stop offset=".75" stop-color="${body}" stop-opacity="0"/></linearGradient><linearGradient id="pr${size}-${col}" x1="0" x2="1">${[4,3,2,1,0].map((k,i)=>`<stop offset="${(i*.13).toFixed(2)}" stop-color="#${RAINBOW[(r0+k)%5].getHexString()}"/>`).join('')}<stop offset=".62" stop-color="${body}" stop-opacity="0"/></linearGradient></defs>
    <path d="${path}" stroke="#5B4436" stroke-width="7.4"/><path d="${path}" stroke="${body}" stroke-width="5"/>${over}<g stroke="none"><circle cx="20.2" cy="10.6" r="3.6" fill="#5B4436"/><circle cx="20.2" cy="10.6" r="2.5" fill="${hex(c[2])}"/><circle cx="21" cy="9.9" r=".7" fill="#5B4436"/></g></svg>`; }
