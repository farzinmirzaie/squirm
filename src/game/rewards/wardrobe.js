// hats, earned by finishing chapters: [id, name, chapter index that unlocks it]. Each is built once and cloned.
const HATS=[['none','No hat',-1],['crown','Flower crown',0],['mush','Mushroom cap',1],['straw','Straw hat',2],['tophat','Top hat',3],['leaf','Leaf cap',4],['rainhat','Rain hat',5],
  ['acorn','Acorn cap',6],['bee','Bee antennae',7],['party','Party hat',8],['brolly','Tiny umbrella',9],['beret','Dewdrop beret',10],['bow','Ribbon bow',11],['gold','Garden crown',12],['beanie','Pompom beanie',13],['sunflower','Sunflower',14],['horn','Beetle horn',15],['shell','Snail shell',16],['pumpkin','Pumpkin hat',17],['bonnet','Petal bonnet',18],['miner','Miner\'s helmet',19],['gnome','Gnome hat',20],['explorer','Explorer\'s hat',21],
  ['sprout','Little sprout',-2,'Let the worm doze off 10 times',()=>(progress.stats.naps||0)>=10],
  ['teacup','Teacup',-2,'Finish a patch at tea time, 3 to 5 pm',()=>(progress.stats.teatime||0)>=1],
  ['nest','Bird\'s nest',-2,'Visit the garden on 7 different days',()=>(progress.stats.days||0)>=7],
  ['cloud','Little cloud',-2,'Start the rain 30 times',()=>(progress.stats.rains||0)>=30],
  ['chef','Chef hat',-2,'Eat 100 snacks',()=>(progress.stats.fruit||0)>=100],
  ['wizard','Wizard hat',-2,'30 patches, no hints',()=>Object.keys(progress.clean).length>=30],
  ['cowboy','Cowboy hat',-2,'Clear 15 meadow patches',()=>['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0)>=15],
  ['phones','Headphones',-2,'Finish 10 daily patches',()=>(progress.stats.dailies||0)>=10]];
const hatArt=(id,size=36)=>tintArt(id,art('hat-'+id,size));
// extras: things for the face, earned with milestones: [id, name, how to earn, test]. Built once and cloned, like hats.
const EXTRAS=[['none','Nothing','',()=>true],
  ['glasses','Round glasses','Earn 10 badges',()=>Object.keys(progress.badges).length>=10],
  ['tash','Fancy mustache','Say hi 50 times',()=>(progress.stats.taps||0)>=50],
  ['walrus','Bushy mustache','Crawl 5,000 moves',()=>(progress.stats.moves||0)>=5000],
  ['freckles','Freckles','Eat 50 snacks',()=>(progress.stats.fruit||0)>=50],
  ['nose','Button nose','Snap 3 photos',()=>(progress.stats.photos||0)>=3],
  ['flower','Flower clip','Finish 5 chapters',()=>CHAPTERS.filter((ch,k)=>chapterCleared(k)).length>=5],
  ['bowtie','Bow tie','3 stars on 20 patches',()=>LEVELS.filter(l=>progress.stars[l.name]===3).length>=20],
  ['scarf','Cozy scarf','Finish 20 daily patches',()=>(progress.stats.dailies||0)>=20],
  ['shades','Sunglasses','Clear 10 meadow patches',()=>['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0)>=10],
  ['hearts','Heart glasses','Collect 200 stars',()=>starTotal()>=200],
  ['monocle','Monocle','50 patches, no hints',()=>Object.keys(progress.clean).length>=50],
  ['stars','Star shades','3 stars on 60 patches',()=>LEVELS.filter(l=>progress.stars[l.name]===3).length>=60],
  ['butterfly','Butterfly friend','Finish every garden patch',()=>allCleared()],
  ['goggles','Digging goggles','Burrow under yourself 30 times',()=>(progress.stats.burrows||0)>=30],
  ['bandana','Explorer\'s bandana','Finish 200 patches',()=>LEVELS.filter((l,i)=>isCleared(i)).length>=200],
  ['eyepatch','Pirate patch','Start a patch over 15 times',()=>(progress.stats.restarts||0)>=15],
  ['ladybug','Ladybug friend','Change your outfit 40 times',()=>(progress.stats.outfits||0)>=40],
  ['sweatband','Sweatband','Crawl 20,000 moves',()=>(progress.stats.moves||0)>=20000],
  ['daisies','Daisy chain','Wear all three pollens in one patch',()=>(progress.stats.allPollen||0)>=1]];
let extraId=store.get('squirm-extra')||'none';
const extraOn=()=>{ const e=EXTRAS.find(x=>x[0]===extraId); return e&&e[3]()?extraId:'none'; };
const extraArt=(id,size=36)=>tintArt(id,art(id==='none'?'hat-none':'extra-'+id,size));
// colour options for some hats and extras: each option swaps the item's own materials (keys, by index) and recolours
// its sticker (art: the sticker's hexes for those keys). Option 0 is the item's own look. Items without an entry
// (sunglasses, the monocle, ...) have no colour picker. Chosen options live in squirm-tints, by item id.
const TINT_SET={red:[['Poppy',0xE4574C],['Bluebell',0x5B8FD9],['Fern',0x5FAE6A],['Plum',0x9A72D6],['Marigold',0xF2B83A]],
  pastel:[['Sky',0x9FD2F2],['Blossom',0xF7A8C4],['Butter',0xFFE08A],['Mint',0x9FE0BE],['Lilac',0xCDB8F5]]};
const TINTS={
  bow:{keys:['bowDark','bowKnot'],art:['#E36A8C','#C24E72'],opts:[['Berry',0xE36A8C,0xC24E72],['Sky',0x7FBFEA,0x4F95C8],['Mint',0x7FD3A8,0x4FAE80],['Butter',0xF5C84E,0xD9A22A],['Lilac',0xB79CF2,0x8E72D6]]},
  beanie:{keys:['beanie','beanieRib'],art:['#8FD0B0','#6FB894'],opts:[['Mint',0x8FD0B0,0x6FB894],['Berry',0xF2A0B8,0xE07A98],['Sky',0x9FCBF0,0x7AAEDC],['Butter',0xF7D57A,0xE8BC4E],['Lilac',0xC7B2F2,0xA890E0]]},
  party:{keys:['partyA'],art:['#9FD2F2'],opts:TINT_SET.pastel.map(([n,c])=>[n,c])},
  brolly:{keys:['brolly'],art:['#9FD2F2'],opts:TINT_SET.pastel.map(([n,c])=>[n,c])},
  beret:{keys:['beret'],art:['#B79CF2'],opts:[['Lilac',0xB79CF2],['Berry',0xE36A8C],['Navy',0x5B6FB8],['Mint',0x7FD3A8],['Coral',0xF07A6A]]},
  rainhat:{keys:['rainHat'],art:['#FFD04A'],opts:[['Sunny',0xFFD04A],['Coral',0xF07A6A],['Sky',0x7FBFEA],['Mint',0x7FD3A8],['Lilac',0xB79CF2]]},
  mush:{keys:['mushRed'],art:['#F07A6A'],opts:[['Toadstool',0xF07A6A],['Lilac',0xB79CF2],['Butter',0xF5C84E],['Sky',0x7FBFEA],['Mint',0x7FD3A8]]},
  gnome:{keys:['gnome'],art:['#E4574C'],opts:TINT_SET.red},
  teacup:{keys:['teacup','teacupDot'],art:['#9FD2F2','#FFFBF2'],opts:[['Sky',0x9FD2F2,0xFFFBF2],['Rose',0xF7A8C4,0xFFFBF2],['Butter',0xFFE08A,0xF27DA2],['Mint',0x9FE0BE,0xFFFBF2],['Lilac',0xCDB8F5,0xFFE08A]]},
  scarf:{keys:['mushRed','partyB'],art:['#F07A6A','#FFF1A8'],opts:[['Coral',0xF07A6A,0xFFF1A8],['Sky',0x7FBFEA,0xFFFBF2],['Mint',0x7FD3A8,0xFFF1A8],['Berry',0xE36A8C,0xFFE3EC],['Lilac',0xB79CF2,0xFFF1A8]]},
  bowtie:{keys:['bowDark','heartFrame'],art:['#E36A8C','#F27DA2'],opts:[['Berry',0xE36A8C,0xF27DA2],['Navy',0x4E5E9E,0x6F80C2],['Fern',0x4FAE80,0x7FD3A8],['Marigold',0xD9A22A,0xF5C84E],['Plum',0x8E72D6,0xB79CF2]]},
  bandana:{keys:['bandana'],art:['#E4574C'],opts:TINT_SET.red},
  flower:{keys:['chef'],art:['#FFFBF2'],opts:[['Daisy',0xFFFBF2],['Blossom',0xF7A8C4],['Butter',0xFFE08A],['Lilac',0xCDB8F5],['Sky',0x9FD2F2]]},
  sweatband:{keys:['sweat','sweatStripe'],art:['#FFFBF2','#F27DA2'],opts:[['Classic',0xFFFBF2,0xF27DA2],['Sky',0x9FD2F2,0xFFFBF2],['Lime',0xC9E77E,0x4FAE80],['Sunny',0xFFD04A,0xE4574C],['Berry',0xE36A8C,0xFFFBF2]]}};
let tints=store.json('squirm-tints')||{};
const tintOf=id=>{ const t=TINTS[id]; return t?Math.min(t.opts.length-1,Math.max(0,tints[id]|0)):0; };
const hexStr=n=>'#'+n.toString(16).padStart(6,'0').toUpperCase();
function tintArt(id,svg){ const t=TINTS[id], k=tintOf(id); if(!t||!k) return svg; t.art.forEach((h,i)=>{ if(t.opts[k][i+1]!=null) svg=svg.split(h).join(hexStr(t.opts[k][i+1])); }); return svg; }
// swaps the tinted materials in a freshly built hat or extra
function tinted(id,proto){ const t=TINTS[id], k=tintOf(id); if(!t||!k) return proto;
  const map=new Map(t.keys.map((key,i)=>[m(key),MC['tint'+t.opts[k][i+1]]||(MC['tint'+t.opts[k][i+1]]=toon(t.opts[k][i+1]))]).filter((e,i)=>t.opts[k][i+1]!=null));
  proto.traverse(o=>{ if(o.material&&map.has(o.material)) o.material=map.get(o.material); }); return proto; }
