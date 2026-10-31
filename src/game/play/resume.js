// ---------- resume an unfinished patch after reload ----------
function saveResume(){ store.set('squirm-resume-'+mode,JSON.stringify({li,name:mode==='garden'?LEVELS[li].name:null,diff:endlessDiff,def:mode==='endless'?L:null,hints:hintsUsed,states:history.concat([state]).slice(-120)}));
  }
function clearResume(){ store.del('squirm-resume-'+mode); }
function readResume(m){ return store.json('squirm-resume-'+m); }
function tryResume(){ try{ const r=readResume(mode); if(!r||!r.states||!r.states.length) return false;
  if(mode==='garden'&&r.name!==LEVELS[li].name) return false; if(mode==='endless'&&(!r.def||r.def.seed!==L.seed)) return false;
    const sts=r.states; const last=sts[sts.length-1]; if(last.status!=='play'||sts.length<2) return false;
    state=last; history=sts.slice(0,-1); hintsUsed=r.hints||0;
    syncBoard(false); snapWorm(); syncWeather(false); syncSnails(false); snapBeetles(); syncHedges(false); updateHUD(true); return true;
      }catch(e){ return false; } }

