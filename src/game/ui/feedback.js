// ---------- UI feedback: pops, shakes and staggered entrances ----------
// scroll fades: a .fade-scroll fades its content out at an edge only while there's more to scroll that way, and the
// fade grows with that distance, so nothing is cut off sharply and nothing fades at the very top or end.
// data-fade (px, default 24) sets the size, data-fade-top overrides the top (e.g. under sticky headers).
// Scrolling, resizing and new content update it on their own (el.fadeUpdate() forces it).
function fadeScroll(el){ if(el.fadeUpdate) return el.fadeUpdate;
  const top=+(el.dataset.fadeTop||el.dataset.fade||24), bot=+(el.dataset.fade||24);
  const x=el.classList.contains('x');
  const upd=el.fadeUpdate=()=>{ const t=x?el.scrollLeft:el.scrollTop, rest=(x?el.scrollWidth-el.clientWidth:el.scrollHeight-el.clientHeight)-t;
    el.style.setProperty('--fade-t',Math.max(0,Math.min(t,top))+'px'); el.style.setProperty('--fade-b',Math.max(0,Math.min(rest,bot))+'px'); };
  el.addEventListener('scroll',upd,{passive:true}); if(window.ResizeObserver) new ResizeObserver(upd).observe(el);
  new MutationObserver(()=>requestAnimationFrame(upd)).observe(el,{childList:true,subtree:true});
  // children that slide in stick out while they move, so measure again once they settle
  el.addEventListener('animationend',upd); el.addEventListener('transitionend',upd); upd(); return upd; }
function pulse(el){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function animOnce(el,cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); const end=e=>{ if(e.target!==el) return; el.classList.remove(cls); el.removeEventListener('animationend',end); }; el.addEventListener('animationend',end); }
// selection (seg buttons, difficulty, hats, colours, map stones): the newly chosen one pops into place; the press itself plays 'tap'
const settle=el=>{ if(el) animOnce(el,'pop'); };
// a blocked action (locked stone, hat or colour, a code that won't load, reminders that can't be set): one shake, one bump, one toast
function nope(el,msg,ms=2600){ if(el) animOnce(el,'nope'); sfx('bump'); if(msg) toast(msg,ms); }
// staggered entrance: 'enter' drops in from above, 'rise' comes up from below; long lists cap the delay
function stagger(els,cls='rise',d0=0,step=45,max=12){ if(reduceMotion) return;
  [...els].filter(el=>el&&!el.hidden).forEach((el,i)=>{ el.style.setProperty('--d',(d0+Math.min(i,max)*step)+'ms'); el.classList.remove('pop'); animOnce(el,cls); }); }
// a new patch: the HUD pieces drop in one after another, the buttons rise from below
function hudIntro(){ stagger([document.querySelector('.plaque'),$('muteBtn'),document.querySelector('.hud-stats'),...document.querySelectorAll('.hud-stats .stat')],'enter');
  stagger(document.querySelectorAll('nav .gbtn'),'enter',120,55); }
// what comes in, in order, when a home tab opens
function tabIntro(name){ const pg=$('tab'+name[0].toUpperCase()+name.slice(1));
  if(name==='play'){ stagger([$('slotPlay'),document.querySelector('.brand'),document.querySelector('.tagline'),$('homePlay'),$('dailyBtn'),$('meadowBtn'),$('goalCard')],'rise',0,60); return; }
  if(name==='garden'){ const panel=pg.querySelector('.panel'); stagger([panel],'rise'); stagger([$('lvPick')],'rise',220);
    // the list scrolls to the current patch first, then the rows in view come in
    setTimeout(()=>{ const box=$('lvGrid').getBoundingClientRect(); stagger(qa($('lvGrid'),'.ch-banner,.node,.peek').filter(r=>{ const b=r.getBoundingClientRect(); return b.bottom>box.top&&b.top<box.bottom; }),'rise',0,35); },40); return; }
  if(name==='meadow') { stagger([pg.querySelector('.panel'),$('mHero'),...qa(pg,'.diff')],'rise',0,40); stagger(qa(pg,'.mech'),'rise',260,22,10); stagger(qa(pg,'.m-go .btn'),'rise',420,60); return; }
  if(name==='me'){ stagger([$('slotMe'),pg.querySelector('.panel')],'rise',0,60); stagger(qa(pg,'#wardGrid button'),'rise',140,22,12); return; }
  if(name==='badges'){ stagger([pg.querySelector('.panel')],'rise'); stagger(qa(pg,'.b-tile'),'rise',90,30,12); stagger([$('badgeDetail')],'rise',260); } }

