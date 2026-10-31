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
function statsBoot(){ if(!statsOn()) return; stat('/',false);
  const app=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true; stat(app?'launch/app':'launch/browser');
  const v=NEWS[0][0]; if(store.get('squirm-stats-v')!==v){ store.set('squirm-stats-v',v); stat('version/'+v); } }
window.addEventListener('appinstalled',()=>stat('install'));

