// ---------- boot ----------
qa(document,'.fade-scroll').forEach(fadeScroll);
document.querySelectorAll('[data-art]').forEach(e=>e.insertAdjacentHTML('afterbegin',art(e.dataset.art,+e.dataset.size||24)));
// upload the shared effect textures once up front: otherwise each one is first sent to the GPU
// whenever its effect first happens (a random sparkle, a snore), which shows up as a tiny hitch
const warmTextures=()=>{ for(const t of [gradTex,glowTex,sparkTex,turfTex,crackTex,swirlTex,lawnTex,flowH,flowV,blobTex,zTex,slimeTex]) try{ renderer.initTexture(t);
  }catch(e){} };
const start=()=>{ const i=currentGardenIndex();
  { const dk=todayKey(); if(progress.lastDay!==dk){ progress.lastDay=dk; bumpStat('days'); save(); } } warmTextures(); applyWormColour();
    checkBadges(null,true); pickTod(); setInterval(pickTod,60000); setTimeout(statsBoot,2000);
  mode='garden'; li=i; showHome(true);
  // the home screen is already up; the garden and the home worm are built on the next frame and fade in
  requestAnimationFrame(()=>{ startLevel(LEVELS[i],false); initHomeWorm(); requestAnimationFrame(frame);
    const ask=new URLSearchParams(location.search).get('play'); if(ask){ try{ window.history.replaceState(null,'',location.pathname); }catch(e){} launchPlay(ask); } }); };
// what a launch URL asks for (?play=daily|meadow|continue): the app shortcuts and the reminder use these
function launchPlay(what){ ensureAudio(); if(what==='daily') $('dailyBtn').onclick(); else if(what==='meadow') $('meadowBtn').onclick(); else if(what==='continue') $('homePlay').onclick(); }
// an installed app reuses its open window (launch_handler focus-existing), so a shortcut used while it's running
// arrives here instead of reloading the page; the launch that opened the page is handled above
{ const bootURL=location.href; let first=true;
  if('launchQueue' in window) window.launchQueue.setConsumer(p=>{ const u=p&&p.targetURL, initial=first&&u===bootURL; first=false; if(!u||initial) return;
    const ask=new URL(u).searchParams.get('play'); if(ask) launchPlay(ask); }); }
(document.fonts&&document.fonts.ready? document.fonts.ready : Promise.resolve()).then(start);
