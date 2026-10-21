# CLAUDE.md

Context for working on **Squirm**, a cozy turn-based worm puzzle game.

## What it is

The player steers a fixed-length worm on a grid of garden tiles, one swipe per move. The worm
can't reverse into its own body or crawl onto soil. To finish a patch the worm must touch every
flag and enter the burrow at exactly the length shown on the burrow's sign. Mechanics layer on
top of that (listed below). Visual style: soft cartoon, pastel, cozy garden, perspective camera
tilted about 56 degrees, mobile-first with swipe controls.

## Shipping format

`npm run build` writes a static site to `dist/` (git-ignored), which CI deploys to GitHub Pages on
every push to `master`. It is an installable PWA that works fully offline:

- `index.html`: markup, CSS and all game code joined from `src/`
- `vendor/three.min.js`: three.js **r128** (UMD build), pinned as a devDependency. Don't upgrade
  casually: later versions change color management and lighting, which shifts the whole look.
- `fonts/`: Grandstander and Nunito woff2 (latin subset) from Fontsource
- `manifest.webmanifest`, `icons/`: copied from `public/`
- `sw.js`: built from `src/sw.js`. It precaches every file above under a cache named after a
  content hash, so each deploy replaces the old cache.

All paths are relative, so the site works from any sub-path. All 3D models are built
procedurally in code, and all sounds are synthesized with Web Audio. Keep it that way: no
bundler, no runtime dependencies besides three.js, no network requests at runtime.

## Layout

```
src/shell.html   page markup + all CSS; has /*__FONTS__*/ /*__LOGIC__*/ /*__LEVELS__*/ /*__GAME__*/ slots
src/logic.js     pure game rules: parseLevel, initState, step, tileAt, partner, cloneState (no DOM)
src/levels.js    LEVELS array (130 levels) + CHAPTER_NAMES
src/game.js      everything else, in one IIFE: rendering, input, UI, audio, generator, solver
src/sw.js        service worker template (version and file list filled in by the build)
public/          manifest and icons, copied as-is into dist/
tools/build.js   builds dist/ (see above) and syntax-checks the game script; --debug adds window.__squirm hooks
tools/analyze.js BFS solver used for par, state count and "winnable %" (share of reachable states that can still win)
tools/verify-levels.js  must pass before shipping level changes
test/            logic.test.js: rules; generator.test.js: daily/endless generation; smoke.js: plays patch 1 in headless Chromium (npm run smoke, also in CI)
tools/load-generator.js  loads the endless generator from game.js into Node (used by curate.js and tests)
tools/curate.js  generates candidate levels with the in-game generator and picks a difficulty spread
```

`logic.js` and `levels.js` are plain scripts in the browser and CommonJS modules in Node (guarded
`module.exports`), so the same rules run in the game, the hint solver and the tools.

## Level format

```js
{ name:"Shell Corner", hint:"", par:18, exitLen:3, rain:false,
  worm:[[x,y],...],            // head first, all orthogonally adjacent
  map:[ ".Cv   ", "E.. . ", ... ] }
```

| char | meaning |
|---|---|
| `.` | grass tile |
| ` ` | soil (blocked; decorated with plants) |
| `E` | burrow (exit); needs all flags touched and length == exitLen |
| `C` / `c` | flag / touched flag |
| `+` / `-` | peach (grow 1) / mushroom (shrink 1) |
| `x` | dry patch; sinks into the soil once the worm fully leaves it |
| `K` / `G` | key / gate (each key opens one gate) |
| `1`-`9` | tunnel pairs (internally still called "portals") |
| `R` | cloud stone: toggles rain |
| `s` / `w` | seedling (walkable only while raining) / puddle (blocked while raining) |
| `~` | river (blocked) |
| `=` / `\|` | bridge, crossable only along its axis (E-W / N-S) |
| `L` | crank: rotates every bridge not under the worm |
| `>` `<` `^` `v` | snail with its starting direction (tile underneath is `.`) |
| `B` / `H` | flower button / hedge: every hedge is open while any worm segment is on a flower |
| `i` | wet leaf: the head keeps sliding the same way until it is off the leaves or blocked |

Snails move one tile after every worm move, only onto plain `.` tiles, and reverse instead of
moving when blocked. The worm can't enter a snail's tile.

The head may enter a hedge only if the worm still covers a flower *after* that move, so a hedge
within reach of the flower needs a long enough worm. Hedge state is derived from the worm, so it
adds nothing to the solver key. A slide is one move: `step` calls `advance` repeatedly, snails
move once at the end, and `ev.slide` carries the in-between states so the game can animate each
tile of the slide.

## Hard rules for levels

- Every level must be **solvable**, and `par` must equal the BFS shortest solution.
  Run `npm run verify`.
- **Pacing:** chapters are 10 levels each. A mechanic may not appear before its chapter:
  flags from level 6, fruit 11, dry 21, keys 31, tunnels 41, rain 51, rivers 61, snails 101,
  flower buttons 111, wet leaves 121.
  Chapters 8-10 mix earlier mechanics at rising difficulty. The first level of a chapter
  should be a gentle introduction to its mechanic.
- Difficulty inside a chapter rises. Use `par * (1 - winnable)` from `tools/analyze.js` as
  a rough difficulty score.
- Progress is stored **by level name**, so names must stay unique and shouldn't be renamed
  once shipped.

## Adding levels

1. Hand-write, or generate candidates:
   `LO=.5 HI=.95 node tools/curate.js ch12 '{"flags":true,"snails":true}' snails medium 5 1401 90`
   (writes `gen/gen_ch12.json`, which is git-ignored). For snails, the tool also requires
   that removing the snails shortens the solution, so they actually matter.
2. Add entries to `src/levels.js`, extend `CHAPTER_NAMES` if starting a new chapter.
3. `npm test` (verify + build).

## Adding a mechanic

Touch these places in order: rules in `src/logic.js` (`step`, and `cloneState` if it adds
state), the solver keys (`tools/analyze.js`, plus `solveFrom` and `analyzeCapped` in
`game.js`), rendering (`makeTile` / `makeItem` / a sync function in `game.js`), the intro
dialog entry in `MECH`, `FEATURES` and `genCandidate` for endless mode, `THUMB_COL` for
level-list thumbnails, and `introAt` in `tools/verify-levels.js`.

## Key systems in game.js

- **Scene:** perspective camera fitted so the board sits between the header and nav bar
  (`fitCamera`). It may rotate 90 degrees for wide boards; swipes are mapped through the
  projected grid directions, so controls always match the screen.
- **Worm body:** a tube rebuilt every frame through segment anchors (`updateWorm`), with
  tapered radius, segment rings and a crawl bulge. Tunnels split the body into chains
  that dive into the ground.
- **Head:** expressions (`applyExpr`), blinking, an idle look-at-camera cycle, reactions,
  and falling asleep after 25 s.
- **Overlays and back button:** a small layer stack mirrored to `window.history`
  (`pushLayer` / `popLayer`). Note: inside the IIFE, `history` is the **undo stack**, not
  the browser history. Always use `window.history`.
- **Endless mode:** `genCandidate` + `analyzeCapped` + difficulty scoring in
  `generateEndless`. The daily patch uses a date seed with a fixed number of tries so it's
  deterministic.
- **Performance:** `watchSpeed` lowers `quality` (pixel ratio, shadow map size) when most frames
  take over 40 ms (a 30 fps low-power cap doesn't count), raises it one step per session once frames
  are quick again, and remembers it in `squirm-quality`. Ground textures use anisotropic filtering. Behind menus the blurred garden is drawn
  every third frame only.
- **GPU memory:** `disposeTree` frees a patch's meshes when the next one is built. Anything
  cached or defined at module level (`GC`, `MC`, the shared textures and materials) is kept; add
  new shared resources to its keep lists. `sph` rounds radii so its cache stays bounded.
- **Home and navigation:** the home screen (`homeOv`) has five tabs, switched by `showTab`: Play
  (worm, Continue, daily), Garden (patch list), Meadow (endless setup), Me (wardrobe) and Badges.
  The home worm's canvas moves between the Play and Me tabs. Leaving Play pushes a `tab` layer, so
  the back button returns to Play; opening a patch from a tab replaces that layer with `game`.
- **Motion:** `stagger(els, cls)` gives a list of elements a staggered entrance (`enter` drops in,
  `rise` comes up). Used by `hudIntro` (new patch), `tabIntro` (each home tab), the home top bar and
  tab bar in `showHome`, and `setPageIntro` (settings pages). `animOnce` replays a one-shot class.
- **Settings and backups:** the gear on the home screen opens `setOv`, a short list whose rows open
  sub-pages (`setPage`, each pushing a `setpage` layer): Sound & music, Reminders, Look, Your garden (save
  code backup and restore) and About. Starting over is only the secret hold on the home worm. A save code is `SQUIRM1:` + base64 JSON of every `squirm-` key except
  the throwaway ones in `SAVE_SKIP`; restoring replaces those keys and reloads.
- **Daily reminder:** no server, so no push. Where `PeriodicSyncManager` exists (installed Chrome on
  Android) the page registers periodic sync `squirm-daily`, and `sw.js` shows one notification a day if
  today's daily patch isn't done and it's past the chosen hour (quiet while the game is on screen).
  The worker reads `{on, hour, done, streak, told}` from the `squirm-state` cache, which the page
  writes (`shareRemindState`) and the worker's cache cleanup skips. Where only `setAppBadge` exists,
  the icon gets a badge instead. Setting: `squirm-remind` (device-specific, in `SAVE_SKIP`).
- **Ambient motion:** river tiles register in `flowTiles` (drifting leaf, glints, ripple, a
  water-babble sound loop); snails leave a slime strip (`trail`) that grows from tile to tile.
- **Rewards:** `BADGES` (id, icon, name, description, test) are checked after every win and after
  moves that bump a counter in `progress.stats`; earned ones live in `progress.badges`. `HATS` (one per
  chapter) unlock by finishing that chapter and are built once (`buildHat`) and cloned into the head's `hatSlot`.
- **Music:** `musicTick` schedules a generated tune (pad, bass, melody, echo) a little ahead on the
  Web Audio clock; its mood follows `todName` (time of day, which also brings fireflies in the evening and at night; the lighting itself is always daytime) and rain. Toggle: `squirm-music` (off by default for new players; on for players who already had progress), volume: `squirm-music-vol` (0-1).
- **Saved data:** everything in `localStorage` under keys starting with `squirm-`. Don't rename
  the keys or players lose progress. Other projects can share the origin (`<user>.github.io`), so
  keep the prefix on every key and every cache name. The secret reset (hold the worm's head on
  the home screen for 3 s) clears these keys.
- **Offline, install and updates:** `sw.js` is registered at boot (http/https only) and checked
  for updates whenever the app returns to the foreground and every 30 minutes. A new worker
  takes over right away; the page reloads into it at a calm moment (immediately on the home
  screen, otherwise the next time the player heads home). The home screen shows an install
  button when the browser fires `beforeinstallprompt`, and the build id (`__BUILD__`).

## Conventions

- Cozy, friendly UI copy, no jargon. Patches, not levels, in player-facing text.
- Respect `prefers-reduced-motion`.
- Wrap `localStorage` access in try/catch.
- Keep the mobile performance budget in mind. Scenery is the first thing to trim.
