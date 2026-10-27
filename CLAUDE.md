# CLAUDE.md

Guide for working on **Squirm**, a cozy turn-based worm puzzle PWA. This file is the single source of
truth for agents; README.md is the public overview. Two project skills cover the recurring workflows:
`add-levels` and `ui-check` (in `.claude/skills/`).

## What it is

The player steers a fixed-length worm on a grid of garden tiles, one swipe per move. The worm can't
reverse into its own body or crawl onto soil. To finish a patch it must touch every flag and enter the
burrow at exactly the length shown on the burrow's sign. Mechanics layer on top, one chapter at a time
(see the level format). 160 handmade patches in 16 chapters, an endless meadow and a daily patch.

Look: soft cartoon, pastel, cozy garden, perspective camera tilted about 56 degrees. Mobile-first with
swipe controls (keyboard works too). Plain JavaScript and three.js, no framework.

## Never do

- **No bundler, no runtime dependencies besides three.js, no network requests at runtime.** Every 3D
  model is built in code and every sound is synthesized with Web Audio; keep it that way.
- **Don't upgrade three.js** (pinned at r128, `three@0.128.0`) casually: later versions change colour
  management and lighting, which shifts the whole look.
- **Don't rename `squirm-` storage keys or shipped level names.** Progress is stored by level name and
  in those keys; renaming loses players' progress. Every new key and cache name starts with `squirm-`
  (other projects can share the `<user>.github.io` origin).
- **Don't touch `localStorage` directly** in `game.js`: use `store` (see conventions). The only raw
  accesses are the tiny `theme` / `boot` scripts in `shell.html` and the bulk restore in settings.
- **Don't ship a level that fails `npm run verify`** (unsolvable, wrong par, or a mechanic before its
  chapter).
- **Don't use `history` for the browser history** inside `game.js`: in that IIFE it's the undo stack.
  Always `window.history`.
- **Don't write colours, emoji or text glyphs inline in the UI**: use tokens and the icon sets.
- **Don't break the text markers other files cut on** (see "Things that will bite you").
- **Don't push without `npm run check`.** Every push to `master` deploys to GitHub Pages.

## Commands

```
npm install          # three.js r128 + the two Fontsource font packages (+ playwright for the smoke test)
npm run build        # src/ + public/ -> dist/ (git-ignored)
npm run build:debug  # same, plus window.__squirm hooks for browser automation
npm run serve        # serve dist/ at http://localhost:8080/ (npm run serve -- --port 8081 --base /squirm/)
npm test             # unit tests (test/*.test.js) + verify + build; this is what CI runs
npm run smoke        # debug build served under /squirm/, plays patch 1 in headless Chromium
npm run check        # npm test + smoke: run before pushing
npm run verify       # every level solvable, par correct, pacing respected
npm run analyze      # par, state count, winnable % and a solution for every level
npm run curate -- …  # generate candidate levels (see the add-levels skill)
```

Node 22+ (CI uses `.nvmrc`). Every tool starts with a usage comment; read it before running one.
The smoke test needs Playwright's Chromium (`npx playwright install chromium`); with a global
Playwright instead, prefix `NODE_PATH=$(npm root -g)`.

CI (`.github/workflows/deploy.yml`): on push to `master` and on PRs, `npm test` and the smoke test run
in parallel; on `master` both must pass before `dist/` deploys. PR runs are superseded by new pushes,
deploys are never cancelled.

## Layout

```
src/shell.html    page markup + all CSS (sectioned, index at the top of <style>); build slots
                  /*__FONTS__*/ /*__LOGIC__*/ /*__LEVELS__*/ /*__GAME__*/; inline theme + boot scripts
src/logic.js      pure rules, no DOM: parseLevel, initState, step (advance), tileAt, partner, cloneState,
                  hedgesOpen, beetleAt, stateKey
src/levels.js     LEVELS (160) + CHAPTER_NAMES (16)
src/game.js       everything else, one IIFE with a table of contents at the top: rendering, input, UI,
                  audio, music, endless generator, hint solver
src/sw.js         service worker template (version and file list filled in by the build)
public/           manifest, icons, install screenshots: copied as-is into dist/
docs/             README screenshots (not shipped)
tools/build.js    builds dist/ and syntax-checks the game script; --debug adds window.__squirm; --out <dir>
tools/serve.js    tiny static server (also used by smoke): [dir] --port --base
tools/analyze.js  BFS solver: par, state count, "winnable %" (share of reachable states that can still win)
tools/verify-levels.js  solvable + par + pacing check for src/levels.js
tools/load-generator.js runs the endless generator from game.js in Node (curate.js, tests)
tools/curate.js   generates candidate levels with that generator, picks a difficulty spread -> gen/ (ignored)
test/logic.test.js      rules (22 tests, incl. unique level names and stateKey)
test/generator.test.js  daily/endless generation (3 tests)
test/smoke.js           headless Chromium: boot, win patch 1, saved stars, GPU memory, offline reload
.claude/skills/   add-levels, ui-check (with shoot.js, a screenshot script)
```

`logic.js` and `levels.js` are plain scripts in the browser and CommonJS modules in Node (a guarded
one-line `module.exports` that the build strips), so the same rules run in the game, the hint solver
and the tools.

### What ships (`dist/`)

- `index.html`: shell + logic + levels + game joined into one page, with the build id (`__BUILD__`:
  version and short git sha) shown on the home screen.
- `vendor/three.min.js` (UMD) and `fonts/` (Grandstander and Nunito woff2, latin subset), each with its
  licence file.
- `manifest.webmanifest`, `icons/`, `screenshots/` from `public/`.
- `sw.js`: precaches every file above under `squirm-<content hash>`, so each deploy replaces the cache.

All paths are relative, so the site works from any sub-path (it's served from `/squirm/` on Pages).

## Workflows

### Adding levels

Use the `add-levels` skill. In short: hand-write or `curate` candidates, add them to `src/levels.js`
(extend `CHAPTER_NAMES` for a new chapter), set `par` from `npm run analyze`, check the difficulty
order, then `npm test`.

### Adding a mechanic

Touch these, in order:

1. Rules in `src/logic.js`: `advance` / `step` (and `cloneState` if it adds state). `step` must never
   mutate the state it's given (there's a test). Add tests to `test/logic.test.js`.
2. Solver key: `stateKey` in `logic.js`, the one key used by `solveFrom` and `analyzeCapped` in
   `game.js` and by `tools/analyze.js`. Anything that tells two states apart goes in it; derived state
   (like hedges) doesn't.
3. Rendering in `game.js`: `makeTile` / `makeItem` or a sync/update function, `disposeTree` keep lists
   for any new shared geometry, material or texture, and a HUD chip via `hudTile` if it needs one.
4. Intro dialog: `MECH` entry (title, text, char regex, `ART` picture; add the sticker to `ART`).
5. Endless mode: `FEATURES`, `genCandidate`, `usage` (how a solution "uses" it), the feature regex in
   `generateEndless`, `FEAT_SHORT`, and the Surprise list. Keep the endless section Node-safe (gotchas).
6. `THUMB_COL` for map thumbnails.
7. `tools/verify-levels.js`: both its `M` regex and `introAt` chapter start.
8. The character table below, the pacing rule, and README's chapter table.

### UI and CSS changes

- Find the place through the index: the table of contents at the top of `game.js` and the section index
  at the top of the `<style>` in `shell.html` (sections are in cascade order, later ones may override).
- Use the tokens, scales, icon sets and the UI feedback system (conventions below). New animations go
  in the one reduced-motion block (section 11).
- Check it visually with the `ui-check` skill (light and dark, phone size) before committing.

### Seeing the game in a browser

- `npm run build:debug && npm run serve -- --base /squirm/`, then open `http://localhost:8080/squirm/`.
- Headless (Playwright): launch Chromium with `--use-gl=swiftshader --enable-unsafe-swiftshader
  --ignore-gpu-blocklist`, viewport 390x844. `test/smoke.js` is a working example.
- Debug hooks (`window.__squirm`, debug build only): `load(i)` opens level index `i`, `move('N'|'S'|'E'|'W')`,
  `busy()` (wait for it to be false between moves), `names()`, `dir(x,y)` (screen swipe to grid
  direction), `mem()` (GPU memory and draw calls), `st()` (worm, status, moves as JSON).
- `squirm-tutorial=1` in localStorage skips the first-time swipe tutorial; Playwright's `colorScheme`
  switches light/dark (the theme setting defaults to following the system).

### Screenshots

- `docs/*.png`: the README gallery (520x1126, light and dark). Not shipped.
- `public/screenshots/*.png`: manifest install screenshots, shipped. Must stay 390x844 to match `sizes`
  in `manifest.webmanifest`.
- `node .claude/skills/ui-check/shoot.js <dir> --scale 1` takes 390x844 shots of every home tab and a
  patch in light and dark; pick from those when refreshing either set.

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
| `O` | beetle (tile underneath is `.`): crawling into it pushes it one tile ahead |

`rain` sets whether it starts raining. Rule details that the table doesn't capture:

- **Snails** move one tile after every worm move, only onto plain `.` tiles, and reverse instead of
  moving when blocked (also at beetles). The worm can't enter a snail's tile.
- **Hedges:** the head may enter a hedge only if the worm still covers a flower *after* that move, so a
  hedge within reach of the flower needs a long enough worm. Hedge state is derived from the worm and
  beetles, so it adds nothing to the solver key.
- **Wet leaves:** a slide is one move. `step` calls `advance` repeatedly, snails move once at the end,
  and `ev.slide` carries the in-between states so the game can animate each tile.
- **Beetles** live in `state.beetles` (like snails, so the tile underneath is kept). The head pushes a
  beetle one tile on; it may only move onto grass, flower buttons, dry patches and wet leaves (where it
  keeps sliding), never onto the worm, a snail or another beetle, otherwise the move is blocked
  (`'beetle'`). A beetle on a flower holds every hedge open (`beetleOnFlower`). `ev.pushed`
  (`{i, from, path}`) drives the animation. Beetle positions are in every solver key, sorted so identical
  beetles don't double the state count.

### Rules for levels

- Every level must be **solvable**, and `par` must equal the BFS shortest solution (`npm run verify`).
- **Pacing:** chapters are 10 levels each. A mechanic may not appear before its chapter: flags from
  level 6, fruit 11, dry 21, keys 31, tunnels 41, rain 51, rivers 61, snails 101, flower buttons 111,
  wet leaves 121, beetles 151. Chapters 8-10 mix earlier mechanics at rising difficulty, and so do 14-15
  (14 mixes the late mechanics: snails, flower buttons and wet leaves; 15 mixes everything and ends the
  hardest). The first level of a chapter is a gentle introduction to its mechanic.
- Difficulty rises inside a chapter. Use `par * (1 - winnable)` from `tools/analyze.js` as a rough score.
- Names are unique (tested) and never renamed once shipped.

Chapters (`CHAPTER_NAMES`): 1 First sprouts, 2 Snack time, 3 Cracked earth, 4 Garden gates, 5 Tunnels,
6 Rainy days, 7 Riverside, 8 Overgrown, 9 Tough patches, 10 Storm season, 11 Snail trail, 12 Hedge
garden, 13 Dewy morning, 14 Garden party, 15 Grand bloom, 16 Beetle bumps. Each has a hat (`HATS`).

## Key systems in game.js

Sections are listed in the table of contents at the top of the file; each starts with a
`// ---------- name ----------` line, so search for the divider.

- **Scene:** perspective camera fitted so the board sits between the header and nav bar (`fitCamera`).
  It may rotate 90 degrees for wide boards; swipes are mapped through the projected grid directions, so
  controls always match the screen. Lighting is always daytime.
- **Worm body:** a tube rebuilt every frame through segment anchors (`updateWorm`), with tapered radius,
  segment rings and a crawl bulge. Tunnels split the body into chains that dive into the ground.
- **Head:** expressions (`applyExpr`), blinking, an idle look-at-camera cycle, reactions, idle acts
  between looks (`startAct`: watch a butterfly, stretch, wiggle), a yawn, and asleep after 25 s.
- **Moves and hints:** `tryMove` queues swipes and animates `step` events; `history` is the undo stack.
  The hint solver `solveFrom` is a capped BFS over `stateKey`.
- **Layers and the back button:** a small layer stack mirrored to `window.history` (`pushLayer` /
  `popLayer` / `swapLayers`). `popLayer`'s `history.go` is async, so use `swapLayers` when replacing a
  layer right after closing another (the finale does this coming from the win dialog).
- **Home** (`homeOv`): five tabs switched by `showTab`: Play (the worm with a speech bubble, `say` / `sayHello`, new
  line on every tap; Continue with the chapter's pips; Daily and Meadow side by side, Meadow growing or
  resuming a patch in one tap; the closest badge, `renderGoal`, which opens it on Badges; what's new), Garden (the map:
  `renderLevelList` draws one scene per chapter with its patches as stepping stones on a winding SVG
  path; closed chapters fold into a small card; tapping a stone picks it (`pickPatch`) and shows its card
  with a `drawThumb` preview and the mechanics it uses; tapping again plays). Above the map: stars, a
  patches-grown bar and the chapter strip (`#chStrip`, one chip per chapter with its hat in a progress
  ring; tapping glides the map to that chapter, and `spyChapter` highlights the chapter in view), Meadow (endless setup: a hero card for the chosen difficulty
  with its description and its own streak, best, stars and cleared count (`DIFF_DESC`), a compact
  difficulty switch, the mechanics mix with All/None and Surprise me, and Grow a patch pinned at the
  bottom), Wardrobe (ids still `me` / `tabMe`) and Badges. The
  home worm's canvas moves between Play and Wardrobe; `homeStage(me)` widens it there and shows `hBody`, a
  curled body built by `buildHomeBody` (rebuilt on every colour or pattern change) so the outfit shows.
  The wardrobe switches one grid between Hats / Colours / Patterns / Extras (`wardTab`), shows the outfit line,
  and has a Surprise outfit button; `wearHat` / `wearColour` / `wearPattern` save and apply. Leaving Play pushes a `tab` layer, so back returns to
  Play; opening a patch from a tab replaces that layer with `game`.
- **Endless meadow and daily:** `genCandidate` + `analyzeCapped` + difficulty scoring in
  `generateEndless`. The daily patch (`startDaily`) uses a date seed, `DAILY_OPTS` and a fixed number of
  tries, so everyone gets the same one; it's cached in `squirm-daily-patch` for the day.
- **Finale:** once every patch is cleared (`allCleared`), winning the last one offers "What's next?",
  which opens `finOv` (`showFinale` / `renderFinale`): totals plus choices built from progress (patches
  below 3 stars via `shineable`, badges left, the meadow, today's daily). The home Play card turns into
  "Garden grown!" and opens it too, and the map ends with a card about more patches coming.
- **Rewards:** `BADGES` (id, icon, name, description, test) are checked after every win and after moves
  that bump a counter in `progress.stats`; earned ones live in `progress.badges` (with a timestamp, not
  shown). A test written as `counted(()=>[have,need])` also reports progress, which the Badges tab shows.
  The tab groups badges by `BADGE_GROUPS` (add new badges to one; ungrouped ones land in the last), with an All / Earned / To find
  filter and a detail card for the tapped badge (`renderBadges`, `renderBadgeDetail`). `HATS` ([id, name,
  chapter], one per chapter, unlocked by finishing it; or [id, name, -2, how to earn, test] for milestone
  hats like the chef hat) are built once (`buildHat`) and cloned into the head's `hatSlot`. `EXTRAS`
  (glasses, shades, a mustache, ...: [id, name, how to earn, test]) work the same way through `buildExtra`
  into the head's `accSlot`, saved in `squirm-extra`; every new hat or extra needs a sticker in `ART`
  (`hat-<id>` / `extra-<id>`).
  `WORM_COLS` ([name, body, head, stars, cheek]) unlock with stars; keep head and body the same hex (the
  toon head and the vertex-coloured body render a hex identically, so any difference shows at the neck), and
  the cheek is a blush picked per colour (`cheekMat`). `PATTERNS` (id, name, how to earn, test) unlock with milestones and are
  saved in `squirm-pattern`. `colorAt(g,n)` gives the tints that run along the body (fade, sunset, rainbow)
  as tube vertex colours; anything with an edge (the body-ring groove, stripes, bands, spots, glitter) is
  drawn per pixel by `tubeMat`'s shader (`patU` / `PAT_ID`) from the tube's `pg` attribute: place along
  the worm `g` (one unit per segment, continued down the tail tip and through tunnel dives) and the ring
  direction scaled by the radius, so patterns keep their size and shape on the stage and in a patch.
  `patArt` draws the wardrobe preview in the current colour, its sunset and rainbow sampled from `colorAt`.
- **What's new:** `NEWS` (newest first: date id, title, lines). Returning players see the newest entry
  once as a card on the Play tab (`renderNews`; `squirm-news` holds the last id seen, new players never
  see it); Settings > About lists them all. When you ship something players will notice, add an entry
  on top with today's date, in the same cozy voice.
- **Win card** (`onWin`): big stars, a line about par or hints, Moves / Par / Time tiles (`New best` tag),
  then `gifts`: rows for what was earned (badges, hats, colours, patterns: `hot`, honey) and progress
  notes (chapter, streaks, next chapter), in a `.fade-scroll`. Next is the big button; Replay, Photo and
  Share sit under it. Badges earned by a win only play their jingle; the card lists them.
- **The worm talks in play:** `wormSays(text,ms)` shows a bubble (`#wormSayG`) that `placeSay` keeps next to
  the head every frame; snacks, flags, keys and gates sometimes get a word (`SAY`, via `sayFor`: 1 in 4, at most every 40 s, so
  it stays rare), while hints and the stuck nudge always speak through it.
  Rule explanations and blocked moves stay as toasts.
- **Meeting a mechanic:** `showIntro(list,done)` pages through one illustrated card per mechanic
  (`renderIntro`, a bobbing `MECH` sticker in a tinted circle, dots, Next / Let's go).
- **Photo mode:** the win dialog's Photo button (`enterPhoto` / `exitPhoto`, a `photo` layer). The HUD
  fades out (`body.photo`), the camera glides to a full-screen framing (`glideCamera(photoFrame())`), and
  the worm pops its head out of the burrow and looks at the camera (`updateHead` has a `photoOn` branch;
  Pose calls `newExpression`). Free camera (`orbit`: yaw, pitch, distance and a look-at point `t`,
  mirrored in `camLook`): one finger or mouse drag orbits; two fingers pinch to zoom, move together to
  pan and twist to turn; right-drag or Shift-drag pans; the wheel zooms; arrow keys pan. Tilt, distance
  and the look-at point (kept over the bed) are clamped. Reset view (`resetView`, also R) and leaving
  photo mode glide back (`glideCamera` brings `camLook` home too). `#stage` gets `touch-action:none` in
  photo mode and Safari's `gesturestart` is cancelled, so pinching never zooms the page. `snapPhoto` renders a frame, draws it on a 2D canvas with a caption plaque
  (patch and stars, from `photoInfo` set in `onWin`) and the name, then shares the PNG where the browser
  can share files and downloads it otherwise. Keys: Space/Enter snap, P pose, Esc back.
- **Settings and backups:** the home gear opens `setOv`, one scrolling page (`#setScroll`, a
  `.fade-scroll`) of cards with sticker headings (`renderSettings`): a stats strip, Sound (music, volume,
  effects, vibration), Look (theme with swatches; Graphics: Auto lets `watchSpeed` adapt, Saver pins the
  lowest quality, Sharp the highest; `squirm-gfx`, device-specific), Reminders, Back up your garden (save
  code) and About (with What's new folded into a `<details>`). A save code is `SQUIRM1:` + base64 JSON of every `squirm-` key except
  the throwaway ones in `SAVE_SKIP`; restoring replaces those keys and reloads. Starting over is only
  the secret reset: hold the home worm's head for 3 s, which clears every `squirm-` key.
- **Music and sound:** `sfx(name)` plays synthesized effects. `musicTick` schedules a generated tune
  (pad, bass, melody, echo) a little ahead on the Web Audio clock; its mood follows `todName` (time of
  day, which also brings fireflies in the evening and at night) and rain. `squirm-music` (off by default
  for new players, on for players who already had progress), `squirm-music-vol` (0-1).
- **Scenery batching:** the plants, bushes and trees around the bed are built into a temporary group and
  merged by `batchScenery` into a few chunked meshes (vertex colours, one for outlines). Their sway runs
  in the vertex shader (`windify`, uniforms `windU` / `gustU`, per-vertex `sway`), so the lawn costs a
  handful of draw calls. Critters use the same merge (`merged`).
- **Garden visitors:** `buildCritters` adds a ladybug on the wooden border and, above the lowest quality,
  a bird on the lawn in front of the bed (placed once the camera is fitted). `birdSpot` only picks spots
  clear of `lawnObstacles` / `treeObstacles` and reachable in a straight line. It bobs when the ambient
  birdsong plays. Animated in `updateCritters`.
- **Beetles:** `makeBeetle` (solid body merged into one mesh; eyes, antennae and legs separate so they
  move), `pushBeetle` (turns to face the worm, scoots along its path with eyes shut), `beetleNope`
  (shakes its head at a blocked push), `updateBeetles` (blinks, watches the worm, scrabbles, looks
  content on a flower). Open hedges pull in from the tile edges so the change reads from above.
- **Ambient motion:** river tiles register in `flowTiles` (drifting leaf, glints, ripple, a water-babble
  loop); snails leave a slime strip (`trail`) that grows from tile to tile.
- **Performance:** `watchSpeed` lowers `quality` (pixel ratio, shadow map size) when most frames take
  over 40 ms (a 30 fps low-power cap doesn't count), raises it one step per session once frames are
  quick again, and remembers it in `squirm-quality`. Behind menus the blurred garden is drawn every third
  frame only. Ground textures use anisotropic filtering.
- **GPU memory:** `disposeTree` frees a patch's meshes when the next one is built, except what's in its
  keep lists (`GC`, `MC`, shared geometries, materials and textures). Add new module-level resources to
  those lists. The smoke test fails if geometries or textures grow across patches.
- **Fast first paint:** the home overlay is visible in the markup, and the `boot` script in `shell.html`
  fills in stars, the Continue text and the daily card from `squirm-boot` (written by `renderHome`)
  before three.js loads. `start` shows home first and builds the garden a frame later; the
  3D canvases fade in (`.ready`) once they've drawn. The `theme` script in `<head>` applies a forced theme
  before first paint.
- **Offline, install and updates:** `sw.js` is registered at boot (http/https only) and checked for
  updates when the app returns to the foreground and every 30 minutes. A new worker takes over right
  away; the page reloads into it at a calm moment (immediately on the home screen, otherwise the next
  time the player heads home). The home screen shows an install button on `beforeinstallprompt`.
- **Daily reminder:** no server, so no push. Where `PeriodicSyncManager` exists (installed Chrome on
  Android) the page registers periodic sync `squirm-daily`, and `sw.js` shows one notification a day if
  today's daily isn't done and it's past the chosen hour (quiet while the game is on screen). The worker
  reads `{on, hour, done, streak, told}` from the `squirm-state` cache, which the page writes
  (`shareRemindState`) and the worker's cache cleanup skips. Where only `setAppBadge` exists, the icon
  gets a badge instead. Setting: `squirm-remind` (device-specific, in `SAVE_SKIP`).

## Conventions

### Code

- Saved data goes through `store`: `get(k)`, `set(k,v)`, `del(k)`, `json(k)` (parsed or `null`),
  `keys()` (all `squirm-` keys). None of them throw, so callers need no try/catch.
- DOM: `$(id)` and `qa(root, sel)` (an array).
- Canvas textures: `canvasTex(w,h,g=>{...},rep)` (`rep` repeats it that many times), not a hand-rolled
  canvas.
- HUD stat tiles: `hudTile(tip,cls,label,value,caption,tap)`, not a new template string.
- 3D: colours from the `C` palette, cached toon materials `m(key)` / `toon(color)`, inverted-hull
  `outline(mesh)`, cached spheres `sph(r)` (radii rounded so the cache stays bounded).
- Pictures: add to `ART` and use `art(name,size)` (see icons).
- New code goes in the matching `game.js` section; a new section gets a `// ---------- name ----------`
  divider and a line in the table of contents. `.editorconfig`: 2 spaces, LF, final newline.
- Keep the mobile performance budget in mind. Scenery is the first thing to trim.

### Copy

- Cozy, friendly UI copy, no jargon. Patches, not levels, in player-facing text.

### Styling (`shell.html`)

- UI uses the tokens in section 1 (not the 3D scene, which has its own `C` palette): colours (`--ink`,
  `--ink-soft`, `--paper`, `--edge`, `--leaf`, `--berry`, `--honey`, their `-dark` and `--tint-`
  variants, `--soil`, `--deep`, `--lilac`, `--petal`, `--outline`, `--sticker`, `--on-accent`, `--scrim`,
  `--shine`, ...), the top-light gradients `--glaze` (on paper) and `--glaze-accent` (on leaf, honey and
  berry), and the fonts `--fd` (Grandstander, display) and `--fb` (Nunito, body). Need a new colour? Add
  a token, with a dark-mode (and, if needed, more-contrast) value next to the others.
- Inline SVG in markup is coloured with tokens: `style="fill:var(--x);stroke:var(--outline)"`. Stars
  are `--honey` everywhere. Decorative SVGs inside labelled controls get `aria-hidden="true"`.
- Scales: display text 12/14/16/18/21/26/30/52px, body text 11/12/13/14/15/16px, icon glyphs
  16/20/24px; corner radius 10/14/18/22/26px, `999px` for pills, `50%` for circles; borders 2px (small
  inner pieces) or 3px (cards, buttons, tiles); gaps 2/4/6/8/10/12/14/16px.
- Scrolling areas use `.fade-scroll` (every home tab page, the garden map, the badges list; add `.x`
  for a sideways scroller like the chapter strip): content
  fades out at an edge only while there's more to scroll that way, growing with that distance, so
  nothing is cut off sharply. `fadeScroll(el)` wires it up (done at boot for every `.fade-scroll` in the
  markup; call it for ones you create later; it re-measures on scroll, resize, new content and when
  children finish animating); `data-fade` / `data-fade-top` set the size in px. It sets
  `--fade-t` / `--fade-b` on the element: never reuse a token name there, children inherit it.
- `:where(.dialog) p` is a zero-specificity default for dialog paragraphs, so a class on a paragraph
  wins without `!important`. Prefer low-specificity defaults like that over overrides.
- Respect `prefers-reduced-motion`: every animation and transition is listed in the single reduced-motion
  block (section 11), and `reduceMotion` in `game.js` gates scripted motion.

### Icons

- No emoji or text glyphs in the UI.
- Pictures (badges, hats, settings rows, stats, difficulty, map decorations, mechanic intros and Meadow
  tiles via `MECH[k].i`) come from the `ART` sticker set via `art(name,size)`: a 24-unit grid, pastel
  fills, brown `#5B4436` outline whose width scales with size, stars filled honey. Each object has one
  drawing everywhere, coloured like its 3D model (the mushroom is lilac like the board's; the red one is
  the hat). In `shell.html` write `<span data-art="name" data-size="28"></span>`; the boot section of
  `game.js` fills it in.
- Controls (chevrons, back, close, check, HUD buttons) are monoline `currentColor` SVGs from `UI_ICON`
  (class `ui-ic`), stroke rendering about 2.5px.

### UI feedback: one system for every control

- **Motion tokens:** `--dur-fast` (.14s: press, closing), `--dur` (.3s: dialog open, selection pop, page
  slide, shake), `--dur-slow` (.48s: staggered entrances), plus `--ease-pop` (overshoot), `--ease-out`
  and `--ease-in` (exits). No ad-hoc durations.
- **Press:** controls on a ledge (`.btn`, `.round`, `.disc`, `.play`, `.big`, `.set-link`, hats,
  difficulty cards, map stones) sink onto it; flat ones (seg buttons, mechanic tiles, swatches, HUD
  tiles, icon buttons, links, switches) squish to `scale:.94`; tab icons to `.9`. Rules live in section 9.
- **Sound and haptics:** a document-level press handler gives every `button` and `[role=button]` one
  `tap` and one light haptic. Don't call `sfx('tap')` or `buzz()` in a click handler. `data-sfx="name"`
  picks a different sound; `data-sfx="none"` when the handler plays its own later (undo, hint, reminder
  switch). If a handler plays any `sfx` or `buzz` during the click, the press adds nothing.
- **Selection** (seg, difficulty, hats, colours, map stones): `tap` + `settle(el)` (the `popin` pop).
  **Toggles** (switches, mechanic tiles, sound and vibration buttons): `sfx('on')` / `sfx('off')`.
  **Blocked** (locked stone, hat or colour, a bad save code, reminders that can't be set):
  `nope(el,msg)`, which shakes, plays `bump` and shows a toast.
- **Dialogs:** every `.ov` scrim fades in while its `.dialog` pops. `hide()` adds `.out` for a short
  fade, then removes `.show`, so ask `isOpen(id)` (not `.show`). The home screen just swaps.
- **Entrances:** `stagger(els, cls)` (`enter` drops in, `rise` comes up), used by `hudIntro`,
  `tabIntro`, `showHome` and `setPageIntro`. `animOnce` replays a one-shot class.
- Animations that must stack on an element's own transform (map stones are centred with one) use the
  individual `scale` / `translate` properties in their keyframes (`popin`, `nope`, `hudIn`, `navIn`).
- `#toast` sits outside `#app`, fixed above everything; `toast()` anchors it above the game buttons or
  the home tab bar.

## Things that will bite you

- **Generator extraction:** `tools/load-generator.js` evaluates `game.js` from the line that starts with
  `// ---------- endless meadow ----------` up to the line that starts with `const todayKey`, plus the
  one-line `function rng(seed){...}`, in a Node sandbox that only has logic.js, `performance`,
  `setTimeout`, `console`, a stub `$` and an empty `progress`. So: keep both markers at line starts and
  in that order, keep `rng` on one line, and don't use other page globals (`store`, `document`, three.js)
  in that stretch. Tests and `curate` break otherwise.
- **Daily determinism:** `test/generator.test.js` copies `DAILY_OPTS` and the date-seed recipe from
  `startDaily`; change them together. Any change to the endless section that alters output for a seed
  changes everyone's daily patch, so refactors there should produce identical patches.
- **Debug hooks:** `tools/build.js --debug` inserts `window.__squirm` by matching the final `})();` at
  the very end of `game.js`, and the hooks call `hideAll`, `loadLevel`, `tryMove`, `animating`, `queue`,
  `dirFromScreen`, `renderer` and `state`. Keep the file ending in `})();` and keep those names, or the
  smoke test loses its hooks.
- **Build string surgery:** the build strips the one-line `if(typeof module!=='undefined') ...` export
  from `logic.js` and `levels.js`, replaces the `/*__...__*/` slots and `__BUILD__` in `shell.html`, and
  syntax-checks only the first bare `<script>` (the game). Give any other inline script an attribute
  (`id="theme"`, `id="boot"`), and keep the exports on one line.
- **One solver key:** `stateKey` in `logic.js` feeds the hint solver, the generator and
  `tools/analyze.js` (verify, curate, tests); a new piece of state missing from it makes par and hints wrong.
- **Service worker in dev:** a served build installs `sw.js`, which can serve a stale copy after you
  rebuild. `tools/serve.js` sends `no-cache` and the worker updates itself, but a hard reload or a fresh
  browser context is the quick fix.
- **Storage keys outside `game.js`:** `squirm-theme` (theme script), `squirm-boot` (boot script) and
  `squirm-state` (a Cache Storage entry the service worker reads) are read by code that can't use `store`.
