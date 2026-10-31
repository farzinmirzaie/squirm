// ---------- daily reminder ----------
// No server, so no push. Where the browser supports it (Chrome on Android, installed), the service
// worker is woken now and then by periodic background sync and shows a notification if today's
// daily patch is still waiting. Elsewhere, if the app can badge its icon, it does that instead.
let remind=Object.assign({on:false,hour:9},store.json('squirm-remind'));
const remindKind=()=>{ if(!('Notification' in window)||!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol)) return 'none';
  if('PeriodicSyncManager' in window) return 'full'; return navigator.setAppBadge?'badge':'none'; };
function updateAppBadge(){ if(!navigator.setAppBadge) return;
  try{ (remind.on&&!progress.daily.results[todayKey()]?navigator.setAppBadge(1):navigator.clearAppBadge()).catch(()=>{}); }catch(e){} }
// the service worker can't read localStorage, so the page hands it what it needs through a cache
async function shareRemindState(){ updateAppBadge(); if(!('caches' in window)) return;
  try{ const c=await caches.open('squirm-state'), old=await c.match('reminder'), prev=old?await old.json():{};
    await c.put('reminder',new Response(JSON.stringify({...prev,on:remind.on,hour:remind.hour,done:progress.daily.last,streak:progress.daily.streak}),{headers:{'content-type':'application/json'}}));
      }catch(e){} }
function saveRemind(){ store.set('squirm-remind',JSON.stringify(remind)); shareRemindState(); renderRemind(); }
function renderRemind(){ const k=remindKind(), on=remind.on&&k!=='none';
  $('setRemind').setAttribute('aria-checked',String(on)); $('setRemind').disabled=k==='none';
  $('remindWhen').hidden=k!=='full'||!on;
  $('setRemindAt').querySelectorAll('button').forEach(b=>{ const s=+b.dataset.h===remind.hour; b.classList.toggle('on',s); b.setAttribute('aria-checked',String(s)); });
  $('remindNote').textContent = k==='none' ? "This browser can't send reminders from Squirm. Install Squirm with Chrome on Android and they'll work."
    : k==='badge' ? "This device can't send Squirm reminders on its own. Instead, Squirm puts a dot on its icon when you leave with today's patch still waiting."
    : on ? "Once a day, after the time you pick, Squirm sends a gentle nudge if today's patch is still waiting. Your phone picks the exact moment, so it may come a little later."
    : "Get a gentle nudge when a fresh daily patch is waiting for you."; }
$('setRemind').onclick=async()=>{ const k=remindKind(); if(k==='none') return;
  if(remind.on){ remind.on=false; saveRemind(); sfx('off'); try{ const reg=await navigator.serviceWorker.ready;
    if(reg.periodicSync) await reg.periodicSync.unregister('squirm-daily'); }catch(e){} return; }
  let perm=Notification.permission; if(perm==='default'){ try{ perm=await Notification.requestPermission(); }catch(e){} }
  if(perm!=='granted'){ nope($('setRemind'),'Notifications are turned off for Squirm. You can allow them in your browser settings.',3600); renderRemind();
    return; }
  if(k==='full'){ try{ const reg=await navigator.serviceWorker.ready;
      const st=await navigator.permissions.query({name:'periodic-background-sync'}).catch(()=>null);
      if(st&&st.state!=='granted') throw new Error('not installed');
      await reg.periodicSync.register('squirm-daily',{minInterval:4*3600*1000}); }
    catch(e){ nope($('setRemind'),'Add Squirm to your home screen first, then turn reminders on there.',3600); renderRemind(); return; } }
  remind.on=true; saveRemind(); sfx('on'); };
$('setRemindAt').querySelectorAll('button').forEach(b=>b.onclick=()=>{ remind.hour=+b.dataset.h; saveRemind(); settle(b); });
if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',e=>{ if(e.data==='squirm-daily'&&calmMoment()) $('dailyBtn').onclick(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden) updateAppBadge(); });
// keep the worker's copy in step (it also hears about a secret reset this way)
if(remindKind()!=='none'){ shareRemindState();
  if(!remind.on) navigator.serviceWorker.ready.then(r=>r.periodicSync&&r.periodicSync.unregister('squirm-daily')).catch(()=>{}); }

let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; $('installBtn').hidden=false; });
window.addEventListener('appinstalled',()=>{ installEvt=null; $('installBtn').hidden=true; });
$('installBtn').onclick=async()=>{ const e=installEvt; if(!e) return; installEvt=null; $('installBtn').hidden=true; try{ await e.prompt(); }catch(err){} };

