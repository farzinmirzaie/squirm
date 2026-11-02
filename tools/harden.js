// Makes candidate levels harder by hill climbing: small random edits (a grass tile to soil or back, a dry patch,
// moving a flag or the burrow), each kept only if the patch stays solvable, still uses the mechanics it used before,
// and its difficulty score par * (1 - winnable) doesn't drop. Useful for big boards, which the generator makes easy.
// usage: [CAP=300000] [OPEN=.36 (the least share of open tiles)] node tools/harden.js <in.json> <out.json> <steps> [seed] [maxPar=60] [only index,index,...]
//   in.json: a gen/gen_<tag>.json from curate.js (entries with map, worm, exitLen); out.json gets the hardened ones
// example: CAP=300000 node tools/harden.js gen/gen_c3.json gen/hard_c3.json 150 7
const fs=require('fs');
const [ , , inF, outF, stepsS, seedS, maxParS, onlyS]=process.argv;
if(!stepsS){ console.error('usage: [CAP=300000] node tools/harden.js <in.json> <out.json> <steps> [seed] [maxPar=60] [only i,j]'); process.exit(2); }
const {analyzeCapped,usage,rng}=require('./load-generator')();
const cap=+process.env.CAP||300000, maxPar=+maxParS||60, minOpen=+process.env.OPEN||.36;
const r=rng(+seedS||1), pick=a=>a[Math.floor(r()*a.length)];
const score=L=>{ const a=analyzeCapped(L,cap); if(!a||!a.par||a.par>maxPar) return null; return {a,d:a.par*(1-a.good/a.states)}; };
// drop blank edge rows and columns, shifting the worm
const trim=L=>{ let m=L.map.slice(), w=L.worm.map(p=>p.slice());
  while(m.length&&!m[0].trim()){ m.shift(); w.forEach(p=>p[1]--); } while(m.length&&!m[m.length-1].trim()) m.pop();
  while(m.every(row=>row[0]===' ')){ m=m.map(row=>row.slice(1)); w.forEach(p=>p[0]--); } while(m.every(row=>row[row.length-1]===' ')) m=m.map(row=>row.slice(0,-1));
  return {...L,map:m,worm:w}; };
let list=JSON.parse(fs.readFileSync(inF,'utf8'));
const seen=new Set(); list=list.filter(L=>{ const k=L.map.join('/'); if(seen.has(k)) return false; seen.add(k); return true; });
if(onlyS) list=onlyS.split(',').map(i=>list[+i]);
const out=[];
for(const L0 of list){ let L={exitLen:L0.exitLen,worm:L0.worm,map:L0.map.slice(),rain:!!L0.rain}, cur=score(L); if(!cur) continue;
  const need=new Set([...usage(L,cur.a.sol)]), hasDry=L.map.some(row=>row.includes('x')), d0=cur.d;
  const isWorm=(x,y)=>L.worm.some(p=>p[0]===x&&p[1]===y);
  for(let k=0;k<+stepsS;k++){ const g=L.map.map(row=>row.split('')), H=g.length, W=g[0].length, cells=[];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(!isWorm(x,y)) cells.push([x,y,g[y][x]]);
    const grass=cells.filter(c=>c[2]==='.'), soil=cells.filter(c=>c[2]===' '&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>(g[c[1]+dy]||[])[c[0]+dx]&&g[c[1]+dy][c[0]+dx]!==' '));
    const kind=pick(['wall','wall','wall','open',hasDry?'dry':'wall','flag','exit']);
    if(kind==='wall'&&grass.length){ const [x,y]=pick(grass); g[y][x]=' '; }
    else if(kind==='open'&&soil.length){ const [x,y]=pick(soil); g[y][x]='.'; }
    else if(kind==='dry'&&grass.length){ const [x,y]=pick(grass); g[y][x]='x'; }
    else if((kind==='flag'||kind==='exit')&&grass.length){ const ch=kind==='flag'?'C':'E', from=cells.filter(c=>c[2]===ch); if(!from.length) continue;
      const [fx,fy]=pick(from), [x,y]=pick(grass); g[fy][fx]='.'; g[y][x]=ch; }
    else continue;
    const L2={...L,map:g.map(row=>row.join(''))};
    // keep big boards big: at least a third of the board stays open
    if(L2.map.join('').replace(/ /g,'').length<W*H*minOpen) continue;
    const s2=score(L2); if(!s2||s2.d<cur.d) continue;
    const u=usage(L2,s2.a.sol); if(![...need].every(f=>u.has(f))) continue;
    // turnaround mushrooms must still matter: without them the patch is longer or impossible
    if(need.has('turn')){ const a2=analyzeCapped({...L2,map:L2.map.map(r=>r.replace(/T/g,'.'))},cap); if(a2&&a2.par&&a2.par<=s2.a.par) continue; }
    L=L2; cur=s2; }
  L=trim(L); const win=Math.round(cur.a.good/cur.a.states*100);
  out.push({d:+cur.d.toFixed(2),par:cur.a.par,win,states:cur.a.states,exitLen:L.exitLen,worm:L.worm,map:L.map,rain:L.rain});
  console.log(`d ${d0.toFixed(1)} -> ${cur.d.toFixed(1)}  par ${cur.a.par}  win ${win}%  ${L.map[0].length}x${L.map.length}  uses ${[...need].join(' ')}`);
  fs.writeFileSync(outF,JSON.stringify(out)); }
