// ---------- the wardrobe: hats, extras and their colour options ----------
// hats, earned by finishing chapters: [id, name, chapter index that unlocks it]. Each is built once and cloned.
const HATS=[['none','No hat',-1],['crown','Flower crown',0],['mush','Mushroom cap',1],['straw','Straw hat',2],['tophat','Top hat',3],['leaf','Leaf cap',4],['rainhat','Rain hat',5],
  ['acorn','Acorn cap',6],['bee','Bee antennae',7],['party','Party hat',8],['brolly','Tiny umbrella',9],['beret','Dewdrop beret',10],['bow','Ribbon bow',11],['gold','Garden crown',12],['beanie','Pompom beanie',13],['sunflower','Sunflower',14],['horn','Beetle horn',15],['shell','Snail shell',16],['pumpkin','Pumpkin hat',17],['bonnet','Petal bonnet',18],['miner','Miner\'s helmet',19],['gnome','Gnome hat',20],['explorer','Explorer\'s hat',21],['owl','Owl friend',22],['nightcap','Sleepy nightcap',23],['twirl','Twirl-cap',24],['vane','Weathervane',25],['boat','Paper boat',26],['apple','Apple cap',27],['flowerpot','Flowerpot',28],['mole','Mole friend',29],['propeller','Propeller cap',33],['frog','Frog hood',34],['pirate','Pirate hat',36],['can','Watering can',38],
  ['sprout','Little sprout',-2,'Let the worm doze off 10 times',counted(()=>[(progress.stats.naps||0),10])],
  ['teacup','Teacup',-2,'Finish a patch at tea time, 3 to 5 pm',counted(()=>[(progress.stats.teatime||0),1])],
  ['nest','Bird\'s nest',-2,'Visit the garden on 7 different days',counted(()=>[(progress.stats.days||0),7])],
  ['cloud','Little cloud',-2,'Start the rain 30 times',counted(()=>[(progress.stats.rains||0),30])],
  ['chef','Chef hat',-2,'Eat 100 snacks',counted(()=>[(progress.stats.fruit||0),100])],
  ['wizard','Wizard hat',-2,'30 patches, no hints',counted(()=>[Object.keys(progress.clean).length,30])],
  ['cowboy','Cowboy hat',-2,'Clear 15 meadow patches',counted(()=>[['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0),15])],
  ['phones','Headphones',-2,'Finish 10 daily patches',counted(()=>[(progress.stats.dailies||0),10])],
  ['idea','Bright idea',-2,'Grow 30 hint seeds',counted(()=>[(progress.stats.seedsGot||0),30])],
  ['racer','Racing helmet',-2,'Win 3 races against a friend',counted(()=>[(progress.stats.raceWins||0),3])],
  // tods: a bit for each time of day a patch was won in (1 morning, 2 afternoon, 4 evening, 8 night)
  ['bucket','Bucket hat',-2,'Finish a patch in the morning, the afternoon, the evening and at night',counted(()=>[[1,2,4,8].filter(b=>(progress.stats.tods||0)&b).length,4])]];
const hatArt=(id,size=36)=>tintArt(id,art('hat-'+id,size));
// extras: things for the face, earned with milestones: [id, name, how to earn, test]. Built once and cloned, like hats.
const EXTRAS=[['none','Nothing','',()=>true],
  ['glasses','Round glasses','Earn 10 badges',counted(()=>[Object.keys(progress.badges).length,10])],
  ['tash','Fancy mustache','Say hi 50 times',counted(()=>[(progress.stats.taps||0),50])],
  ['walrus','Bushy mustache','Crawl 5,000 moves',counted(()=>[(progress.stats.moves||0),5000])],
  ['freckles','Freckles','Eat 50 snacks',counted(()=>[(progress.stats.fruit||0),50])],
  ['nose','Button nose','Snap 3 photos',counted(()=>[(progress.stats.photos||0),3])],
  ['flower','Flower clip','Finish 5 chapters',counted(()=>[CHAPTERS.filter((ch,k)=>chapterCleared(k)).length,5])],
  ['bowtie','Bow tie','3 stars on 20 patches',counted(()=>[LEVELS.filter(l=>progress.stars[l.name]===3).length,20])],
  ['scarf','Cozy scarf','Finish 20 daily patches',counted(()=>[(progress.stats.dailies||0),20])],
  ['shades','Sunglasses','Clear 10 meadow patches',counted(()=>[['easy','medium','hard'].reduce((a,d)=>a+progress.endless[d].cleared,0),10])],
  ['hearts','Heart glasses','Collect 200 stars',counted(()=>[starTotal(),200])],
  ['monocle','Monocle','50 patches, no hints',counted(()=>[Object.keys(progress.clean).length,50])],
  ['stars','Star shades','3 stars on 60 patches',counted(()=>[LEVELS.filter(l=>progress.stars[l.name]===3).length,60])],
  ['butterfly','Butterfly friend','Finish every garden patch',()=>allCleared()],
  ['goggles','Digging goggles','Burrow under yourself 30 times',counted(()=>[(progress.stats.burrows||0),30])],
  ['bandana','Explorer\'s bandana','Finish 200 patches',counted(()=>[LEVELS.filter((l,i)=>isCleared(i)).length,200])],
  ['eyepatch','Pirate patch','Start a patch over 15 times',counted(()=>[(progress.stats.restarts||0),15])],
  ['ladybug','Ladybug friend','Change your outfit 40 times',counted(()=>[(progress.stats.outfits||0),40])],
  ['sweatband','Sweatband','Crawl 20,000 moves',counted(()=>[(progress.stats.moves||0),20000])],
  ['daisies','Daisy chain','Wear all three pollens in one patch',counted(()=>[(progress.stats.allPollen||0),1])],
  ['firefly','Firefly friend','Finish 5 patches in the evening, 7 to 10 pm',counted(()=>[(progress.stats.evenings||0),5])],
  ['pinwheel','Pinwheel friend','Turn around 25 times',counted(()=>[(progress.stats.turns||0),25])],
  ['medal','Finisher\'s medal','Race a friend 10 times',counted(()=>[(progress.stats.races||0),10])],
  ['key','Key necklace','Open 50 gates',counted(()=>[(progress.stats.gates||0),50])],
  ['pearls','Pearl necklace','Finish Under the lawn',byChapter(30)],
  ['bubble','Bubble gum','Finish Muddy boots',byChapter(31)],
  ['earrings','Star earrings','Finish Mole patrol',byChapter(32)],
  ['plaster','Sticking plaster','Get bonked by a mole 30 times',counted(()=>[(progress.stats.moleBonks||0),30])],
  ['beebuddy','Bee buddy','Finish Busy bees',byChapter(35)],
  ['snorkel','Snorkel','Finish 10 patches while it\'s raining',counted(()=>[(progress.stats.rainyWins||0),10])],
  ['blower','Party blower','Get 3 stars on 3 patches in a row',counted(()=>[(progress.stats.starRun||0),3])]];
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
  twirl:{keys:['turnCap'],art:['#6FCFC0'],opts:[['Mint',0x6FCFC0],['Berry',0xE36A8C],['Sky',0x7FBFEA],['Butter',0xF5C84E],['Lilac',0xB79CF2]]},
  nightcap:{keys:['nightcap'],art:['#8FA6E8'],opts:[['Periwinkle',0x8FA6E8],['Berry',0xE36A8C],['Mint',0x7FD3A8],['Butter',0xF5C84E],['Lilac',0xB79CF2]]},
  teacup:{keys:['teacup','teacupDot'],art:['#9FD2F2','#FFFBF2'],opts:[['Sky',0x9FD2F2,0xFFFBF2],['Rose',0xF7A8C4,0xFFFBF2],['Butter',0xFFE08A,0xF27DA2],['Mint',0x9FE0BE,0xFFFBF2],['Lilac',0xCDB8F5,0xFFE08A]]},
  scarf:{keys:['mushRed','partyB'],art:['#F07A6A','#FFF1A8'],opts:[['Coral',0xF07A6A,0xFFF1A8],['Sky',0x7FBFEA,0xFFFBF2],['Mint',0x7FD3A8,0xFFF1A8],['Berry',0xE36A8C,0xFFE3EC],['Lilac',0xB79CF2,0xFFF1A8]]},
  bowtie:{keys:['bowDark','heartFrame'],art:['#E36A8C','#F27DA2'],opts:[['Berry',0xE36A8C,0xF27DA2],['Navy',0x4E5E9E,0x6F80C2],['Fern',0x4FAE80,0x7FD3A8],['Marigold',0xD9A22A,0xF5C84E],['Plum',0x8E72D6,0xB79CF2]]},
  bandana:{keys:['bandana'],art:['#E4574C'],opts:TINT_SET.red},
  flower:{keys:['chef'],art:['#FFFBF2'],opts:[['Daisy',0xFFFBF2],['Blossom',0xF7A8C4],['Butter',0xFFE08A],['Lilac',0xCDB8F5],['Sky',0x9FD2F2]]},
  racer:{keys:['racer'],art:['#F26B5E'],opts:[['Cherry',0xF26B5E],['Sky',0x7FBFEA],['Mint',0x7FD3A8],['Butter',0xF5C84E],['Lilac',0xB79CF2]]},
  medal:{keys:['ribbon','ribbonStripe'],art:['#7FBFEA','#FFFBF2'],opts:[['Sky',0x7FBFEA,0xFFFBF2],['Berry',0xE36A8C,0xFFE3EC],['Mint',0x7FD3A8,0xFFF1A8],['Lilac',0xB79CF2,0xFFFBF2],['Coral',0xF07A6A,0xFFF1A8]]},
  boat:{keys:['boat','boatIn'],art:['#FFFBF2','#E3DCCF'],opts:[['Paper',0xFFFBF2,0xE3DCCF],['Sky',0x9FD2F2,0x7FB8E0],['Blossom',0xF7A8C4,0xE38AAA],['Butter',0xFFE08A,0xF2C85E],['Mint',0x9FE0BE,0x7FC9A2]]},
  apple:{keys:['apple'],art:['#F0685A'],opts:[['Red',0xF0685A],['Green',0x9BD66A],['Golden',0xF5C84E],['Pink',0xF7A0B8],['Russet',0xC98E52]]},
  key:{keys:['cord'],art:['#D99A5C'],opts:[['Twine',0xD99A5C],['Berry',0xE36A8C],['Sky',0x7FBFEA],['Mint',0x7FD3A8],['Lilac',0xB79CF2]]},
  flowerpot:{keys:['flowerpot','flowerpotRim'],art:['#E08A5E','#C96F45'],opts:[['Terracotta',0xE08A5E,0xC96F45],['Sky',0x9FCBF0,0x7AAEDC],['Mint',0x8FD0B0,0x6FB894],['Butter',0xF7D57A,0xE3B648],['Blossom',0xF7A8C4,0xE087A8]]},
  propeller:{keys:['propA','propB'],art:['#F26B5E','#FFD04A'],opts:[['Classic',0xF26B5E,0xFFD04A],['Sky',0x7FBFEA,0xFFFBF2],['Mint',0x7FD3A8,0xF7A8C4],['Berry',0xE36A8C,0x9FD2F2],['Lilac',0xB79CF2,0xFFE08A]]},
  pearls:{keys:['pearl'],art:['#FBF3EA'],opts:[['Pearl',0xFBF3EA],['Blush',0xF9C9D6],['Golden',0xF5D58A],['Sky',0xBFE0F7],['Lilac',0xD9C8F7]]},
  bubble:{keys:['gum'],art:['#F7A0C4'],opts:[['Bubblegum',0xF7A0C4],['Sky',0x9FD2F2],['Mint',0x9FE0BE],['Butter',0xFFE08A],['Lilac',0xCDB8F5]]},
  earrings:{keys:['earStar'],art:['#F5C14E'],opts:[['Gold',0xF5C14E],['Silver',0xD7DDF0],['Rose',0xF7A8C4],['Sky',0x9FD2F2],['Mint',0x9FE0BE]]},
  plaster:{keys:['plaster','plasterPad'],art:['#F2C9A0','#FFF1DE'],opts:[['Classic',0xF2C9A0,0xFFF1DE],['Blossom',0xF7A8C4,0xFFE3EC],['Sky',0x9FD2F2,0xFFFBF2],['Mint',0x9FE0BE,0xFFFBF2],['Dino',0xC9E77E,0xFFF1A8]]},
  frog:{keys:['frog','frogLight','frogSpot'],art:['#8DD16E','#D3F0A8','#6DB352'],opts:[['Frog',0x8DD16E,0xD3F0A8,0x6DB352],['Tree frog',0x6FCFA0,0xFFE08A,0x4FAE80],['Sky',0x8FC2EE,0xDDF0FF,0x6A9FD6],['Blossom',0xF5A3C0,0xFFE3EC,0xE07A9E],['Butter',0xF5D063,0xFFF4C8,0xD9A932]]},
  pirate:{keys:['pirate'],art:['#463D5C'],opts:[['Midnight',0x463D5C],['Navy',0x3E5491],['Berry',0xB8466A],['Fern',0x3F7F5F],['Cocoa',0x6B4A35]]},
  can:{keys:['canTin','canDark'],art:['#B5CBE0','#8FAAC6'],opts:[['Tin',0xB5CBE0,0x8FAAC6],['Mint',0x9FE0BE,0x6FBF98],['Blossom',0xF7A8C4,0xE087A8],['Butter',0xFFE08A,0xE8BC4E],['Lilac',0xCDB8F5,0xA890E0]]},
  bucket:{keys:['bucket','bucketBand'],art:['#BFD9A6','#6FAE6A'],opts:[['Sage',0xBFD9A6,0x6FAE6A],['Sky',0x9FCBF0,0x5B8FD9],['Blossom',0xF7A8C4,0xE36A8C],['Butter',0xFFE08A,0xE8A93A],['Lilac',0xCDB8F5,0x8E72D6]]},
  snorkel:{keys:['snorkel'],art:['#F5865E'],opts:[['Coral',0xF5865E],['Sky',0x7FBFEA],['Mint',0x7FD3A8],['Butter',0xF5C84E],['Berry',0xE36A8C]]},
  blower:{keys:['blowA','blowB'],art:['#F7A0C4','#FFE08A'],opts:[['Party',0xF7A0C4,0xFFE08A],['Sky',0x9FD2F2,0xFFFBF2],['Mint',0x9FE0BE,0xF7A8C4],['Lilac',0xCDB8F5,0xFFE08A],['Sunny',0xFFD04A,0xF26B5E]]},
  sweatband:{keys:['sweat','sweatStripe'],art:['#FFFBF2','#F27DA2'],opts:[['Classic',0xFFFBF2,0xF27DA2],['Sky',0x9FD2F2,0xFFFBF2],['Lime',0xC9E77E,0x4FAE80],['Sunny',0xFFD04A,0xE4574C],['Berry',0xE36A8C,0xFFFBF2]]}};
let tints=store.json('squirm-tints')||{};
const tintOf=id=>{ const t=TINTS[id]; return t?Math.min(t.opts.length-1,Math.max(0,tints[id]|0)):0; };
const hexStr=n=>'#'+n.toString(16).padStart(6,'0').toUpperCase();
function tintArt(id,svg){ const t=TINTS[id], k=tintOf(id); if(!t||!k) return svg;
  t.art.forEach((h,i)=>{ if(t.opts[k][i+1]!=null) svg=svg.split(h).join(hexStr(t.opts[k][i+1])); }); return svg; }
// swaps the tinted materials in a freshly built hat or extra (option k: your own choice unless given, as for a race ghost)
function tinted(id,proto,k=tintOf(id)){ const t=TINTS[id]; k=t?Math.min(t.opts.length-1,Math.max(0,k|0)):0; if(!t||!k) return proto;
  const map=new Map(t.keys.map((key,i)=>[m(key),MC['tint'+t.opts[k][i+1]]||(MC['tint'+t.opts[k][i+1]]=toon(t.opts[k][i+1]))]).filter((e,i)=>t.opts[k][i+1]!=null));
  proto.traverse(o=>{ if(o.material&&map.has(o.material)) o.material=map.get(o.material); }); return proto; }
