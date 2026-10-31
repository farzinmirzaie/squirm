// ---------- the daily patch ----------
const todayKey=()=>dateKey(new Date());
const GAME_URL=/^https?:$/.test(location.protocol)?location.origin+location.pathname.replace(/index\.html$/,''):'';
const DAILY_OPTS={flags:true,fruit:true,keys:true,dry:true,portals:true};
progress.daily=Object.assign({streak:0,best:0,last:null,results:{}},progress.daily||{});
async function startDaily(){ if(generating) return; generating=true; hideAll(); show('genOv'); $('genText').textContent="Growing today's patch...";
  const k=todayKey(); let seed=0; for(const ch of 'daily'+k) seed=(seed*31+ch.charCodeAt(0))|0;
  let def=store.json('squirm-daily-patch'); if(!def||def.daily!==k) def=null;
  if(!def){ def=await generateEndless('medium',{...DAILY_OPTS},seed,30); def.daily=k; store.set('squirm-daily-patch',JSON.stringify(def));
    } def.name="Today's patch"; def.hint='The same patch for every gardener today.';
  hide('genOv'); generating=false; mode='endless'; startLevel(def,true); enterGame(); }
let generating=false, prefetch=null;
const optsKey=()=>endlessDiff+JSON.stringify(endlessOpts);
function startPrefetch(){ const k=optsKey(); const seed=(Math.random()*2**31)|0; prefetch={k,p:generateEndless(endlessDiff,{...endlessOpts},seed)}; }
async function newEndless(){ if(generating) return; generating=true; hideAll(); clearResume();
  store.set('squirm-endless-opts',JSON.stringify({opts:endlessOpts,diff:endlessDiff}));
  let def; if(prefetch&&prefetch.k===optsKey()){ const p=prefetch.p; prefetch=null; show('genOv'); def=await p; }
  else { prefetch=null; show('genOv'); $('genText').textContent=endlessDiff==='hard'?'Hard patches take a moment to grow...':'Planting seeds...';
    def=await generateEndless(endlessDiff,{...endlessOpts},(Math.random()*2**31)|0); }
  hide('genOv'); generating=false;
  mode='endless'; startLevel(def,true); saveResume(); enterGame(); }
function continueEndless(){ const r=readResume('endless'); if(r&&r.def&&r.diff&&!r.def.daily){ endlessDiff=r.diff; mode='endless'; hideAll();
  startLevel(r.def,false); enterGame(); return true; } return false; }

