// ---------- what's new ----------
// newest first: [version, date, title, lines]. The top version must equal package.json's (a unit test checks).
// Bump the version for every release players will notice (semver: minor for new things, patch for fixes) and
// add an entry on top. Returning players see the newest entry once as a card on the Play tab, new players never
// do (squirm-news holds the last version seen); Settings > About lists them all.
const NEWS=[
  ['1.12.2','2026-10-31','Lighter on your phone',['Long play sessions stay smooth: the garden now tidies up after every snack, gate, sparkle and new patch.']],
  ['1.12.1','2026-10-31','A tidier wardrobe',['The bird\'s nest is properly woven now, and its eggs sit snug inside.','The sweatband hugs the head all the way round, the pirate patch covers its eye, and the daisy chain shows under the chin.','The ladybug friend is a little bigger.']],
  ['1.12.0','2026-10-31','Pick a colour',['Many hats and extras now come in five colours: wear one and pick its colour in the wardrobe.','Four new hats: a little sprout, a teacup, a bird\'s nest and a little rain cloud.','Four new extras: a pirate patch, a ladybug friend, a sweatband and a daisy chain.','Each one unlocks in its own playful way. Take a peek in the wardrobe!']],
  ['1.11.0','2026-10-31','Far fields',['A new chapter, Far fields: ten big, wide patches, and the toughest one yet at the end.','An explorer\'s hat, a spotted bandana, a Sage colour and a new badge to earn.','A tidier top bar: just what you need to finish the patch.','A smarter fancy mustache, and the worm looks right when it pops out of a tunnel and straight back in.']],
  ['1.10.0','2026-10-31','Pollen and soft soil',['Two new things in the garden: flowers dust you in pollen that opens petal gates of the same colour, and soft soil lets you burrow under yourself.','Three new chapters: Pollen paths, Soft soil and Tangled roots.','New hats (a petal bonnet, a miner\'s helmet and a gnome hat), digging goggles, a Sprout colour and three new badges.','Pick pollen and soft soil for your meadow patches too.']],
  ['1.9.0','2026-10-28','Two new chapters',['Chapters 17 and 18, Critter crossing and Harvest moon: 20 of the toughest patches yet.','Two new hats to earn: a snail shell and a pumpkin.','A Moonlight worm colour, a butterfly friend for growing the whole garden, and two new badges.']],
  ['1.8.0','2026-10-28','Handier buttons',['Snap a photo of your garden any time, from the new Photo button.','Hold Undo to start a patch over.','The win card has a Home button now.']],
  ['1.7.0','2026-10-27','Wardrobe polish',['Five more extras: freckles, a button nose, a flower clip, a bow tie and a cozy scarf.','Hats, extras, colours and patterns all got a careful polish.','Your worm chats a little less while you play.']],
  ['1.6.0','2026-10-26','A chattier worm',['A brighter win card that shows everything you earned.','Your worm says a word or two while you play, and gives hints itself.','New things in a patch get their own illustrated card.']],
  ['1.5.0','2026-10-25','New in the garden',['Worm patterns, new hats and colours, plus glasses, shades and mustaches to wear.','A new badges book, with your progress on every badge, and 16 new badges.','Snap a photo of your garden after you finish a patch, from any angle you like.','Fresh looks for the home screen, garden map, meadow, wardrobe and settings, with a battery saver option.']],
  ['1.4.0','2026-10-24','Beetle bumps',['Chapter 16: push beetles around, even onto flower buttons.','A new hat to earn: the beetle horn.']],
  ['1.3.0','2026-10-24','A bigger garden',['Two new chapters, Garden party and Grand bloom.','A finale for when the whole garden is grown.']],
  ['1.2.0','2026-10-21','The garden map',['Patches are stepping stones on a winding garden map.','A ladybug and a little bird visit the garden.','Your worm stretches, wiggles and watches butterflies while you think.']],
  ['1.1.0','2026-10-20','Badges and music',['Badges to earn and hats to wear.','Gentle music that follows the time of day.','A daily patch reminder, where your phone allows it.']]];
const newsDate=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
function renderNews(){ const seen=store.get('squirm-news'), n=NEWS[0], returning=LEVELS.some((l,i)=>isCleared(i))||Object.keys(progress.daily.results).length>0;
  if(!returning&&seen!==n[0]){ store.set('squirm-news',n[0]); }
  const show=returning&&seen!==n[0]; $('newsCard').hidden=!show;
  if(show){ $('newsTitle').textContent=n[2]; $('newsList').innerHTML=n[3].map(x=>`<li>${x}</li>`).join(''); }
  $('newsLog').innerHTML=NEWS.map(e=>`<div><b>${e[2]} <small>v${e[0]} · ${newsDate(e[1])}</small></b><ul>${e[3].map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join(''); }
$('newsClose').onclick=()=>{ store.set('squirm-news',NEWS[0][0]); $('newsCard').hidden=true; };

