// ---------- moves ----------
function canMove(){ return ['N','S','W','E'].some(d=>!step(state,d).blocked); }
function tryMove(dir){
  if(!dir||anyOverlay()||photoOn) return;
  if(animating){ if(queue.length<6) queue.push(dir); return; }
  const r=step(state,dir);
  if(r.blocked){ if(r.blocked==='over') return; queue.length=0; sfx('bump'); lastMoveT=idleT; react('oops',650);
    if(r.blocked==='locked') toast('This gate is locked. Find a key first.');
    if(r.blocked==='snail') toast('A snail is in the way. It will slide along soon.');
    if(r.blocked==='beetle'){ const h=state.segs[0], dd=DIRS[dir], bi=beetleAt(state,h[0]+dd[0],h[1]+dd[1]); beetleNope(bi);
      toast('The beetle can\'t budge that way. Something is behind it.'); }
    if(r.blocked==='water') toast('Too wet to cross here. Look for a bridge.');
    if(r.blocked==='bridge') toast('Bridges only go along their planks.');
    if(r.blocked==='flooded') toast('That puddle is full of water. Wait for the sun.');
    if(r.blocked==='sprout') toast('Just a seedling. It needs rain to grow into a leaf.');
    if(r.blocked==='hedge') toast('The hedge only opens while part of you rests on a flower.');
    if(r.blocked==='petals'){ const h=state.segs[0], dd=DIRS[dir], gx=h[0]+dd[0], gy=h[1]+dd[1], P=POLL[tileAt(state,gx,gy).toUpperCase()]; petalsNope(gx,gy);
      toast(`These petals only open for ${P.n} pollen. Find a ${P.n} flower first.`); }
    if(r.blocked==='body'&&tileAt(state,state.segs[0][0]+DIRS[dir][0],state.segs[0][1]+DIRS[dir][1])===SOFT&&state.segs.length>2) toast('Soft soil lets you burrow past your body, but not fold back on yourself.');
    nudge(dir); return; }
  history.push(state); const prev=state; state=r.state; lastMoveT=idleT; clearHint(); saveResume(); bumpStat('moves'); dismissTutorial();
  if(r.ev.slide){ progress.stats.slideMax=Math.max(progress.stats.slideMax||0,r.ev.slide.length);
    slideSteps=r.ev.slide.slice(1).map(x=>({state:x.state,ev:x.ev})).concat([{state:r.state,ev:r.ev}]); state=r.ev.slide[0].state;
    animateMove(prev,r.ev.slide[0].ev,dir); return; }
  animateMove(prev,r.ev,dir);
}
function nudge(dir){ // the head leans toward the blocked spot and springs back
  const h=segMeshes[0]; if(!h) return; const base=h.position.clone(); const d=DIRS[dir]; animating++;
  const look=Math.atan2(d[0],d[1]); h.rotation.y=angLerp(h.rotation.y,look,.6);
  tween(260,(e,k)=>{ const s=Math.sin(k*Math.PI)*.13*(1-k*.3); h.position.set(base.x+d[0]*s,base.y,base.z+d[1]*s); },()=>{ h.position.copy(base); animating--; if(queue.length) tryMove(queue.shift()); });
}
let slideSteps=[];
function animateMove(prev,ev,dir,sliding){
  animating++;
  const d=DIRS[dir]; headDir=[d[0],d[1]];
  sfx(ev.portal?'portal':sliding?'slide':'move',state.moves);
  if(sliding) bumpStat('slides'); if(ev.eaten==='+'||ev.eaten==='-') bumpStat('fruit');
  { const t=ev.eaten&&sayFor(ev.eaten); if(t&&!sliding) wormSays(t,1400); }
  if(ev.eaten==='C') bumpStat('flags'); if(ev.eaten==='G') bumpStat('gates'); if(ev.portal) bumpStat('tunnels'); if(ev.rain===true) bumpStat('rains');
  if(ev.swung&&ev.swung.length) bumpStat('swings'); if(ev.crumbled&&ev.crumbled.length) bumpStat('crumbles',ev.crumbled.length);
  syncBoard(true); syncWeather(true); syncHedges(true); if(ev.snails) syncSnails(true,ev);
  if(ev.pushed){ pushBeetle(ev.pushed,sliding?95:queue.length?110:170); bumpStat('pushes'); const bb=state.beetles[ev.pushed.i];
    if(bb&&tileAt(state,bb.x,bb.y)==='B') bumpStat('beetleFlower'); }
  if(ev.swung){ sfx('creak'); const it=cells[state.segs[0][1]][state.segs[0][0]].item; if(it&&it.userData.wheel){ const w=it.userData.wheel, z0=w.rotation.z;
    tween(600,(e)=>{ w.rotation.z=z0-e*Math.PI*1.5; }); }
    if(!ev.swung.length) toast('Nothing turned. Bridges with you on them stay put.',2400); }
  if(ev.pollen){ pollensHere.add(ev.pollen); if(pollensHere.size===3&&!progress.stats.allPollen) bumpStat('allPollen'); const h=state.segs[0];
    pollenPuff(wp(h[0],h[1],.25),ev.pollen); sfx('pollen'); bumpStat('dusts'); react('wow',700);
    if(!sliding){ const t=sayFor('pollen'); if(t) wormSays(t,1400); } }
  if(ev.cross){ dustPuff(wp(ev.cross[0],ev.cross[1],.05),C.softSoil); sfx('dig'); bumpStat('burrows'); }
  if(ev.rain!==undefined){ sfx(ev.rain?'rainOn':'rainOff');
    toast(ev.rain?'Rain is falling. Leaves grow, puddles fill.':'The sun is back. Puddles dry, leaves fold away.',2400); }
  const n=state.segs.length, on=prev.segs.length;
  while(segMeshes.length<n){ const t=prev.segs[on-1]; const s=makeSeg(segMeshes.length); s.position.copy(wp(t[0],t[1],.25)); s.scale.setScalar(.2);
    segMeshes.push(s); }
  const extras=segMeshes.splice(n); tailExtras=extras;
  const starts=segMeshes.map(s=>s.position.clone()), sc0=segMeshes.map(s=>s.scale.x);
  const targets=state.segs.map((p,i)=>wp(p[0],p[1],segY(i,n)));
  const viaP = ev.portal? wp(ev.via[0],ev.via[1],.3):null;
  const tele=segMeshes.map((s,i)=>{ if(i===0||starts[i].distanceTo(targets[i])<1.3) return null; const q=state.segs[i]; const pp=partner(state,q[0],q[1]);
    return pp ? {down:wp(pp[0],pp[1],-.3), up:wp(q[0],q[1],-.3)} : {down:starts[i].clone().setY(-.3), up:targets[i].clone().setY(-.3)}; });
  const ex0=extras.map(s=>s.position.clone()); const exT=extras.map((s,j)=>j===0?starts[n-1]:ex0[j-1]);
  const dur=sliding?95:queue.length?110:170;
  tween(dur,(e,k)=>{ crawlK=k;
    segMeshes.forEach((s,i)=>{
      const sc=sc0[i]+(1-sc0[i])*e;
      // the head crawls over the tunnel and sinks into it (the turf hides it), then pops up out of the partner
      if(i===0 && viaP){ if(k<.5){ const a=Math.min(1,k*3.2), b=Math.max(0,(k-.28)/.22); s.position.lerpVectors(starts[0],viaP,1-(1-a)*(1-a));
        s.position.y-=b*b*.58; s.scale.setScalar(1-.4*b); }
        else { const a=(k-.5)*2, u=1-(1-a)*(1-a); s.position.copy(targets[0]); s.position.y=-.28+(targets[0].y+.28)*u+Math.sin(a*Math.PI)*.06;
          s.scale.setScalar(.6+.4*u); } return; }
      if(tele[i]){ const t=tele[i]; if(k<.5) s.position.lerpVectors(starts[i],t.down,k*2); else s.position.lerpVectors(t.up,targets[i],(k-.5)*2);
        s.scale.setScalar(sc); return; }
      s.position.lerpVectors(starts[i],targets[i],e);
      if(i===0){ const sq=Math.sin(Math.PI*k)*.14; s.position.y+=Math.sin(Math.PI*k)*.08; s.scale.set(sc*(1+sq*.5),sc*(1-sq),sc*(1+sq*.5)); }
      else { s.scale.setScalar(sc); s.position.y+=Math.sin(Math.PI*k)*(i%2?.07:.02); }
    });
    extras.forEach((s,j)=>{ if(ex0[j].distanceTo(exT[j])<1.3) s.position.lerpVectors(ex0[j],exT[j],e); else s.position.y=ex0[j].y-e*.4; s.scale.setScalar(Math.max(.01,(1-e)*.7)); });
  },()=>{
    crawlK=-1; extras.forEach(removeObj); tailExtras=[]; squishTile(state.segs[0]);
    segMeshes.forEach(s=>s.scale.setScalar(1));
    if(ev.portal) burst(wp(ev.via[0],ev.via[1],.3),C.portal[tileAt(state,ev.via[0],ev.via[1])]||0xffffff);
    animating--; lastMoveT=idleT;
    if(slideSteps.length){ const p=state, nx=slideSteps.shift(); state=nx.state; animateMove(p,nx.ev,dir,true); return; }
    updateHUD(); if(state.status!=='won'&&checkBadges(null).length===0) save();
    if(state.status==='won') return winSeq();
    if(ev.exitNote) toast(ev.exitNote==='flags'?'The burrow opens once every flag is touched.':`This burrow fits a length of ${state.exitLen}. You're ${state.segs.length}.`);
    else if(!canMove()){ queue.length=0; sfx('stuck'); pulse($('undoBtn')); toast('No way forward from here. Undo, or hold Undo to start over.',3600); }
    if(queue.length) tryMove(queue.shift());
  });
}
function squishTile(p){ if(reduceMotion) return; const c=cells[p[1]]&&cells[p[1]][p[0]]; if(!c||!c.tile) return; const t=c.tile, y0=0;
  tween(260,(e,k)=>{ t.position.y=y0-Math.sin(k*Math.PI)*.045; },()=>{ t.position.y=y0; }); }
function winSeq(){
  animating++; queue.length=0; sfx('win'); react('joy',5000); const ex=state.segs[0]; const target=wp(ex[0],ex[1],0);
  const n=segMeshes.length; const cell=cells[ex[1]][ex[0]]; if(cell.item&&cell.item.userData.sprite) cell.item.userData.sprite.visible=false;
  burst(wp(ex[0],ex[1],.4),C.ready); burst(wp(ex[0],ex[1],.6),C.flag);
  if(!reduceMotion){ const c=wp(ex[0],ex[1],0); for(let i=0;i<8;i++){ const f=bloom(.01); const a=i/8*Math.PI*2;
    f.position.set(c.x+Math.cos(a)*.62,.0,c.z+Math.sin(a)*.62); fx.add(f);
      const d=i*70; tween(500+d,(e,k)=>{ const t=Math.max(0,(k*(500+d)-d)/500); f.scale.setScalar(Math.max(.01,1.1*t*(1+Math.sin(t*Math.PI)*.35))); }); } }
  const total=500+n*90;
  tween(total,(e,k)=>{ segMeshes.forEach((s,i)=>{ const st=i*90/total; const kk=Math.max(0,Math.min(1,(k-st)/(1-st)));
    const path=state.segs.slice(0,i+1).reverse().map(p=>wp(p[0],p[1],segY(i,n))); path.push(target.clone().setY(-.3));
    const f=kk*(path.length-1); const a=Math.floor(Math.min(f,path.length-1.001)); const t=f-a;
    s.position.lerpVectors(path[a],path[a+1],t);
    s.scale.setScalar(a>=path.length-2?Math.max(.02,1-t*.98):1); }); },
    ()=>{ animating--; wormG.visible=false; onWin(); });
}
function petals(){ if(reduceMotion) return; const box=$('petals'); box.innerHTML='';
  const cols=['var(--petal)','var(--honey)','var(--lilac)','var(--berry)','var(--leaf)'];
  for(let i=0;i<36;i++){ const p=document.createElement('i'); p.style.left=Math.random()*100+'%'; p.style.background=cols[i%cols.length];
    p.style.animationDelay=(Math.random()*.9)+'s'; p.style.animationDuration=(2+Math.random()*1.5)+'s'; box.appendChild(p); }
  setTimeout(()=>box.innerHTML='',4200); }
function starsFor(mv,par,hinted){ let s = mv<=par?3 : mv<=Math.ceil(par*1.3)?2 : 1; if(hinted) s=Math.min(s,2); return s; }
const STAR=(on,i)=>`<svg class="star ${on?'on':''}" style="animation-delay:${.15+i*.18}s" width="44" height="44" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" style="fill:${on?'var(--honey)':'var(--edge)'}" stroke="#5B4436" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
let shareText='', newBest=false, chapterDone=null;
const shareLine=(what,mv,par,st)=>`Squirm, ${what}: ${mv} moves (par ${par}) ${'★'.repeat(st)}${'☆'.repeat(3-st)}`+(GAME_URL?'\n'+GAME_URL:'');
let winHats=[];
function onWin(){ shareText=''; newBest=false; chapterDone=null; const coloursBefore=coloursUnlocked(), patsBefore=patternsUnlocked();
  winHats=HATS.filter(hatUnlocked).map(h=>h[0]);
  const par=curPar(), mv=state.moves; const st=starsFor(mv,par,hintsUsed>0); clearResume();
  const titles=['Snug as a bug!','Home sweet burrow!','Wiggle well done!','Cozy and curled up!'];
  const gifts=[], gift=(ico,t,sub,hot)=>gifts.push({ico,t,sub,hot});
  if(mode==='garden'){
    const nm=LEVELS[li].name, best=progress.best[nm]; if(best==null) stat('clear/'+pad3(li+1)); if(best!=null&&mv<best) newBest=true;
      if(best==null||mv<best) progress.best[nm]=mv;
    const ch=CHAPTERS.find(c=>li>=c.from&&li<=c.to); const wasDone=ch&&best!=null; if(ch && best==null){ let all=true;
      for(let i=ch.from;i<=ch.to;i++) if(i!==li&&!isCleared(i)) all=false; if(all) chapterDone=ch.name; }
    progress.stars[nm]=Math.max(progress.stars[nm]||0,st);
    const last=li===LEVELS.length-1;
    $('winTitle').textContent = last ? 'The whole garden!' : chapterDone ? 'Chapter complete!' : titles[li%titles.length];
    if(chapterDone){ stat('chapter/'+String(CHAPTERS.indexOf(ch)+1).padStart(2,'0')); const h=HATS.find(x=>x[2]===CHAPTERS.indexOf(ch)); gift(h?hatArt(h[0],28):art('book',26),`${chapterDone} finished`,'The whole chapter is grown',true); }
    if(!chapterDone && ch){ let left=0; for(let i=ch.from;i<=ch.to;i++) if(i!==li&&!isCleared(i)) left++; if(left) gift(art('sprout',26),`${left} more in ${ch.name}`,`Patch ${li-ch.from+1} of ${ch.to-ch.from+1} grown`); }
    // 5. say so when the next patch opens a new chapter
    const nextCh=!last&&CHAPTERS.find(c=>c.from===li+1);
    $('winNext').textContent = last&&allCleared() ? "What's next?" : last ? 'Back to patch 1' : nextCh ? 'Next chapter' : 'Next patch';
    if(nextCh) gift(art('flag',26),`Next up: ${nextCh.name}`,'A new chapter opens');
    shareText=shareLine(`patch ${li+1} (${nm})`,mv,par,st);
  } else if(L.daily){
    const D=progress.daily, k=L.daily, prev=D.results[k];
    if(!prev){ bumpStat('dailies'); stat('daily'); const y=new Date(); y.setDate(y.getDate()-1); const yk=dateKey(y);
      D.streak = D.last===yk ? D.streak+1 : 1; D.best=Math.max(D.best,D.streak); D.last=k; }
    if(!prev||mv<prev.moves) D.results[k]={moves:mv,stars:Math.max(st,prev?prev.stars:0)};
    const old=new Date(); old.setDate(old.getDate()-90); const ok=dateKey(old); for(const d in D.results) if(d<ok) delete D.results[d];
    $('winTitle').textContent="Today's patch, done!"; $('winNext').textContent='Back home'; shareRemindState();
    gift(art('flame',26),`${D.streak} day streak`,`Your best is ${D.best}. See you tomorrow!`,D.streak>1);
    shareText=shareLine(`daily patch ${k}`,mv,par,st);
  } else {
    const e=progress.endless[endlessDiff]; e.cleared++; stat('meadow/'+endlessDiff); e.streak++; e.best=Math.max(e.best,e.streak); e.stars+=st;
    $('winTitle').textContent = titles[e.cleared%titles.length];
    $('winNext').textContent = 'Grow another'; setTimeout(startPrefetch,900);
    shareText=shareLine(`${DIFF_NAME[endlessDiff].toLowerCase()} endless patch, streak ${e.streak}`,mv,par,st);
    gift(art(DIFF_ICON_KEY[endlessDiff],26),`${DIFF_NAME[endlessDiff]} streak ${e.streak}`,`${e.cleared} cleared, best streak ${e.best}`,e.streak>1&&e.streak===e.best);
  }
  { const hr=new Date().getHours(); if(hr>=15&&hr<17) bumpStat('teatime'); }
  if(mode==='garden'&&!hintsUsed) progress.clean[LEVELS[li].name]=true;
  save(); askPersist();
  const hatsBefore=winHats;
  const earned=checkBadges({won:true,mv,par,secs:playT,hour:new Date().getHours(),undos:undosHere,hinted:hintsUsed>0});
  earned.forEach(b=>gift(art(b[1],26),b[2],'New badge',true));
  const newHat=HATS.find(h=>h[0]!=='none'&&hatUnlocked(h)&&!hatsBefore.includes(h[0]));
  if(newHat) gift(hatArt(newHat[0],28),newHat[1],'New hat for your wardrobe',true);
  const newPat=patternsUnlocked().find(x=>!patsBefore.includes(x)); if(newPat){ const p=PATTERNS.find(x=>x[0]===newPat);
    gift(patArt(p[0],30),p[1],'New worm pattern',true); }
  if(coloursUnlocked()>coloursBefore){ const ci=coloursUnlocked()-1; gift(patArt(patOn(),30,ci),WORM_COLS[ci][0],'New worm colour',true); }
  $('winStars').innerHTML=[0,1,2].map(i=>STAR(i<st,i)).join('');
  $('winSub').textContent = hintsUsed ? `You used ${hintsUsed} ${hintsUsed===1?'hint':'hints'}. Solve it on your own for 3 stars.` : mv<=par ? 'Right on par. Lovely crawling!' : `There's a shorter way, in ${par} moves.`;
  $('winStats').innerHTML=`<span class="${mv<=par?'good':''}">${mv}<small>moves</small>${newBest?'<em>New best</em>':''}</span><span>${par}<small>par</small></span><span>${playTime()}<small>time</small></span>`;
  // the rewards first, then progress notes
  gifts.sort((a,b)=>(b.hot?1:0)-(a.hot?1:0));
  $('winGifts').innerHTML=gifts.map(g=>`<div class="gift ${g.hot?'hot':''}"><span class="gi" aria-hidden="true">${g.ico}</span><span><b>${g.t}</b><small>${g.sub}</small></span></div>`).join('');
  $('winGifts').scrollTop=0;
  for(let i=0;i<st;i++) setTimeout(()=>buzz(12),200+i*180);
  if(!reduceMotion) for(let i=0;i<st;i++) tone([784,988,1318][i],.25,{vol:.1,delay:.2+i*.18});
  photoInfo={title:mode==='garden'?`${li+1}. ${LEVELS[li].name}`:L.daily?"Today's patch":'A meadow patch',st};
  $('winShare').hidden=!shareText; petals(); show('winOv'); pushLayer('win');
  stagger([$('winStats'),...qa($('winGifts'),'.gift'),$('winNext'),document.querySelector('.win-acts')],'rise',380,70,8);
}
