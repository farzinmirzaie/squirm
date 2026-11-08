// ---------- badges: small goals, checked after wins and after moves that bump a counter ----------
progress.badges=progress.badges||{}; progress.stats=Object.assign({slides:0,hedges:0,fruit:0},progress.stats||{}); progress.clean=progress.clean||{};
// dailies finished, counted from now on; players from before start with the days still on record (the last 90)
if(progress.stats.dailies==null) progress.stats.dailies=Object.keys(progress.daily.results).length;
const anyChapter=f=>CHAPTERS.some(ch=>{ for(let i=ch.from;i<=ch.to;i++) if(!f(i)) return false; return true; });
// a badge test that also reports progress: [have, need], shown on the badges screen
const BADGES=[
  ['first','sprout','First wiggle','Finish your first patch.',c=>(c&&c.won)||LEVELS.some((l,i)=>isCleared(i))],
  ['par','target','Right on par','Finish a patch in par moves or fewer.',c=>c&&c.won&&c.mv<=c.par],
  ['chapter','book','Chapter done','Finish every patch in a chapter.',()=>anyChapter(isCleared)],
  ['clean','bulb','All by myself','Finish a whole chapter without using a hint.',()=>anyChapter(i=>progress.clean[LEVELS[i].name])],
  ['stars50','star','Star gazer','Collect 50 stars in the garden.',counted(()=>[starTotal(),50])],
  ['stars150','stars','Constellation','Collect 150 stars in the garden.',counted(()=>[starTotal(),150])],
  ['garden','house','The whole garden','Finish every garden patch.',counted(()=>[LEVELS.filter((l,i)=>isCleared(i)).length,LEVELS.length])],
  ['daily','calendar','Early bird','Finish a daily patch.',()=>Object.keys(progress.daily.results).length>0],
  ['streak7','week','Week of wiggles','Keep a seven day daily streak.',counted(()=>[progress.daily.best,7])],
  ['meadow','wheat','Meadow wanderer','Clear ten endless patches.',counted(()=>[['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0),10])],
  ['brave','shield','Brave little worm','Clear a hard endless patch.',()=>progress.endless.hard.cleared>0],
  ['slides','wetleaf','Slip and slide','Slide across 50 wet leaves.',counted(()=>[progress.stats.slides,50])],
  ['hedges','hedge','Green thumb','Open hedges 20 times.',counted(()=>[progress.stats.hedges,20])],
  ['pushes','beetle','Heave-ho','Push beetles 25 times.',counted(()=>[progress.stats.pushes,25])],
  ['snacks','peach','Snack attack','Eat 30 peaches and mushrooms.',counted(()=>[progress.stats.fruit,30])],
  ['owl','moon','Night owl','Finish a patch between 10 pm and 5 am.',c=>c&&c.won&&(c.hour>=22||c.hour<5)],
  ['quick','bolt','Quick crawl','Finish a patch with a par of 10 or more in under 30 seconds.',c=>c&&c.won&&c.par>=10&&c.secs<30],
  ['flags','flag','Flag collector','Touch 100 flags.',counted(()=>[progress.stats.flags,100])],
  ['tunnels','tunnel','Burrow buddy','Travel through tunnels 25 times.',counted(()=>[progress.stats.tunnels,25])],
  ['gates','key','Key keeper','Open 15 gates.',counted(()=>[progress.stats.gates,15])],
  ['crumbs','crack','Crumbly ground','Watch 50 dry patches sink.',counted(()=>[progress.stats.crumbles,50])],
  ['rain','rain','Rain dancer','Start the rain 10 times.',counted(()=>[progress.stats.rains,10])],
  ['bridges','bridge','Bridge keeper','Swing bridges 15 times.',counted(()=>[progress.stats.swings,15])],
  ['moves','steps','Long crawl','Crawl 1,000 moves.',counted(()=>[progress.stats.moves,1000])],
  ['undos','rewind','Second thoughts','Take back 100 moves.',counted(()=>[progress.stats.undos,100])],
  ['taps','heart','Best friends','Say hi to the worm 20 times.',counted(()=>[progress.stats.taps,20])],
  ['nap','zzz','Nap time','Let the worm doze off mid-patch.',counted(()=>[progress.stats.naps,1])],
  ['sage','owl','Puzzle sage','Finish 20 patches without a hint.',counted(()=>[Object.keys(progress.clean).length,20])],
  ['shiny','sparkles','Shining garden','Get three stars on 30 patches.',counted(()=>[LEVELS.filter(l=>progress.stars[l.name]===3).length,30])],
  ['chapters','blossom','Seasoned gardener','Finish seven chapters.',counted(()=>[CHAPTERS.filter((ch,k)=>chapterCleared(k)).length,7])],
  ['month','month','Month of wiggles','Keep a 30 day daily streak.',counted(()=>[progress.daily.best,30])],
  ['fearless','mountain','Fearless','Clear ten hard endless patches.',counted(()=>[progress.endless.hard.cleared,10])],
  ['dressup','hat-tophat','Dress-up box','Unlock five hats.',counted(()=>[HATS.filter(h=>h[0]!=='none'&&hatUnlocked(h)).length,5])],
  ['rainbow','rainbow','Rainbow worm','Unlock every worm colour.',counted(()=>[coloursUnlocked(),WORM_COLS.length])],
  ['patterns','worm','Dressed to wiggle','Unlock every worm pattern.',counted(()=>[patternsUnlocked().length,PATTERNS.length])],
  ['golden','trophy','Golden chapter','Get three stars on every patch in a chapter.',()=>anyChapter(i=>progress.stars[LEVELS[i].name]===3)],
  ['allstars','crown','Every star in the sky','Get three stars on every garden patch.',counted(()=>[LEVELS.filter(l=>progress.stars[l.name]===3).length,LEVELS.length])],
  ['pure','daisy','Pure gardener','Finish 100 patches without a hint.',counted(()=>[Object.keys(progress.clean).length,100])],
  ['notake','tulip','No take-backs','Finish a patch with a par of 25 or more without undo or hints.',c=>c&&c.won&&c.par>=25&&c.undos===0&&!c.hinted],
  ['lightning','flame','Lightning worm','Finish a patch with a par of 30 or more, right on par, in under a minute.',c=>c&&c.won&&c.par>=30&&c.mv<=c.par&&c.secs<60],
  ['sunrises','sun','Fifty sunrises','Finish 50 daily patches.',counted(()=>[progress.stats.dailies,50])],
  ['legend','tree','Meadow legend','Clear 50 hard endless patches.',counted(()=>[progress.endless.hard.cleared,50])],
  ['unstoppable','bee','Unstoppable','Clear 10 hard endless patches in a row.',counted(()=>[progress.endless.hard.best,10])],
  ['appetite','mushroom','Big appetite','Eat 200 peaches and mushrooms.',counted(()=>[progress.stats.fruit,200])],
  ['flowerpower','flowerbtn','Flower power','Push a beetle onto a flower button.',counted(()=>[progress.stats.beetleFlower,1])],
  ['wheee','leaf','Wheee!','Slide across four wet leaves in one go.',counted(()=>[progress.stats.slideMax,4])],
  ['photos','camera','Say cheese','Snap 5 photos of your garden.',counted(()=>[progress.stats.photos,5])],
  ['marathon','butterfly','Marathon worm','Crawl 10,000 moves.',counted(()=>[progress.stats.moves,10000])],
  ['dawn','drop','Dawn chorus','Finish a patch between 5 and 7 in the morning.',c=>c&&c.won&&c.hour>=5&&c.hour<7],
  ['hatrack','hat-gold','Hat collector','Unlock every hat.',counted(()=>[HATS.filter(h=>h[0]!=='none'&&hatUnlocked(h)).length,HATS.length-1])],
  ['fashion','extra-shades','Fashion icon','Unlock every extra.',counted(()=>[EXTRAS.filter(e=>e[0]!=='none'&&e[3]()).length,EXTRAS.length-1])],
  ['critters','hat-shell','Critter wrangler','Finish every patch in Critter crossing.',()=>chapterCleared(16)],
  ['harvest','hat-pumpkin','Harvest home','Finish every patch in Harvest moon.',()=>chapterCleared(17)],
  ['pollinator','pollenY','Busy pollinator','Get dusted with pollen 50 times.',counted(()=>[progress.stats.dusts,50])],
  ['knots','soil','Tied in knots','Burrow under yourself 25 times.',counted(()=>[progress.stats.burrows,25])],
  ['tangled','hat-gnome','Deep roots','Finish every patch in Tangled roots.',()=>chapterCleared(20)],
  ['farfields','hat-explorer','Far and wide','Finish every patch in Far fields.',()=>chapterCleared(21)],
  ['moonlit','hat-owl','Moonlit wanderer','Finish every patch in Moonlit meadow.',()=>chapterCleared(22)],
  ['homeward','hat-nightcap','Home at last','Finish every patch in Long way home.',()=>chapterCleared(23)],
  ['twirl','hat-twirl','Turnabout','Finish every patch in Twirl-caps.',()=>chapterCleared(24)],
  ['vane','hat-vane','Which way now?','Finish every patch in Topsy-turvy.',()=>chapterCleared(25)],
  ['showers','hat-boat','Puddle sailor','Finish every patch in Spring showers.',()=>chapterCleared(26)],
  ['orchard','hat-apple','Orchard keeper','Finish every patch in Old orchard.',()=>chapterCleared(27)],
  ['digin','hat-flowerpot','Down to earth','Finish every patch in Digging in.',()=>chapterCleared(28)],
  ['molelane','hat-mole','Hello, mole!','Finish every patch in Molehill lane.',()=>chapterCleared(29)],
  ['underlawn','extra-pearls','Buried treasure','Finish every patch in Under the lawn.',()=>chapterCleared(30)],
  ['muddyboots','boots','Muddy but happy','Finish every patch in Muddy boots.',()=>chapterCleared(31)],
  ['molepatrol','extra-earrings','Mole whisperer','Finish every patch in Mole patrol.',()=>chapterCleared(32)],
  ['deeproots','roots','All the way down','Finish every patch in Deep roots.',()=>chapterCleared(33)],
  ['digs','trowel','Little digger','Dig through 25 dirt mounds.',counted(()=>[progress.stats.digs||0,25])],
  ['digsmore','mountain','Earth mover','Dig through 150 dirt mounds.',counted(()=>[progress.stats.digs||0,150])],
  ['bonk','extra-plaster','Bonk!','Get bonked by a mole 10 times. Ouch!',counted(()=>[progress.stats.moleBonks||0,10])],
  ['bridgemaster','bridge','Bridge master','Swing bridges 75 times.',counted(()=>[progress.stats.swings||0,75])],
  ['showery','rain','April showers','Start the rain 100 times.',counted(()=>[progress.stats.rains||0,100])],
  ['molehills','tunnel','Down the rabbit hole','Travel through tunnels 150 times.',counted(()=>[progress.stats.tunnels||0,150])],
  ['uturn','turnshroom','U-turn','Turn around 50 times.',counted(()=>[progress.stats.turns||0,50])],
  ['longhaul','lantern','The long haul','Finish a patch with a par of 45 or more.',c=>c&&c.won&&c.par>=45],
  ['tickles','dizzy','Tickle monster','Tap the worm 15 times in a row during a patch.',counted(()=>[progress.stats.pokeRun||0,15])],
  ['stocked','hintseed','Well stocked','Fill your pouch with 9 hint seeds.',counted(()=>[progress.seeds,SEED_MAX])],
  ['raceday','race','Ready, set, wiggle!','Race a friend for the first time.',counted(()=>[progress.stats.races||0,1])],
  ['racewin','trophy','First past the burrow','Win a race against a friend.',counted(()=>[progress.stats.raceWins||0,1])],
  ['racewins','podium','Speedy wiggler','Win 10 races against friends.',counted(()=>[progress.stats.raceWins||0,10])],
  ['rematch','rematch','Again, again!','Ask for a rematch and race again 5 times.',counted(()=>[progress.stats.rematches||0,5])],
  // Clever crawling: how a patch was played (the per-patch tally is `here` in play/moves.js, win runs in progress.runs)
  ['combo','combo','Combo gardener','Finish a patch using four different tricks on the way, like tunnels, keys, snacks and rain.',c=>c&&c.home&&c.combo>=4],
  ['taxi','taxi','Beetle taxi','Shove a beetle three tiles in one push. Wet leaves help!',counted(()=>[progress.stats.shoveMax||0,3])],
  ['fullcircle','fullcircle','Full circle','Turn around twice in one patch.',()=>here.turns>=2],
  ['rainshine','rainshine','Rain or shine','Switch the weather five times in one patch.',()=>here.rains>=5],
  ['tiptoe','tiptoe','Tiptoe','Finish a patch with moles without bumping into one. Shh!',c=>c&&c.home&&c.moles&&!c.bonks],
  ['tiny','tinyworm','Tiny but mighty','Reach the burrow only two segments long.',c=>c&&c.home&&c.len<=2],
  ['sleepywin','sleepy','Sleepy winner','Finish a patch after your worm had a nap in it.',c=>c&&c.home&&c.napped],
  ['hattrick','hattrick','Hat trick','Finish three patches in a row, each in a different hat.',counted(()=>[((progress.runs||{}).hats||[]).length,3])],
  ['weekend','weekend','Weekend gardener','Finish a patch on the Saturday and the Sunday of one weekend.',c=>c&&c.weekend],
  ['collector','medal','Badge collector','Earn 40 other badges.',counted(()=>[Object.keys(progress.badges).filter(k=>k!=='collector').length,40])]];
// returns the badges earned just now; quiet ones (earned before badges existed) don't celebrate
function checkBadges(ctx,quiet){ const got=[];
  for(const b of BADGES){ if(progress.badges[b[0]]) continue; let ok=false; try{ ok=!!b[4](ctx); }catch(e){} if(ok){ progress.badges[b[0]]=Date.now();
    got.push(b); } }
  if(got.length){ save(); // after a win the win card lists them, so only the jingle plays
    if(!quiet) setTimeout(()=>{ sfx('badge'); if(!(ctx&&ctx.won)) toast(`Badge earned: ${got[0][2].replace(/&[^;]+;/g,'')}${got.length>1?` and ${got.length-1} more`:''}!`,3200); },ctx&&ctx.won?1400:200); }
  return got; }
function bumpStat(k,n=1){ progress.stats[k]=(progress.stats[k]||0)+n; }
// badges screen: a filter, groups of sticker tiles in a fading scroller, and a card for the picked badge
const BADGE_GROUPS=[['Garden journey',['first','par','chapter','clean','sage','stars50','stars150','shiny','chapters','garden','golden','pure','notake','lightning','critters','harvest','tangled','farfields','moonlit','homeward','twirl','vane','showers','orchard','digin','molelane','underlawn','muddyboots','molepatrol','deeproots','longhaul','allstars']],
  ['Daily and meadow',['daily','streak7','month','sunrises','meadow','brave','fearless','unstoppable','legend','stocked']],
  ['Garden helpers',['flags','snacks','appetite','crumbs','gates','tunnels','molehills','rain','showery','bridges','bridgemaster','slides','wheee','hedges','pushes','flowerpower','pollinator','knots','uturn','digs','digsmore','bonk']],
  ['Racing',['raceday','racewin','racewins','rematch']],
  ['Clever crawling',['combo','taxi','fullcircle','rainshine','tiptoe','tiny','sleepywin','hattrick','weekend']],
  ['Just for fun',['moves','marathon','undos','taps','tickles','nap','owl','dawn','quick','photos','dressup','hatrack','rainbow','patterns','fashion','collector']]];
// a badge left out of every group still shows, in the last one
{ const seen=new Set(BADGE_GROUPS.flatMap(g=>g[1])); BADGE_GROUPS[BADGE_GROUPS.length-1][1].push(...BADGES.map(b=>b[0]).filter(id=>!seen.has(id))); }
// earned badges' tiles take turns through the home cards' tints, so a list of them is colourful
const BADGE_TINT=['--tint-berry','--tint-leaf','--tint-honey','--tint-lilac'];
const badgeTint=id=>BADGE_TINT[Math.max(0,BADGES.findIndex(b=>b[0]===id))%BADGE_TINT.length];
let badgeFilter='all', badgeSel=null; // badgeSel: a badge to scroll to when the tab opens
const badgeById=id=>BADGES.find(b=>b[0]===id);
// [have, need] for a counted badge that isn't earned yet and has more than one step, else null
const badgeProg=b=>{ if(progress.badges[b[0]]||!b[4].prog) return null; const [a,n]=b[4].prog(); return n>1?[Math.min(a||0,n),n]:null; };
const pct=([a,n])=>(100*a/n).toFixed(1)+'%';
// the badge to show first: the closest one to earning, else the first not earned, else the first
function nearestBadge(){ let best=null, br=-1;
  for(const b of BADGES){ const p=badgeProg(b); if(p&&p[0]/p[1]>br){ br=p[0]/p[1]; best=b; } }
  return (best||BADGES.find(b=>!progress.badges[b[0]])||BADGES[0])[0]; }
// one card per badge: its medal, name, what earns it and where you stand (earned, a bar with the count, or not yet)
function badgeCard(b){ const t=!!progress.badges[b[0]], p=badgeProg(b);
  return `<div class="b-card ${t?'on':''}" data-b="${b[0]}"><span class="b-medal" style="--tint:var(${badgeTint(b[0])})" aria-hidden="true">${art(b[1],32)}${t?'':`<span class="b-lock">${art('lock',12)}</span>`}</span>`
    +`<span class="bt"><b>${b[2]}</b><small>${b[3]}</small>`
    +(t?`<small class="b-state got">${UI_ICON.check} Earned</small>`:p?`<small class="b-state"><span class="b-bar" style="--p:${pct(p)}"></span>${p[0].toLocaleString()} of ${p[1].toLocaleString()}</small>`:'')
    +`</span></div>`; }
function renderBadges(){ const n=Object.keys(progress.badges).length;
  // the filter only makes sense once a badge is earned
  $('badgeFilter').hidden=!n; if(!n) badgeFilter='all';
  qa($('badgeFilter'),'button').forEach(b=>{ const on=b.dataset.f===badgeFilter; b.classList.toggle('on',on); b.setAttribute('aria-checked',String(on)); });
  const show=b=>badgeFilter==='all'||(badgeFilter==='earned')===!!progress.badges[b[0]];
  // Earned is one list, newest first (progress.badges holds when each was earned); the others keep their groups
  const html=badgeFilter==='earned'?(n?`<section class="b-group" aria-label="Earned"><p class="label">Newest first<span>${n} of ${BADGES.length}</span></p><div class="b-cards">${
      BADGES.filter(b=>progress.badges[b[0]]).sort((a,b)=>(+progress.badges[b[0]]||0)-(+progress.badges[a[0]]||0)).map(badgeCard).join('')}</div></section>`:'')
    :BADGE_GROUPS.map(([title,ids])=>{ const list=ids.map(badgeById).filter(show); if(!list.length) return '';
    const got=ids.filter(id=>progress.badges[id]).length;
    return `<section class="b-group" aria-label="${title}"><p class="label">${title}<span>${got} of ${ids.length}</span></p><div class="b-cards">${list.map(badgeCard).join('')}</div></section>`; }).join('');
  const g=$('badgeGrid'); g.innerHTML=html||`<p class="b-empty">${badgeFilter==='earned'?'No badges yet. Finish a patch to earn your first one.':'You found every badge. What a garden!'}</p>`;
  // arriving for one badge (the home card): bring its card into view and give it a little pop
  if(badgeSel){ const el=g.querySelector(`[data-b="${badgeSel}"]`); badgeSel=null;
    if(el) requestAnimationFrame(()=>{ g.scrollTop=Math.max(0,el.offsetTop-g.offsetTop-g.clientHeight/2+el.offsetHeight/2); settle(el); }); } }
qa($('badgeFilter'),'button').forEach(b=>b.onclick=()=>{ if(badgeFilter===b.dataset.f) return; badgeFilter=b.dataset.f; renderBadges(); $('badgeGrid').scrollTop=0; settle(b);
  stagger(qa($('badgeGrid'),'.b-card'),'rise',0,25,12); });

