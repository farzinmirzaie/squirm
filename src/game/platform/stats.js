// ---------- anonymous stats: a few counters on GoatCounter, no cookies, nothing personal ----------
// The one network request the game makes on its own. Off until STATS_CODE names the GoatCounter site,
// on the live https site only (never localhost, so not in tests), and players can switch it off in
// Settings (squirm-stats, device-specific). A request that fails offline is simply lost.
const STATS_CODE='squirm';
const statsLive=()=>!!STATS_CODE && location.protocol==='https:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
const statsOn=()=>statsLive() && store.get('squirm-stats')!=='0';
// path: '/' for a visit, or an event name like 'clear/037' (events group by name on the dashboard)
function stat(path,event=true){ if(!statsOn()||navigator.onLine===false) return;
  const q=new URLSearchParams({p:path,t:event?path:'Squirm',r:event?'':document.referrer,s:`${screen.width},${screen.height},${devicePixelRatio||1}`,rnd:Math.random().toString(36).slice(2)});
  if(event) q.set('e','true');
  const url=`https://${STATS_CODE}.goatcounter.com/count?${q}`;
  try{ if(!(navigator.sendBeacon&&navigator.sendBeacon(url))) new Image().src=url; }catch(e){} }
const pad3=n=>String(n).padStart(3,'0');
// No identifiers: funnels come from milestones each device sends once (start/new, clear/NNN, chapter/NN, days/N),
// so the drop between two counts on the dashboard is the funnel. Retention: days/N when a device has played on N
// different days. Quits: quit/NNN when a garden patch never cleared is left after a few moves without winning
// (to home, another patch or closing the app), once per patch per session. Hints: hint/NN by garden chapter,
// hint/daily, hint/meadow, for each new hint shown.
const quitSent=new Set();
function noteQuit(){ if(mode!=='garden'||!state||state.status!=='play'||state.moves<3||isCleared(li)||quitSent.has(li)) return;
  quitSent.add(li); stat('quit/'+pad3(li+1)); }
window.addEventListener('pagehide',noteQuit);
function noteHint(){ stat('hint/'+(mode==='garden'?String(CHAPTERS.findIndex(ch=>li>=ch.from&&li<=ch.to)+1).padStart(2,'0'):L&&L.daily?'daily':'meadow')); }
function noteDays(n){ if([2,3,7,14,30,60].includes(n)) stat('days/'+n); }
function statsBoot(){ if(!statsOn()) return; stat('/',false); if(freshGarden&&!progress.stats.newSent){ progress.stats.newSent=1; save(); stat('start/new'); }
  const app=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true; stat(app?'launch/app':'launch/browser');
  const v=NEWS[0][0]; if(store.get('squirm-stats-v')!==v){ store.set('squirm-stats-v',v); stat('version/'+v); } }
window.addEventListener('appinstalled',()=>stat('install'));

