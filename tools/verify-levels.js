// Checks every handmade level: solvable, stored par matches the shortest solution,
// and no mechanic appears before the chapter that introduces it.
const analyze=require('./analyze'); const L=require('../src/levels');
const M={flags:/C/,fruit:/[+-]/,dry:/x/,keys:/[KG]/,portals:/[1-9]/,rain:/[Rsw]/,rivers:/[~=|L]/,snails:/[<>^v]/};
const introAt={flags:5,fruit:10,dry:20,keys:30,portals:40,rain:50,rivers:60,snails:100};
let bad=0; L.forEach((l,i)=>{ const r=analyze(l);
  if(!r.par){ bad++; console.log('UNSOLVABLE',i+1,l.name); }
  else if(r.par!==l.par){ bad++; console.log('PAR',i+1,l.name,'stored',l.par,'actual',r.par); }
  const m=l.map.join(''); for(const k in M) if(M[k].test(m)&&i<introAt[k]){ bad++; console.log('TOO EARLY',i+1,l.name,k); } });
console.log(L.length,'levels,',bad,'problems'); process.exit(bad?1:0);
