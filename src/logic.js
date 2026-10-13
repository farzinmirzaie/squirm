// ===== Core game logic (pure, no rendering) =====
const DIRS = { N:[0,-1], S:[0,1], W:[-1,0], E:[1,0] };

function parseLevel(L){
  const h = L.map.length, w = Math.max(...L.map.map(r=>r.length));
  const grid = [], snails=[]; const SD={'>':[1,0],'<':[-1,0],'^':[0,-1],'v':[0,1]};
  for(let y=0;y<h;y++){ const row=[]; for(let x=0;x<w;x++){ let c=L.map[y][x]||' '; if(SD[c]){ snails.push({x,y,dx:SD[c][0],dy:SD[c][1]}); c='.'; } row.push(c); } grid.push(row); }
  return { w, h, grid, snails };
}
function initState(L){
  const {w,h,grid,snails} = parseLevel(L);
  return { w, h, grid, snails, segs: L.worm.map(p=>[p[0],p[1]]), keys:0, status:'play', moves:0, exitLen:L.exitLen, raining:!!L.rain };
}
function tileAt(s,x,y){ if(x<0||y<0||x>=s.w||y>=s.h) return ' '; return s.grid[y][x]; }
function partner(s,x,y){
  const c = s.grid[y][x];
  for(let yy=0;yy<s.h;yy++) for(let xx=0;xx<s.w;xx++) if(s.grid[yy][xx]===c && (xx!==x||yy!==y)) return [xx,yy];
  return null;
}
function cloneState(s){ return { ...s, grid: s.grid.map(r=>r.slice()), segs: s.segs.map(p=>p.slice()), snails:(s.snails||[]).map(n=>({...n})) }; }
function snailAt(s,x,y){ return (s.snails||[]).some(n=>n.x===x&&n.y===y); }
function countChar(s,c){ let n=0; for(const r of s.grid) for(const t of r) if(t===c) n++; return n; }

// flower buttons: every hedge is open while any part of the worm rests on a flower
function onFlower(s,segs){ return segs.some(p=>tileAt(s,p[0],p[1])==='B'); }
function hedgesOpen(s){ return onFlower(s,s.segs); }

// One crawl of the head by one tile, with everything it touches. No snails, no win check:
// step() runs this once, or several times while the worm slides over wet leaves.
function advance(s, dirKey){
  const d = DIRS[dirKey];
  const head = s.segs[0];
  const nx = head[0]+d[0], ny = head[1]+d[1];
  const t = tileAt(s,nx,ny);
  if(t===' ') return { blocked:'edge' };
  if(t==='~') return { blocked:'water' };
  const horiz = d[1]===0; const hc=tileAt(s,head[0],head[1]);
  if((t==='=' && !horiz) || (t==='|' && horiz)) return { blocked:'bridge' };
  if((hc==='=' && !horiz) || (hc==='|' && horiz)) return { blocked:'bridge' };
  if(t==='G' && s.keys===0) return { blocked:'locked' };
  if(t==='w' && s.raining) return { blocked:'flooded' };
  if(t==='s' && !s.raining) return { blocked:'sprout' };
  const ev = { type:'move', from: head, via:null, portal:false };
  let dest = [nx,ny];
  if(t>='1' && t<='9'){ const p = partner(s,nx,ny); if(p){ dest=p; ev.portal=true; ev.via=[nx,ny]; } }
  if(snailAt(s,dest[0],dest[1])) return { blocked:'snail' };
  const len = s.segs.length;
  let newLen = len;
  if(t==='+') newLen = len+1;
  if(t==='-') newLen = Math.max(1,len-1);
  const newSegs = [dest, ...s.segs].slice(0,newLen);
  for(let i=1;i<newSegs.length;i++) if(newSegs[i][0]===dest[0]&&newSegs[i][1]===dest[1]) return { blocked:'body' };
  // a hedge lets the head in only if the worm is still holding a flower after this move
  if(t==='H' && !onFlower(s,newSegs)) return { blocked:'hedge' };
  const ns = cloneState(s);
  ns.segs = newSegs; ns.moves++;
  ev.eaten = null;
  if(t==='K'){ ns.keys++; ns.grid[ny][nx]='.'; ev.eaten='K'; }
  if(t==='G'){ ns.keys--; ns.grid[ny][nx]='.'; ev.eaten='G'; }
  if(t==='+'||t==='-'){ ns.grid[ny][nx]='.'; ev.eaten=t; }
  if(t==='C'){ ns.grid[ny][nx]='c'; ev.eaten='C'; }
  if(t==='R'){ ns.raining=!s.raining; ev.rain=ns.raining; }
  if(t==='L'){ ev.swung=[]; for(let yy=0;yy<ns.h;yy++) for(let xx=0;xx<ns.w;xx++){ const c=ns.grid[yy][xx]; if(c!=='='&&c!=='|') continue;
      if(newSegs.some(q=>q[0]===xx&&q[1]===yy)) continue; ns.grid[yy][xx]= c==='='?'|':'='; ev.swung.push([xx,yy]); } }
  // crumbling tiles fall once nothing stands on them
  ev.crumbled = [];
  for(const p of s.segs){
    if(tileAt(ns,p[0],p[1])!=='x') continue;
    if(!newSegs.some(q=>q[0]===p[0]&&q[1]===p[1])){ ns.grid[p[1]][p[0]]=' '; ev.crumbled.push([p[0],p[1]]); }
  }
  return { state:ns, ev };
}

// returns {state, ev} or {blocked: reason}. One swipe is one move, even when it slides.
function step(s, dirKey){
  if(s.status!=='play') return { blocked:'over' };
  let r = advance(s,dirKey);
  if(r.blocked) return r;
  // wet leaves: keep sliding the same way until the head is off the leaves or something is in the way
  const slide = [];
  for(let n=0; n<s.w*s.h; n++){
    const h = r.state.segs[0];
    if(tileAt(r.state,h[0],h[1])!=='i') break;
    const nx = advance(r.state,dirKey);
    if(nx.blocked) break;
    slide.push(r); r = nx;
  }
  for(const x of slide) x.state.moves = s.moves+1;
  const ns = r.state, ev = r.ev;
  ns.moves = s.moves+1;
  if(slide.length) ev.slide = slide;
  const newSegs = ns.segs, dest = newSegs[0];
  // snails slide one tile after every move, turning around when something is in the way
  if(ns.snails.length){ ev.snails=[];
    for(const n of ns.snails){ const tx=n.x+n.dx, ty=n.y+n.dy; const from=[n.x,n.y];
      const free = tileAt(ns,tx,ty)==='.' && !newSegs.some(q=>q[0]===tx&&q[1]===ty) && !ns.snails.some(o=>o!==n&&o.x===tx&&o.y===ty);
      if(free){ n.x=tx; n.y=ty; ev.snails.push({from,to:[tx,ty],turned:false}); } else { n.dx=-n.dx; n.dy=-n.dy; ev.snails.push({from,to:from,turned:true}); } } }
  if(tileAt(ns,dest[0],dest[1])==='E'){
    const left = countChar(ns,'C');
    if(left===0 && newSegs.length===ns.exitLen){ ns.status='won'; ev.won=true; }
    else ev.exitNote = left>0 ? 'flags' : 'length';
  }
  return { state:ns, ev };
}
if(typeof module!=='undefined') module.exports = { DIRS, initState, step, tileAt, countChar, cloneState, hedgesOpen };
