// ---------- worm colours and patterns ----------
// worm colours, earned with garden stars: [name, body, head, stars needed, cheek blush].
// Head and body share a hex: the head's toon sphere and the body's vertex colours render the same
// colour under the same light, so any difference shows as a seam at the neck.
const WORM_COLS=[['Blossom',0xFFB3C8,0xFFB3C8,0,0xEF6A8F],['Mint',0x7FD9B0,0x7FD9B0,15,0xFF6B99],['Butter',0xFFE58F,0xFFE58F,45,0xFF827C],['Lavender',0xCDB8F5,0xCDB8F5,90,0xF979A6],['Sky',0xA9D8F5,0xA9D8F5,150,0xFF6B91],
  ['Peach',0xFFC29A,0xFFC29A,210,0xF87569],['Teal',0x74CCD2,0x74CCD2,270,0xFF718B],['Cocoa',0xD6AE8C,0xD6AE8C,330,0xD66161],['Twilight',0xA4A6E4,0xA4A6E4,400,0xFD75AE],['Golden',0xF7BE4F,0xF7BE4F,480,0xFB776D],['Moonlight',0xD7DDF0,0xD7DDF0,520,0xF27FA8],['Sprout',0xBCE38A,0xBCE38A,600,0xFF7F8F],['Sage',0xB4CBB0,0xB4CBB0,640,0xF27E93],['Dusk',0xE2B4CF,0xE2B4CF,700,0xEF6A8F],['Seafoam',0x9EDFD0,0x9EDFD0,760,0xF2708E],['Orchid',0xDE9BE6,0xDE9BE6,900,0xF0679C],['Moonbeam',0xBFC8F2,0xBFC8F2,1100,0xF3779F]];
const starTotal=()=>LEVELS.reduce((a,l)=>a+(progress.stars[l.name]||0),0);
const coloursUnlocked=()=>WORM_COLS.filter(c=>starTotal()>=c[3]).length;
let wormCol=Math.max(0,Math.min(WORM_COLS.length-1,parseInt(store.get('squirm-colour')||'0',10)||0));
// worm patterns, earned with milestones: [id, name, how to earn, test]. Drawn by colorAt and tubeMat's shader
const PATTERNS=[['plain','Plain','',()=>true],
  ['stripes','Stripes','Earn 5 badges',counted(()=>[Object.keys(progress.badges).length,5])],
  ['spots','Spots','3 day daily streak',counted(()=>[progress.daily.best,3])],
  ['fade','Soft fade','Clear 5 meadow patches',counted(()=>[['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0),5])],
  ['rainbow','Rainbow tail','Finish 8 chapters',counted(()=>[CHAPTERS.filter((ch,k)=>chapterCleared(k)).length,8])],
  ['bands','Bands','Crawl 2,000 moves',counted(()=>[(progress.stats.moves||0),2000])],
  ['sunset','Sunset','Finish 10 chapters',counted(()=>[CHAPTERS.filter((ch,k)=>chapterCleared(k)).length,10])],
  ['glitter','Glitter','Earn 25 badges',counted(()=>[Object.keys(progress.badges).length,25])],
  ['muddy','Muddy tail','Dig through 75 dirt mounds',counted(()=>[(progress.stats.digs||0),75])],
  ['twotone','Two-tone','Finish a patch after turning around 3 times in it',counted(()=>[(progress.stats.twistyWins||0),1])],
  ['candy','Candy stripe','Finish Secret passages',byChapter(37)],
  // these move (tubeMat's shader, uT)
  ['shimmer','Shimmer','3 stars on 100 patches',counted(()=>[LEVELS.filter(l=>progress.stars[l.name]===3).length,100])],
  ['glow','Glow worm','Finish 15 patches in the evening, 7 to 10 pm',counted(()=>[(progress.stats.evenings||0),15])],
  ['prism','Prism','Finish 30 daily patches',counted(()=>[(progress.stats.dailies||0),30])],
  ['starry','Starry','Finish 20 patches after dark',counted(()=>[(progress.stats.nightWins||0),20])]];
// what finishing chapter k earns, for the garden map: its hat, else an extra or pattern marked with byChapter(k); null if nothing
function chapterReward(k){ const h=HATS.find(x=>x[2]===k); if(h) return {name:h[1],art:s=>hatArt(h[0],s)};
  const e=EXTRAS.find(x=>x[3].chapter===k); if(e) return {name:e[1],art:s=>extraArt(e[0],s)};
  const p=PATTERNS.find(x=>x[3].chapter===k); return p?{name:p[1],art:s=>patArt(p[0],s)}:null; }
const patternsUnlocked=()=>PATTERNS.filter(p=>p[3]()).map(p=>p[0]);
let wormPat=store.get('squirm-pattern')||'plain';
const patOn=()=>PATTERNS.some(p=>p[0]===wormPat&&p[3]())?wormPat:'plain';
function applyWormColour(){ curPat=patOn(); patU.value=PAT_ID[curPat]||0; if(wormCol>=coloursUnlocked()) wormCol=0; const c=WORM_COLS[wormCol];
  COL_A.setHex(c[1]); m('head').color.setHex(c[2]); cheekMat.color.setHex(c[4]); buildHomeBody(); }
