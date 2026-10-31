// ---------- tweens ----------
const tweens=[]; const dying=new Set();
// removes an effect or a board piece once its animation ends, and frees its GPU resources (disposeTree keeps
// the shared ones): eaten fruit, opened gates, sunk tiles, sparkles and ripples are gone from the board by the
// time the next patch is built, so nothing else would free them
function kill(o){ dying.add(o); return ()=>{ dying.delete(o); removeObj(o); disposeTree(o); }; }
function clearDying(){ dying.forEach(o=>{ removeObj(o); disposeTree(o); }); dying.clear(); }
function tween(dur,fn,done){ if(reduceMotion) dur=Math.min(dur,90); tweens.push({t:0,dur,fn,done}); }
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;

