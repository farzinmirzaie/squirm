// Squirm's game code: rendering, input, UI, audio, the endless generator and the hint solver. The files in
// src/game/ are joined in tools/game-files.js order inside one function wrapper, after logic.js and levels.js,
// so they share one scope. Folders:
//   core/     store, DOM helpers, three setup, state, tweens, the frame loop, boot
//   audio/    sound effects and the generated music
//   models/   3D objects: garden scenery, critters, tiles and items, snails, beetles, pollen and soft soil,
//             dirt mounds and moles, weather, the worm (head, skin, body), hats and extras
//   rewards/  the wardrobe lists (hats, extras, colour options, worm colours, patterns) and badges
//   play/     the worm's idle life, moves, photo mode, hints, resume, HUD, mechanic intros, levels, camera, input
//   ui/       press feedback, stickers (ART), dialogs, the back-button layers, what's new, finale, settings
//   home/     the home tabs, the wardrobe tab, the home worm
//   endless/  the generator (also run in Node by tools/load-generator.js, so it must not touch the page
//             beyond $()) and the daily patch
//   platform/ anonymous stats, offline and install, the daily reminder, the race's Nostr meeting point
//   (play/race.js, racing a friend, comes after platform/: it needs GAME_URL, NEWS and the dialogs)
// Inside the wrapper `history` is the undo stack; the browser's is always window.history.

// ---------- saved data ----------
// every key starts with squirm- and must never be renamed; storage can be missing or full, so none of these ever throw
const store={
  get:k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} },
  del:k=>{ try{ localStorage.removeItem(k); }catch(e){} },
  json:k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } },
  keys:()=>{ try{ return Object.keys(localStorage).filter(k=>k.startsWith('squirm-')); }catch(e){ return []; } }
};
// ---------- comfort ----------
// Settings > Comfort, all device-specific (SAVE_SKIP). Calm motion (squirm-calm) works like the system's reduce-motion
// setting: reduceMotion gates scripted motion, and body.calm gets a copy of the CSS reduced-motion block (made at boot by
// calmCSS). Bigger text (squirm-bigtext): body.big-text. Colour helpers (squirm-marks): a shape for each pollen colour on
// flowers and petal gates (syncMarks) and a pollen chip in the HUD.
let calmMotion=store.get('squirm-calm')==='1', bigText=store.get('squirm-bigtext')==='1', colourMarks=store.get('squirm-marks')==='1';
const motionQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let reduceMotion = calmMotion || !!(motionQuery && motionQuery.matches);
if(motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change',e=>{ reduceMotion=calmMotion||e.matches; });
function applyComfort(){ reduceMotion=calmMotion||!!(motionQuery&&motionQuery.matches);
  document.body.classList.toggle('calm',calmMotion); document.body.classList.toggle('big-text',bigText); }
const C = {
  turf1:0xB9E49E, turf2:0xAADB8E, dry:0xEBD59C, soil:0x9A6A4C, soilDark:0x7E543B, wood:0xD29A62, lawn:0x8CC673,
  head:0xFFB3C8, riverWater:0x8CCFEA, plank:0xD9A56E, plankDark:0xB98352, leafBig:0x7CC95F, water:0x9ED6EF, mud:0x8A5E43, cloud:0xFFFFFF, rainCloud:0xAEBBD2, eye:0xFFFFFF, pupil:0x3B2A22, cheek:0xFF6F96,
  peach:0xFFA27C, leaf:0x6CC97A, cap:0xB79CF2, stem:0xFFF1DE, turnCap:0x6FCFC0, turnSwirl:0xFFF6DE, key:0xF7C64F, gateWood:0xC88A55,
  peachBlush:0xFF7C6E, stalk:0x8A5A3C, leafRib:0x4E9A3E, gills:0xF1DDF6, turnGills:0xD3F1EA, keyGem:0xFF8FB1, burrowWall:0x5E4234, tunnelSoil:0xA9744F, tunnelClod:0x96633F, stone:0xC9C0B4, stoneDark:0xAFA597, leafBigRib:0x5FAE48,
  flag:0xF27DA2, flagDone:0x79C95F, pole:0xB98A62,
  mushRed:0xF07A6A, topHat:0x4E3F5C, rainHat:0xFFD04A, brolly:0x9FD2F2, bowDark:0xE36A8C, bowKnot:0xC24E72,
  straw:0xF3D18A, strawDark:0xD9B166, acornCap:0x8A5A36, acornNut:0xC98E52, partyA:0x9FD2F2, partyB:0xFFF1A8, crown:0xF5C14E, beret:0xB79CF2, beanie:0x8FD0B0, beanieRib:0x6FB894, beetle:0x7C8CF0, beetleDark:0x5566C8, beetleHead:0x3E3F84, beetleSpot:0xB5C0FA, beetleLeg:0x3A2F5E, sunPetal:0xFFD34D, sunCore:0x7A4E2E, shellHat:0xC9A0E6, shellSpiral:0xA67CCB, pumpkin:0xF7A05A, pumpkinRib:0xE0843F,
  acornScale:0xA87447,
  pollenP:0xFF7A6B, pollenPLight:0xFFC6BC, pollenPDark:0xC94A43, pollenY:0xFFC63A, pollenYLight:0xFFE9A6, pollenYDark:0xD08A1C, pollenU:0x63A9F2, pollenULight:0xC4E2FF, pollenUDark:0x3E73C2,
  bandana:0xE4574C, bandanaDot:0xFFF1DE, teacup:0x9FD2F2, teacupDot:0xFFFBF2, tea:0xB8794A, twig:0x9A6B45, egg:0xBFE6F7, eggDot:0x7FA8C2,
  patch:0x3B2A22, sweat:0xFFFBF2, sweatStripe:0xF27DA2, ladybug:0xE4574C, daisy:0xFFFBF2,
  explorer:0xDCC28C, explorerBand:0x8A5A36,
  teaLight:0xDDA77A,
  owl:0xC99A6A, owlDark:0x9E7450, owlBelly:0xF6E3C3, beak:0xF5B83E, nightcap:0x8FA6E8, idea:0xFFE27A, ideaBase:0xC3CCD8, nightStripe:0xFFF6DE, firefly:0x6B5646, fireGlow:0xFFE36B,
  miner:0xF5A33A, minerDark:0xD9822A, lamp:0xFFF6C8, gnome:0xE4574C, goggle:0xA9703F, lensBlue:0xBFE6F7,
  softSoil:0xB07850, softRidge:0xCB9468, softClod:0x8A5A3A,
  dirt:0xD29C68, dirtDark:0xA06A44, dirtCrumb:0xEABF8C, root:0xF0D9B5, trowel:0xC7D3E0, trowelHandle:0xF07A6A,
  moleHill:0xA8714C, mole:0x7A6E8E, moleBelly:0x9D92AE, moleSnout:0xF7C6D0, moleNose:0xFF8BAA, molePaw:0xFFB8C8, moleClaw:0xFFF1E6,
  snail:0xF6E2B0, snailFoot:0xE6C88E, snailShell:0xC9A0E6, snailShellLight:0xDCC0F2, snailSpiral:0x9A6FC2, softCrumb:0x9C6842, polRib:0xA6E3AC,
  wetLeaf:0x8EE0B4, leafVein:0x5DBA8A, dew:0xEAF8FF, hedge:0x5FA64F, hedgeDark:0x4E8F40, petalB:0xF7A8C4,
  gdLeaf1:0x6FB45A, gdLeaf2:0x7CC062, gdLeaf3:0x86C96B, gdLeaf4:0x5FA64F, gdTrunk:0x9B6B47, gdBloom1:0xF9B9CC, gdBloom2:0xFCCFDB, gdPine1:0x64AB70, gdPine2:0x78BC80, gdPoplar:0x67AD58, gdFern:0x79C46A, gdTuft1:0x78B85F, gdTuft2:0x96CF78, gdRock1:0xC2BAB2, gdRock2:0xD2CAC0, gdMoss:0x8DC46D, gdPebble:0xD8CFC4, gdBerry:0xF0707A, gdLavender:0xB79CF0, gdHydra1:0xA8C8F5, gdHydra2:0xF5B3D0, gdHydra3:0xCDB6F5, gdWhite:0xFFFBF2, gdSun:0xFFC93C, gdCream:0xFFF0A8, gdBird:0x7DB4E8, gdBirdWing:0x6399D4, gdBirdBelly:0xFFE9C9, gdBirdBeak:0xFFB24A, gdBug:0xE8544E,
  burrow:0x3A2A22, mound:0xB07B57, ready:0x8EDB72, line:0x5B4436,
  wormIris:0x7A5442, wormMouth:0x9C4459, wormTongue:0xFF7A98,
  chef:0xFFFBF2, wizard:0x8E7BE0, cowboy:0xC98E52, cowboyBand:0x8A5A36, phones:0xF7A8C4, phonesBand:0x6E5F86,
  frame:0x4A3C52, lensDark:0x3E3548, heartFrame:0xF27DA2, starFrame:0xF5C14E, monocle:0xE0B04A, tash:0x6B4A35, tashLight:0xB08560,
  racer:0xF26B5E, racerRim:0xFFF6DE, ribbon:0x7FBFEA, ribbonStripe:0xFFFBF2,
  flowerpot:0xE08A5E, flowerpotRim:0xC96F45, hatMole:0x857079, hatMoleSnout:0xF7A0B8, hatDirt:0xB07B57, hatDirtDark:0x93603F,
  propA:0xF26B5E, propB:0xFFD04A, propBlade:0x7FBFEA, pearl:0xFBF3EA, gum:0xF7A0C4, earStar:0xF5C14E, plaster:0xF2C9A0, plasterPad:0xFFF1DE,
  boat:0xFFFBF2, boatIn:0xE3DCCF, apple:0xF0685A, appleFlesh:0xFFF1DE, cord:0xD99A5C,
  glass:0xDDF2FF, glint:0xFFFFFF, brass:0xE8B85A, wingDeep:0xE57A9C, freckle:0xB27654, stitch:0x9C8676, seed:0xD9952E,
  portal:{ '1':0x7FCFEA, '2':0xC69CF7, '3':0xFFB877, '4':0x9BE39B }
};
// ---------- DOM helpers ----------
const $=id=>document.getElementById(id);
const qa=(root,sel)=>[...root.querySelectorAll(sel)];
// a milestone test that also reports [have, need], so badges and wardrobe items can show a progress bar
const counted=f=>Object.assign(()=>{ const [a,b]=f(); return a>=b; },{prog:f});
// an extra or pattern earned by finishing chapter k (a hat names its chapter in HATS instead): marked with .chapter, so
// chapterReward finds it for the garden map, and with the chapter's patches as its progress
const byChapter=k=>Object.assign(()=>chapterCleared(k),{chapter:k,prog:()=>chapterProg(k)});
