// Breadth-first solver for one level: shortest solution (par), reachable state count, and how many
// of those states can still win. Used by verify-levels.js, curate.js and the generator tests.
// usage: node tools/analyze.js [levels.js]   prints par, states, winnable % and a solution per level
//        (default: src/levels.js; any module exporting a LEVELS-style array works)
const {initState, step, stateKey: key} = require('../src/logic');
function analyze(L){
  const s0=initState(L); const id=new Map(), states=[], edges=[], dist=[]; 
  const add=(s,d)=>{const k=key(s); if(id.has(k)) return id.get(k); id.set(k,states.length); states.push(s); edges.push([]); dist.push(d); return states.length-1;};
  add(s0,0); let wins=[], best=null, path={0:''};
  for(let i=0;i<states.length;i++){ const s=states[i];
    for(const d of ['N','S','W','E']){ const r=step(s,d); if(r.blocked) continue;
      if(r.state.status==='won'){ wins.push(i); if(best===null||dist[i]+1<best.len) best={len:dist[i]+1,p:path[i]+d}; continue; }
      if(r.state.status!=='play') continue;
      const before=states.length; const j=add(r.state,dist[i]+1); edges[i].push(j); if(j===before) path[j]=path[i]+d; } }
  // states that can still win
  const rev=states.map(()=>[]); edges.forEach((es,i)=>es.forEach(j=>rev[j].push(i)));
  const good=new Set(wins), st=[...wins]; while(st.length){ const x=st.pop(); for(const p of rev[x]) if(!good.has(p)){good.add(p); st.push(p);} }
  return {states:states.length, good:good.size, par:best&&best.len, sol:best&&best.p};
}
module.exports=analyze;
if(require.main===module){ const LV=require(process.argv[2]?require('path').resolve(process.argv[2]):'../src/levels'); LV.forEach((L,i)=>{const a=analyze(L); console.log(i+1,L.name,'par',a.par,'states',a.states,'winnable',(100*a.good/a.states).toFixed(0)+'%',a.sol);}); }
