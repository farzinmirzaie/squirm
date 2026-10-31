// ---------- worm colours and patterns ----------
// worm colours, earned with garden stars: [name, body, head, stars needed, cheek blush].
// Head and body share a hex: the head's toon sphere and the body's vertex colours render the same
// colour under the same light, so any difference shows as a seam at the neck.
const WORM_COLS=[['Blossom',0xFFB3C8,0xFFB3C8,0,0xEF6A8F],['Mint',0x7FD9B0,0x7FD9B0,15,0xFF6B99],['Butter',0xFFE58F,0xFFE58F,45,0xFF827C],['Lavender',0xCDB8F5,0xCDB8F5,90,0xF979A6],['Sky',0xA9D8F5,0xA9D8F5,150,0xFF6B91],
  ['Peach',0xFFC29A,0xFFC29A,210,0xF87569],['Teal',0x74CCD2,0x74CCD2,270,0xFF718B],['Cocoa',0xD6AE8C,0xD6AE8C,330,0xD66161],['Twilight',0xA4A6E4,0xA4A6E4,400,0xFD75AE],['Golden',0xF7BE4F,0xF7BE4F,480,0xFB776D],['Moonlight',0xD7DDF0,0xD7DDF0,520,0xF27FA8],['Sprout',0xBCE38A,0xBCE38A,600,0xFF7F8F],['Sage',0xB4CBB0,0xB4CBB0,640,0xF27E93]];
const starTotal=()=>LEVELS.reduce((a,l)=>a+(progress.stars[l.name]||0),0);
const coloursUnlocked=()=>WORM_COLS.filter(c=>starTotal()>=c[3]).length;
let wormCol=Math.max(0,Math.min(WORM_COLS.length-1,parseInt(store.get('squirm-colour')||'0',10)||0));
// worm patterns, earned with milestones: [id, name, how to earn, test]. Drawn by colorAt and tubeMat's shader
const PATTERNS=[['plain','Plain','',()=>true],
  ['stripes','Stripes','Earn 5 badges',()=>Object.keys(progress.badges).length>=5],
  ['spots','Spots','3 day daily streak',()=>progress.daily.best>=3],
  ['fade','Soft fade','Clear 5 meadow patches',()=>['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0)>=5],
  ['rainbow','Rainbow tail','Finish 8 chapters',()=>CHAPTERS.filter((ch,k)=>chapterCleared(k)).length>=8],
  ['bands','Bands','Crawl 2,000 moves',()=>(progress.stats.moves||0)>=2000],
  ['sunset','Sunset','Finish 10 chapters',()=>CHAPTERS.filter((ch,k)=>chapterCleared(k)).length>=10],
  ['glitter','Glitter','Earn 25 badges',()=>Object.keys(progress.badges).length>=25]];
const patternsUnlocked=()=>PATTERNS.filter(p=>p[3]()).map(p=>p[0]);
let wormPat=store.get('squirm-pattern')||'plain';
const patOn=()=>PATTERNS.some(p=>p[0]===wormPat&&p[3]())?wormPat:'plain';
function applyWormColour(){ curPat=patOn(); patU.value=PAT_ID[curPat]||0; if(wormCol>=coloursUnlocked()) wormCol=0; const c=WORM_COLS[wormCol];
  COL_A.setHex(c[1]); m('head').color.setHex(c[2]); cheekMat.color.setHex(c[4]); buildHomeBody(); }
