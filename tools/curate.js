// Generates candidate levels with the in-game generator, keeps only solvable ones
// that use the required mechanic, and picks a spread by difficulty.
// with snails or soil required, a candidate is kept only if that mechanic makes the solution longer
// usage: [LO=0.3 HI=0.9] node tools/curate.js <tag> <allowedFeaturesJSON> <required|none> <easy,medium,hard> <count> <seed> <seconds>
// example: LO=.5 HI=.95 node tools/curate.js ch12 '{"flags":true,"snails":true}' snails medium 5 1401 90
// output: gen/gen_<tag>.json
const fs=require('fs'), path=require('path');
const [ , , tag, allowedJ, required, diffsCSV, countS, seedS, tl]=process.argv;
const fail=msg=>{ console.error(msg+'\nusage: [LO=0.3 HI=0.9] node tools/curate.js <tag> <allowedFeaturesJSON> <required|none> <easy,medium,hard> <count> <seed> [seconds=60]'); process.exit(2); };
if(!seedS) fail('missing arguments');
let allowed; try{ allowed=JSON.parse(allowedJ); }catch(e){ fail('allowedFeaturesJSON is not valid JSON: '+allowedJ); }
const diffs=diffsCSV.split(','), count=+countS; let seed=+seedS;
if(diffs.some(d=>!['easy','medium','hard'].includes(d))) fail('difficulties must be easy, medium or hard');
if(!(count>0)||!Number.isFinite(seed)) fail('count must be a positive number and seed a number');
const {genCandidate,analyzeCapped,usage}=require('./load-generator')();
const rng=s=>()=>{ s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
const pool=[]; const t0=Date.now(); const seen=new Set();
while(Date.now()-t0<(+tl||60)*1000){
  const diff=diffs[pool.length%diffs.length]; const r=rng(seed++);
  const L=genCandidate(r,diff,allowed); if(!L) continue; const key=L.map.join('/'); if(seen.has(key)) continue; seen.add(key);
  const a=analyzeCapped(L,{easy:4000,medium:10000,hard:15000}[diff]); if(!a||!a.par||a.par<5) continue;
  const u=usage(L,a.sol); if(required!=='none' && !required.split('+').every(k=>u.has(k))) continue;
  // the only mechanics present must be allowed ones (generator guarantees) ; require flags if allowed.flags
  if(required.includes('snails')){ const L2={...L,map:L.map.map(r=>r.replace(/[<>^v]/g,'.'))}; const a2=analyzeCapped(L2,20000); if(!a2||!a2.par||a2.par>=a.par) continue; }
  // soft soil counts only if the patch gets longer (or impossible) when the soil is plain grass
  if(required.includes('soil')){ const L2={...L,map:L.map.map(r=>r.replace(/#/g,'.'))}; const a2=analyzeCapped(L2,20000); if(a2&&a2.par&&a2.par<=a.par) continue; }
  const win=a.good/a.states; const d=a.par*(1-win);
  pool.push({d:+d.toFixed(2),par:a.par,win:Math.round(win*100),exitLen:L.exitLen,worm:L.worm,map:L.map,diff});
}
pool.sort((p,q)=>p.d-q.d);
// pick evenly spaced across the upper or full range
const lo=+(process.env.LO||0), hi=+(process.env.HI||1);
const sub=pool.slice(Math.floor(pool.length*lo),Math.max(Math.floor(pool.length*lo)+count,Math.ceil(pool.length*hi)));
const pick=[]; for(let i=0;i<count&&sub.length;i++){ pick.push(sub[Math.min(sub.length-1,Math.round(i*(sub.length-1)/Math.max(1,count-1)))]); }
const genDir=path.join(__dirname,'..','gen'); fs.mkdirSync(genDir,{recursive:true});
fs.writeFileSync(path.join(genDir,'gen_'+tag+'.json'),JSON.stringify(pick));
console.log(tag,'pool',pool.length,'picked',pick.map(p=>p.par+'/'+p.win+'%/d'+p.d).join(' '));
