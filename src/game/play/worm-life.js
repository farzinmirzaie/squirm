// head: faces where it's going, then turns to look at you when resting
const angLerp=(a,b,t)=>{ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; };
let blinkT=1.5, lookPhase='off', phaseT=0, lastExpr='smile';
const LOOK_DELAY=2.6, LOOK_TIME=4.2, AWAY_TIME=3.8;
// idle acts: small things the worm does by itself while the player thinks
let act=null, yawned=false;
const ACT_TIME={butterfly:3.4,stretch:1.7,wiggle:1.3,yawn:2.2};
function startAct(h,k){ act={k,t:0}; applyExpr(h,{butterfly:'wow',stretch:'joy',wiggle:'grin',yawn:'yawn'}[k]); if(k==='yawn') sfx('yawn'); }
function endAct(h){ if(!act) return; act=null; const b=h.userData.body; b.scale.set(1,1,1); h.rotation.z=0; h.userData.face.mouths.o.scale.set(1,1,1); }
let glanceT=0;
function burrowPos(){ for(let y=0;y<state.h;y++) for(let x=0;x<state.w;x++) if(state.grid[y][x]==='E') return wp(x,y); return null; }
function updateHead(dt){
  const h=segMeshes[0]; if(!h||!h.userData.body) return;
  const asleep=!animating && state.status==='play' && idleT-lastMoveT>25 && reactT<=0;
  if(asleep){ endAct(h); if(h.userData.expr!=='sleepy'){ applyExpr(h,'sleepy'); bumpStat('naps'); checkBadges(null); save(); } lookPhase='sleep';
    h.rotation.y=angLerp(h.rotation.y,Math.atan2(headDir[0],headDir[1]),1-Math.exp(-dt/1000*3)); h.userData.body.rotation.x+=(.25-h.userData.body.rotation.x)*(1-Math.exp(-dt/1000*3));
    h.userData.face.eyes.forEach(e=>e.scale.set(1,.22,1)); zT-=dt/1000; if(zT<0&&!reduceMotion){ zT=1.3; snore(h); } return; }
  if(lookPhase==='sleep'){ lookPhase='off'; applyExpr(h,'smile'); }
  if(reactT>0){ reactT-=dt/1000; if(reactT<=0 && lookPhase!=='look') applyExpr(h,'smile'); }
  if(photoOn){ const k=1-Math.exp(-dt/1000*5); endAct(h);
    h.rotation.y=angLerp(h.rotation.y,Math.atan2(camera.position.x-h.position.x,camera.position.z-h.position.z),k);
    h.userData.body.rotation.x+=(-.4-h.userData.body.rotation.x)*k; blinkEyes(h,dt); return; }
  const idleNow=!animating && state.status==='play' && idleT-lastMoveT>LOOK_DELAY && reactT<=0;
  if(!idleNow){ if(lookPhase==='look'||act) applyExpr(h,'smile'); endAct(h); lookPhase='off'; phaseT=0; if(idleT-lastMoveT<1) yawned=false; }
  else { phaseT+=dt/1000;
    if(lookPhase==='off'){ lookPhase='look'; phaseT=0; newExpression(h); }
    else if(lookPhase==='look' && phaseT>LOOK_TIME){ lookPhase='away'; phaseT=0; applyExpr(h,'smile');
      if(!reduceMotion&&Math.random()<.6){ const ks=['stretch','wiggle']; if(flyers.children.length) ks.push('butterfly','butterfly'); startAct(h,ks[Math.floor(Math.random()*ks.length)]); } }
    // a big yawn a few seconds before dozing off
    if(!yawned && !act && idleT-lastMoveT>21 && !reduceMotion){ yawned=true; lookPhase='away'; phaseT=0; startAct(h,'yawn'); }
    else if(lookPhase==='away' && phaseT>AWAY_TIME){ lookPhase='look'; phaseT=0; newExpression(h); } }
  const looking=lookPhase==='look';
  let moveYaw=Math.atan2(headDir[0],headDir[1]);
  if(glanceT>0){ glanceT-=dt/1000; const ex=burrowPos(); if(ex) moveYaw=Math.atan2(ex.x-h.position.x,ex.z-h.position.z); }
  const camYawR=Math.atan2(camera.position.x-h.position.x,camera.position.z-h.position.z);
  const k=1-Math.exp(-dt/1000*(looking?4:lookPhase==='away'?3.5:16));
  h.rotation.y=angLerp(h.rotation.y,looking?camYawR:moveYaw,k);
  let tilt=looking?-.45:0;
  if(act){ act.t+=dt/1000; const p=Math.min(1,act.t/ACT_TIME[act.k]), bell=Math.sin(p*Math.PI), b=h.userData.body;
    if(act.k==='butterfly'){ // follow the nearest butterfly with a look of wonder
      let best=null, bd=1e9; flyers.children.forEach(f=>{ const d=f.position.distanceToSquared(h.position); if(d<bd){ bd=d; best=f; } });
      if(best){ h.rotation.y=angLerp(h.rotation.y,Math.atan2(best.position.x-h.position.x,best.position.z-h.position.z),1-Math.exp(-dt/1000*5)); tilt=-.55; }
      if(p>.6&&h.userData.expr==='wow') applyExpr(h,'grin'); }
    if(act.k==='stretch'){ b.scale.set(1-.08*bell,1+.2*bell,1-.08*bell); tilt=-.35*bell; }
    if(act.k==='wiggle') h.rotation.z=Math.sin(act.t*20)*.13*(1-p);
    if(act.k==='yawn'){ tilt=-.42*bell; h.userData.face.mouths.o.scale.set(1+.4*bell,1+1.1*bell,1); }
    if(p>=1){ endAct(h); applyExpr(h,'smile'); } }
  h.userData.body.rotation.x+=(tilt-h.userData.body.rotation.x)*(act?1-Math.exp(-dt/1000*6):k);
  blinkEyes(h,dt);
}
function blinkEyes(h,dt){ blinkT-=dt/1000; let bl=1; if(blinkT<0){ bl=Math.max(.08,Math.abs(blinkT+.07)/.07); if(blinkT<-.14){ blinkT = Math.random()<.25 ? .18 : 1.8+Math.random()*2.5; } }
  h.userData.face.eyes.forEach(e=>{ const s=e.userData.baseS||1; e.scale.set(s,s*(e.userData.baseY||1)*bl,s); }); }
function newExpression(h){ let e; do{ e=EXPRS[Math.floor(Math.random()*EXPRS.length)]; }while(e===lastExpr); lastExpr=e; applyExpr(h,e);
  const b=h.userData.body; tween(320,(x,k)=>{ const s=1+Math.sin(k*Math.PI)*.08; b.scale.set(s,1/s,s); },()=>b.scale.set(1,1,1)); }

