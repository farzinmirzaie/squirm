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
    if(new URLSearchParams(location.search).get('play')==='daily'){ try{ window.history.replaceState(null,'',location.pathname);
      }catch(e){} $('dailyBtn').onclick(); } }); };
(document.fonts&&document.fonts.ready? document.fonts.ready : Promise.resolve()).then(start);
