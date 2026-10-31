// ---------- native back button: a small stack of layers mirrored in browser history ----------
const layers=[]; let ignorePop=0;
function pushLayer(n){ layers.push(n); try{ window.history.pushState({squirm:layers.length},''); }catch(e){} }
// replace the layers from `from` upward with one new layer, without racing the async history.go
function swapLayers(from,n){ const i=layers.lastIndexOf(from); if(i<0){ pushLayer(n); return; } const k=layers.length-i; layers.length=i; layers.push(n);
  if(k>1){ ignorePop++; try{ window.history.go(-(k-1)); }catch(e){ ignorePop--; } } }
function popLayer(n){ const i=layers.lastIndexOf(n); if(i<0) return; const k=layers.length-i; layers.length=i; ignorePop++; try{ window.history.go(-k); }catch(e){ ignorePop--; } }
function enterGame(){ const top=layers[layers.length-1];
  if(top==='game') return;
  if(layers.includes('game')){ popLayer(layers[layers.indexOf('game')+1]); return; }
  if(top==='tab'){ layers[layers.length-1]='game'; try{ window.history.replaceState({squirm:layers.length},''); }catch(e){} return; }
  pushLayer('game'); }
window.addEventListener('popstate',()=>{ if(ignorePop>0){ ignorePop--; return; } const top=layers.pop();
  if(top==='intro') closeIntro(true);
  else if(top==='reset') hide('resetOv');
  else if(top==='finale') hide('finOv');
  else if(top==='settings') hide('setOv');
  else if(top==='tab') showTab('play',true);
  else if(top==='photo') exitPhoto();
  else if(top==='win'){ hide('winOv'); if(layers.includes('game')) popLayer('game'); showHome(); }
  else if(top==='game'){ hideAll(); showHome(); } });

