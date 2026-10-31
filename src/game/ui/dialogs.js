// ---------- toasts and dialogs ----------
let toastTimer=0;
$('toast').addEventListener('click',()=>$('toast').classList.remove('show'));
function toast(msg,ms=2600){ const t=$('toast'), bar=document.body.classList.contains('at-home')?document.querySelector('.tabbar'):document.querySelector('#app nav');
  if(bar){ const top=bar.getBoundingClientRect().top; if(top>0) t.style.setProperty('--toast-y',Math.max(16,window.innerHeight-top+12)+'px'); } t.innerHTML=sticker(ICON.leaf)+'<span class="msg"></span>'; t.querySelector('.msg').textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),ms); }
function show(id){ const o=$(id); clearTimeout(o._out); o.classList.remove('out'); o.classList.add('show'); if(id==='homeOv'){ document.body.classList.add('at-home'); return; } const b=$(id).querySelector('.primary')||$(id).querySelector('button'); b&&b.focus({preventScroll:true}); }
function hide(id){ const o=$(id); if(id==='homeOv'){ o.classList.remove('show'); document.body.classList.remove('at-home'); return; }
  if(!o.classList.contains('show')||o.classList.contains('out')) return;
  const ms=reduceMotion?0:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-fast'))*1000||0;
  if(!ms){ o.classList.remove('show'); return; } o.classList.add('out'); o._out=setTimeout(()=>o.classList.remove('show','out'),ms); }
// open and not on its way out
const isOpen=id=>{ const c=$(id).classList; return c.contains('show')&&!c.contains('out'); };
function hideAll(){ ['winOv','homeOv','setOv','finOv'].forEach(hide); }
function anyOverlay(){ return ['winOv','homeOv','genOv','introOv','resetOv','setOv','finOv'].some(isOpen); }
function renderMute(){ if($('homeSound')){ const hb=$('homeSound'); hb.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off'); setTimeout(()=>{ hb.innerHTML=$('muteBtn').innerHTML; },0); } const b=$('muteBtn'); b.setAttribute('aria-pressed',String(muted)); b.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');
  b.innerHTML = muted
   ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
   : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>'; }

