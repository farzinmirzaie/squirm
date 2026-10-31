// ---------- hints ----------
let hintsUsed=0, undosHere=0, hintMesh=null, hintBusy=false;
function solveFrom(s0,cap=350000,ms=2500){ const until=performance.now()+ms;
  const seen=new Set([stateKey(s0)]); let q=[[s0,null]];
  while(q.length){ const nq=[];
    for(const [s,first] of q){ for(const d of ['N','S','W','E']){ const r=step(s,d); if(r.blocked) continue; const f=first||d;
        if(r.state.status==='won') return f; const k=stateKey(r.state); if(seen.has(k)) continue; seen.add(k); if(seen.size>cap||((seen.size&1023)===0&&performance.now()>until)) return undefined; nq.push([r.state,f]); } }
    q=nq; }
  return null; }
function clearHint(){ if(hintMesh){ removeObj(hintMesh); hintMesh=null; } }
function showHint(){
  if(animating&&!hintBusy){ setTimeout(showHint,250); return; }
  if(hintBusy||anyOverlay()||state.status!=='play') return; hintBusy=true; $('hintBtn').classList.add('busy');
  wormSays('Hmm, let me think...',1600);
  setTimeout(()=>{ const d=solveFrom(state); hintBusy=false; $('hintBtn').classList.remove('busy');
    if(d===null){ sfx('stuck'); toast('No way to win from here. Undo a few moves and try again.',3600); pulse($('undoBtn')); return; }
    if(d===undefined){ sfx('stuck'); toast('This one is too tangled to work out from here. Hold Undo to start over.',3200); return; }
    hintsUsed++; saveResume(); clearHint(); const h=state.segs[0], dd=DIRS[d], tx=h[0]+dd[0], ty=h[1]+dd[1];
    hintMesh=new THREE.Group(); const am=m('key');
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.13,.26,20),am); cone.rotation.x=Math.PI; outline(cone,.02); hintMesh.add(cone);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,10,32),new THREE.MeshBasicMaterial({color:0xFFD866,transparent:true,opacity:.9})); ring.rotation.x=-Math.PI/2; ring.position.y=-.82; hintMesh.add(ring);
    hintMesh.position.copy(wp(tx,ty,.85)); fx.add(hintMesh);
    headDir=[dd[0],dd[1]]; lastMoveT=idleT; sfx('ready'); wormSays(`Let's try ${({N:'up',S:'down',W:'left',E:'right'})[screenWord(d)]}!`,2600);
  },60);
}
function screenWord(d){ const v=screenVec(DIRS[d]); return Math.abs(v.x)>Math.abs(v.y) ? (v.x>0?'E':'W') : (v.y>0?'S':'N'); }
