// ---------- settings: pages, toggles, theme, save code backup and restore ----------
function renderSettings(){ renderNews(); $('setMusic').setAttribute('aria-checked',String(musicOn)); $('setMusicVol').value=Math.round(musicVol*100);
  $('volRow').hidden=!musicOn;
  // a little summary of the garden at the top
  qa($('setGfx'),'button').forEach(b=>{ const on=b.dataset.g===gfx; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); });
    $('setSound').setAttribute('aria-checked',String(!muted)); applyTheme();
  qa($('setHaptic'),'button').forEach(b=>{ const on=+b.dataset.h===hapticLvl; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); });
  $('setCalm').setAttribute('aria-checked',String(calmMotion)); $('setBig').setAttribute('aria-checked',String(bigText)); $('setMarks').setAttribute('aria-checked',String(colourMarks));
  $('statsRow').hidden=$('statsNote').hidden=!statsLive(); $('setStats').setAttribute('aria-checked',String(statsOn())); $('saveCode').hidden=true;
    $('saveCode').value=''; $('saveLoad').textContent='Restore'; renderRemind(); }
$('settingsBtn').onclick=()=>{ ensureAudio(); renderSettings(); $('setScroll').scrollTop=0; const d=$('setOv').querySelector('details'); if(d) d.open=false;
  show('setOv'); pushLayer('settings'); stagger(qa($('setScroll'),':scope > *'),'rise',60,45); };
$('setClose').onclick=()=>{ hide('setOv'); popLayer('settings'); renderHome(); };
$('setGfx').querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(gfx===b.dataset.g) return; gfx=b.dataset.g; store.set('squirm-gfx',gfx);
  if(gfx==='saver') setQuality(0); else if(gfx==='best') setQuality(2); renderSettings(); settle(b); });
$('setSound').onclick=()=>{ toggleMute(); renderSettings(); };
$('setStats').onclick=()=>{ const on=!statsOn(); store.set('squirm-stats',on?'1':'0'); sfx(on?'on':'off'); renderSettings(); };
// vibration strength: the choice plays a little sample (the flag's ta-da) so the difference can be felt
qa($('setHaptic'),'button').forEach(b=>b.onclick=()=>{ setHaptics(+b.dataset.h); buzz(HAPTIC.flag); renderSettings(); settle(b); });
// comfort: device-specific switches (in SAVE_SKIP)
const comfort=(key,get,set)=>{ const on=!get(); set(on); store.set(key,on?'1':'0'); applyComfort(); sfx(on?'on':'off'); renderSettings(); };
$('setCalm').onclick=()=>comfort('squirm-calm',()=>calmMotion,v=>calmMotion=v);
$('setBig').onclick=()=>comfort('squirm-bigtext',()=>bigText,v=>bigText=v);
$('setMarks').onclick=()=>comfort('squirm-marks',()=>colourMarks,v=>{ colourMarks=v; syncMarks(); if(state) updateHUD(true); });
$('setMusicVol').oninput=e=>{ musicVol=e.target.value/100; store.set('squirm-music-vol',String(musicVol)); ensureAudio(); musicTick(); };
$('setMusic').onclick=()=>{ musicOn=!musicOn; store.set('squirm-music',musicOn?'1':'0'); ensureAudio(); sfx(musicOn?'on':'off'); renderSettings();
  if(musicOn&&muted) toast('Turn sound on to hear the music.',2400); };
// a save code is every squirm- key (except throwaway ones) as base64 JSON with a version prefix
const SAVE_PREFIX='SQUIRM1:', SAVE_SKIP=['squirm-quality','squirm-gfx','squirm-offline-told','squirm-daily-patch','squirm-remind','squirm-boot','squirm-stats','squirm-stats-v','squirm-calm','squirm-bigtext','squirm-marks','squirm-haptics','squirm-install-hide'];
function saveCode(){ const d={}; for(const k of store.keys()) if(!SAVE_SKIP.includes(k)) d[k]=store.get(k);
  return SAVE_PREFIX+btoa(unescape(encodeURIComponent(JSON.stringify(d)))); }
function readSaveCode(code){ code=String(code||'').trim(); if(!code.startsWith(SAVE_PREFIX)) return null;
  try{ const d=JSON.parse(decodeURIComponent(escape(atob(code.slice(SAVE_PREFIX.length))))); if(!d||typeof d!=='object'||!d['squirm-progress']) return null;
    for(const k in d) if(!k.startsWith('squirm-')||typeof d[k]!=='string') return null; JSON.parse(d['squirm-progress']); return d; }catch(e){ return null; } }
$('saveCopy').onclick=async()=>{ const c=saveCode(); try{ await navigator.clipboard.writeText(c); toast('Save code copied. Keep it somewhere safe.',2600); }
  catch(e){ const t=$('saveCode'); t.hidden=false; t.value=c; t.focus(); t.select(); toast('Copy the code from the box.',2600); } };
$('saveLoad').onclick=()=>{ const t=$('saveCode');
  if(t.hidden||!t.value.trim()){ t.hidden=false; t.value=''; t.focus(); $('saveLoad').textContent='Load it'; return; }
  const d=readSaveCode(t.value); if(!d){ nope(t,"That code doesn't look right. Check it was copied in full.",3000); return; }
  try{ Object.keys(localStorage).filter(k=>k.startsWith('squirm-')&&!SAVE_SKIP.includes(k)).forEach(k=>localStorage.removeItem(k));
    for(const k in d) localStorage.setItem(k,d[k]); }catch(e){ toast("Couldn't save on this device.",2600); return; }
  buzz([20,40,20]); location.reload(); };

