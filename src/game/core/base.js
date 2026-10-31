// Squirm's game code: rendering, input, UI, audio, the endless generator and the hint solver. The files in
// src/game/ are joined in tools/game-files.js order inside one function wrapper, after logic.js and levels.js,
// so they share one scope. Folders:
//   core/     store, DOM helpers, three setup, state, tweens, the frame loop, boot
//   audio/    sound effects and the generated music
//   models/   3D objects: garden scenery, critters, tiles and items, snails, beetles, pollen and soft soil,
//             weather, the worm (head, skin, body), hats and extras
//   rewards/  the wardrobe lists (hats, extras, colour options, worm colours, patterns) and badges
//   play/     the worm's idle life, moves, photo mode, hints, resume, HUD, mechanic intros, levels, camera, input
//   ui/       press feedback, stickers (ART), dialogs, the back-button layers, what's new, finale, settings
//   home/     the home tabs, the wardrobe tab, the home worm
//   endless/  the generator (also run in Node by tools/load-generator.js, so it must not touch the page
//             beyond $()) and the daily patch
//   platform/ anonymous stats, offline and install, the daily reminder
// Inside the wrapper `history` is the undo stack; the browser's is always window.history.

const motionQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let reduceMotion = !!(motionQuery && motionQuery.matches);
if(motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change',e=>{ reduceMotion=e.matches; });
// ---------- saved data ----------
// every key starts with squirm- and must never be renamed; storage can be missing or full, so none of these ever throw
const store={
  get:k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} },
  del:k=>{ try{ localStorage.removeItem(k); }catch(e){} },
  json:k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } },
  keys:()=>{ try{ return Object.keys(localStorage).filter(k=>k.startsWith('squirm-')); }catch(e){ return []; } }
};
const C = {
  turf1:0xB9E49E, turf2:0xAADB8E, dry:0xEBD59C, soil:0x9A6A4C, soilDark:0x7E543B, wood:0xD29A62, lawn:0x8CC673,
  head:0xFFB3C8, riverWater:0x8CCFEA, plank:0xD9A56E, plankDark:0xB98352, leafBig:0x7CC95F, water:0x9ED6EF, mud:0x8A5E43, cloud:0xFFFFFF, rainCloud:0xAEBBD2, eye:0xFFFFFF, pupil:0x3B2A22, cheek:0xFF6F96,
  peach:0xFFA27C, leaf:0x6CC97A, cap:0xB79CF2, stem:0xFFF1DE, key:0xF7C64F, gateWood:0xC88A55,
  flag:0xF27DA2, flagDone:0x79C95F, pole:0xB98A62,
  mushRed:0xF07A6A, topHat:0x4E3F5C, rainHat:0xFFD04A, brolly:0x9FD2F2, bowDark:0xE36A8C, bowKnot:0xC24E72,
  straw:0xF3D18A, strawDark:0xD9B166, acornCap:0x8A5A36, acornNut:0xC98E52, partyA:0x9FD2F2, partyB:0xFFF1A8, crown:0xF5C14E, beret:0xB79CF2, beanie:0x8FD0B0, beanieRib:0x6FB894, beetle:0x7C8CF0, beetleDark:0x5566C8, beetleHead:0x3E3F84, beetleSpot:0xB5C0FA, beetleLeg:0x3A2F5E, sunPetal:0xFFD34D, sunCore:0x7A4E2E, shellHat:0xC9A0E6, shellSpiral:0xA67CCB, pumpkin:0xF7A05A, pumpkinRib:0xE0843F,
  pollenP:0xFF7A6B, pollenPLight:0xFFC6BC, pollenPDark:0xC94A43, pollenY:0xFFC63A, pollenYLight:0xFFE9A6, pollenYDark:0xD08A1C, pollenU:0x63A9F2, pollenULight:0xC4E2FF, pollenUDark:0x3E73C2,
  bandana:0xE4574C, bandanaDot:0xFFF1DE, teacup:0x9FD2F2, teacupDot:0xFFFBF2, tea:0xB8794A, twig:0x9A6B45, egg:0xBFE6F7, eggDot:0x7FA8C2,
  patch:0x3B2A22, sweat:0xFFFBF2, sweatStripe:0xF27DA2, ladybug:0xE4574C, daisy:0xFFFBF2,
  explorer:0xDCC28C, explorerBand:0x8A5A36,
  miner:0xF5A33A, minerDark:0xD9822A, lamp:0xFFF6C8, gnome:0xE4574C, goggle:0xA9703F, lensBlue:0xBFE6F7,
  softSoil:0xB07850, softRidge:0xCB9468, softClod:0x8A5A3A,
  wetLeaf:0x8EE0B4, leafVein:0x5DBA8A, dew:0xEAF8FF, hedge:0x5FA64F, hedgeDark:0x4E8F40, petalB:0xF7A8C4,
  burrow:0x3A2A22, mound:0xB07B57, ready:0x8EDB72, line:0x5B4436,
  chef:0xFFFBF2, wizard:0x8E7BE0, cowboy:0xC98E52, cowboyBand:0x8A5A36, phones:0xF7A8C4, phonesBand:0x6E5F86,
  frame:0x4A3C52, lensDark:0x3E3548, heartFrame:0xF27DA2, starFrame:0xF5C14E, monocle:0xE0B04A, tash:0x6B4A35, tashLight:0xB08560,
  portal:{ '1':0x7FCFEA, '2':0xC69CF7, '3':0xFFB877, '4':0x9BE39B }
};
// ---------- DOM helpers ----------
const $=id=>document.getElementById(id);
const qa=(root,sel)=>[...root.querySelectorAll(sel)];
