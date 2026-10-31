// ---------- offline play and install ----------
// A new deploy installs a new worker in the background. Installed apps are usually resumed rather
// than relaunched, so check for one whenever the app comes back to the foreground, and reload into
// the new version at a calm moment: right away on the home screen, otherwise on the way back home.
let updateReady=false;
const calmMoment=()=>$('homeOv').classList.contains('show') && !generating && !['winOv','genOv','introOv','resetOv','setOv','finOv'].some(isOpen);
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  const hadWorker=!!navigator.serviceWorker.controller; let controlled=hadWorker, reg=null;
  const check=()=>{ if(reg&&navigator.onLine!==false) reg.update().catch(()=>{}); };
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!controlled){ controlled=true; return; } // first install taking over, same version as this page
    if(updateReady) return; updateReady=true;
    if(calmMoment()) location.reload(); else toast('New patches arrived. They load when you head home.',4000); });
  navigator.serviceWorker.ready.then(()=>{ const told=store.get('squirm-offline-told')==='1'; store.set('squirm-offline-told','1');
    if(!told&&!hadWorker) setTimeout(()=>toast('Squirm is saved on this device. It plays offline too.',3200),1500); });
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{ reg=r; }).catch(()=>{}));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
  setInterval(check,30*60*1000); }
