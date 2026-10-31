# CLAUDE.md

Guide for working on **Squirm**, a cozy turn-based worm puzzle PWA. This file is the single source of
truth for agents; README.md is a short public overview without details that go stale (no counts, no
screenshots). Three project skills cover the recurring workflows (in `.claude/skills/`): `add-levels`,
`add-model` (build a 3D model and review it from every side) and `ui-check` (screenshots of the UI).
When you change a system, update its part of this file in the same commit.

## What it is

The player steers a worm on a grid of garden tiles, one swipe per move. The worm keeps its length, can't
reverse into its own body and can't crawl onto soil. To finish a patch it must touch every flag and enter
the burrow at exactly the length on the burrow's sign. Mechanics arrive one chapter at a time (chapters
of ten handmade patches), plus an endless meadow of generated patches and a daily patch.

Look: soft cartoon, pastel, cozy garden, a perspective camera tilted about 56 degrees. Mobile-first with
swipe controls (keyboard works too). Plain JavaScript and three.js, no framework.

## Never do

- **No bundler, no runtime dependencies besides three.js, no network requests at runtime** except the
  anonymous stats pings (see "Anonymous stats"). Every 3D model is built in code and every sound is
  synthesized with Web Audio; keep it that way.
- **Don't upgrade three.js** (pinned at r128, `three@0.128.0`) casually: later versions change colour
  management and lighting, which shifts the whole look.
- **Don't rename `squirm-` storage keys or shipped level names.** Progress is stored by level name and
  in those keys; renaming loses players' progress. Every new key and cache name starts with `squirm-`
  (other projects can share the `<user>.github.io` origin).
- **Don't touch `localStorage` directly** in the game code: use `store` (see conventions). The only raw
  accesses are the tiny `theme` / `boot` scripts in `shell.html` and the bulk restore in settings.
- **Don't ship a level that fails `npm run verify`** (unsolvable, wrong par, or a mechanic before its
  chapter).
- **Don't use `history` for the browser history** in the game code: in its scope it's the undo stack.
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
                  hedgesOpen, beetleAt, stateKey, POLLEN / PETALS / SOFT
src/levels.js     LEVELS + CHAPTER_NAMES
src/game/         everything else, in folders (map at the top of core/base.js), joined into one script:
  core/           base.js (store, DOM helpers, the C palette), three.js (renderer, materials, outlines),
                  state, tweens (kill, tween), loop (frame, quality), boot
  audio/          sfx.js (effects), music.js (the generated tune)
  models/         3D objects: garden.js (scenery, batching), visitors.js (ladybug, bird), board.js (tiles,
                  items, disposeTree, buildBoard), snails.js, beetles.js, pollen-soil.js, weather.js,
                  worm-head.js, worm-skin.js (tube material, pattern shader), worm-body.js (updateWorm),
                  hats.js (buildHat), extras.js (buildExtra)
  rewards/        wardrobe.js (HATS, EXTRAS, TINTS), colours.js (WORM_COLS, PATTERNS), badges.js
  play/           worm-life.js (idle acts), moves.js (tryMove, win), photo.js, hints.js, resume.js, hud.js,
                  intro.js (mechanic cards, the worm talks, tutorial), levels.js (startLevel, garden map),
                  camera.js, input.js
  ui/             feedback.js, stickers.js (ART), dialogs.js, layers.js (back button), news.js (NEWS),
                  finale.js, settings.js
  home/           tabs.js, wardrobe.js (the tab), worm.js (home worm, secret reset)
  endless/        generator.js (rng, genCandidate, analyzeCapped, usage, generateEndless), daily.js
  platform/       stats.js, offline.js (service worker, install), reminder.js
src/sw.js         service worker template (version and file list filled in by the build)
public/           manifest, icons, install screenshots: copied as-is into dist/
tools/build.js    builds dist/ and syntax-checks the game script; --debug adds window.__squirm; --out <dir>
tools/game-files.js  the order the src/game/ files are joined in
tools/serve.js    tiny static server (also used by smoke): [dir] --port --base
tools/analyze.js  BFS solver: par, state count, "winnable %" (share of reachable states that can still win)
tools/verify-levels.js  solvable + par + pacing check for src/levels.js
tools/load-generator.js runs src/game/endless/generator.js in Node (curate.js, tests)
tools/curate.js   generates candidate levels with that generator, picks a difficulty spread -> gen/ (ignored)
test/logic.test.js      rules, unique level names, stateKey
test/generator.test.js  daily and endless generation (daily patches must not change)
test/news.test.js       What's new vs package.json version, semver order
test/smoke.js           headless Chromium: boot, win patch 1, saved stars, GPU memory while playing, offline reload
.claude/skills/   add-levels; add-model (look.js: 3D model close-ups); ui-check (shoot.js: UI screenshots)
```

`logic.js` and `levels.js` are plain scripts in the browser and CommonJS modules in Node (a guarded
one-line `module.exports` that the build strips), so the same rules run in the game, the hint solver
and the tools. The `src/game/` files are not modules: `tools/build.js` joins them in `tools/game-files.js`
order inside one function wrapper, so they share one scope and any file can call any other's functions.

### What ships (`dist/`)

- `index.html`: shell + logic + levels + game joined into one page, with the build id (`__BUILD__`:
  version and short git sha) shown in Settings > About.
- `vendor/three.min.js` (UMD) and `fonts/` (Grandstander and Nunito woff2, latin subset), each with its
  licence file.
- `manifest.webmanifest`, `icons/`, `screenshots/` from `public/`.
- `sw.js`: precaches every file above under `squirm-<content hash>`, so each deploy replaces the cache.

All paths are relative, so the site works from any sub-path (it's served from `/squirm/` on Pages).

## Workflows

### Releasing (semver)

Every push that players will notice is a release:
1. Pick the version: minor (`1.8.0` -> `1.9.0`) for anything new, patch (`1.8.1`) for fixes only; major
   only for a big change in how the game plays.
2. `npm version <x.y.z> --no-git-tag-version` (updates `package.json` and the lockfile).
3. Add a `NEWS` entry on top in `src/game/ui/news.js`: that version, today's date, a short title and a few cozy lines.
   Don't append to an older entry: the card only comes back when the top version changes.
   `test/news.test.js` fails if the top entry and `package.json` disagree.
4. `npm run check`, commit and push. Tag the release (`git tag v<x.y.z> && git push origin v<x.y.z>`)
   where your access allows it; the version in `package.json` and `NEWS` is what counts.

Changes players won't notice (tooling, docs, tests) need no release.

### Adding levels

Use the `add-levels` skill. In short: hand-write or `curate` candidates, add them to `src/levels.js`,
set `par` from `npm run analyze`, order them by difficulty, then `npm test`.

### Adding a chapter

A chapter is ten levels plus everything around them. Touch all of these:

1. The levels (`add-levels` skill) and a name appended to `CHAPTER_NAMES`.
2. Its row in the chapter table under "Rules for levels" below.
3. The garden map: one more colour in `SCENE_COL` and a pair of `ART` stickers in `SCENE_DECO` for its scene.
4. Unlockables, at least the chapter's hat (a `HATS` entry with the chapter index, a `buildHat` model, a
   `hat-<id>` sticker) and usually a badge for finishing it (`BADGES`, placed in a `BADGE_GROUPS` group).
   It doesn't have to be one thing per chapter: add what fits the chapter's theme, such as an extra, a worm
   colour (the last one must stay reachable: total stars are `LEVELS.length*3`), a pattern, colour options
   for an item (`TINTS`), or several of them.
5. Be creative about how things unlock. Finishing a chapter or collecting stars is the plain way; better are
   milestones that reward how people play: dozing off, finishing at tea time, coming back on different days,
   starting over, changing outfits, wearing all three pollens in one patch, or a counter tied to the
   chapter's mechanic. Use `progress.stats` counters (`bumpStat`) and write the "how to earn" line as a
   friendly hint. Check that every unlock is reachable, shows its hint while locked, and appears on the win
   card when earned.
6. Build and review every new model with the `add-model` skill, then release it with a `NEWS` entry.

### Adding or changing a 3D model

Use the `add-model` skill for every model (hat, extra, colour option, tile, item, critter, scenery): where it
lives, the coordinates to build against, the house style, and a review loop with
`.claude/skills/add-model/look.js`, which renders wardrobe items from five sides and board pieces from the
patch camera plus close orbits. The rule: take the time to look at it from every side, in light and dark and
in every colour option, and fix it until it looks right. A model that only looks right from the front isn't
finished.

### Adding a mechanic

Touch these, in order:

1. Rules in `src/logic.js`: `advance` / `step` (and `cloneState` if it adds state). `step` must never
   mutate the state it's given (there's a test). Add tests to `test/logic.test.js`.
2. Solver key: `stateKey` in `logic.js`, the one key used by `solveFrom` and `analyzeCapped` in
   `endless/generator.js` and by `tools/analyze.js`. Anything that tells two states apart goes in it; derived state
   (like hedges) doesn't.
3. Rendering in `src/game/models/`: `makeTile` / `makeItem` (`board.js`) or its own file with a sync/update function, `disposeTree` keep lists
   for any new shared geometry, material or texture. A HUD chip only if its state can't be seen on the board.
4. Intro dialog: `MECH` entry (title, text, char regex, `ART` picture; add the sticker to `ART`).
5. Endless mode: `FEATURES`, `genCandidate`, `usage` (how a solution "uses" it), the feature regex in
   `generateEndless`, `FEAT_SHORT`, and the Surprise list. Keep the endless section Node-safe, and only draw
   random numbers for the new feature when it's switched on, so daily patches stay the same (gotchas).
6. `THUMB_COL` for map thumbnails.
7. `tools/verify-levels.js`: both its `M` regex and `introAt` chapter start; `curate.js` if "required"
   needs a stricter check (as snails and soft soil have).
8. The character table, the rule details and the pacing table below. Then its chapter (above).

### UI and CSS changes

- Find the place through the indexes: the folder map at the top of `src/game/core/base.js` (and the Layout
  above) and the section index at the top of the `<style>` in `shell.html` (sections are in cascade order, later ones may override).
- Use the tokens, scales, icon sets and the UI feedback system (conventions below). New animations go
  in the one reduced-motion block (section 11).
- Check it visually with the `ui-check` skill (light and dark, phone size) before committing.

### Seeing the game in a browser

- `npm run build:debug && npm run serve -- --base /squirm/`, then open `http://localhost:8080/squirm/`.
- Headless (Playwright): launch Chromium with `--use-gl=swiftshader --enable-unsafe-swiftshader
  --ignore-gpu-blocklist`, viewport 390x844. `test/smoke.js` is a working example. Software rendering is
  slow: a freshly loaded patch pops in over a few seconds, so wait for `busy()` to be false before a shot.
- Debug hooks (`window.__squirm`, debug build only): `load(i, intro)` opens level index `i` (with its intro
  cards if `intro`), `move('N'|'S'|'E'|'W')`, `busy()` (wait for it to be false between moves), `names()`,
  `dir(x,y)` (screen swipe to grid direction), `mem()` (GPU memory and draw calls), `st()` (worm, status,
  moves as JSON).
- `squirm-tutorial=1` in localStorage skips the first-time swipe tutorial; Playwright's `colorScheme`
  switches light/dark (the theme setting defaults to following the system).

### Screenshots

`public/screenshots/*.png` are the manifest's install screenshots, shipped. They must stay 390x844 to match
`sizes` in `manifest.webmanifest`. `node .claude/skills/ui-check/shoot.js <dir> --scale 1` takes 390x844
shots of every home tab and a patch in light and dark to pick from. The README has no screenshots.

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
| `P` `Y` `U` | pollen flower (poppy, buttercup, bluebell): dusts the worm in that colour |
| `p` `y` `u` | petal gate: the head may enter only while the worm wears the matching pollen |
| `#` | soft soil: the worm burrows under it, so the head may cross its own body there |

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
  (`{i, from, path}`) drives the animation. Beetle positions are in the solver key, sorted so identical
  beetles don't double the state count.
- **Pollen** is `state.pollen` (`''` or `P`/`Y`/`U`, in the solver key). Entering a flower sets it
  (`ev.pollen` when it changes); a petal gate checks it only when the head enters, and gates are never used
  up. Beetles can't be pushed onto flowers or gates, and snails don't go there.
- **Soft soil:** when the head enters a `#` tile it may share it with exactly one body segment, and only one
  at least four behind the head (the neck is index 2 in the new body, so folding back is still blocked).
  Crossing sets `ev.cross`. A worm needs a length of five or more to cross itself at all.

### Rules for levels

- Every level must be **solvable**, and `par` must equal the BFS shortest solution (`npm run verify`).
- **Pacing:** a mechanic may not appear before its chapter (`introAt` in `verify-levels.js`). The first
  level of a chapter that introduces something is a gentle introduction to it.
- **Difficulty** rises inside a chapter. `par * (1 - winnable)` from `tools/analyze.js` is a rough score
  (the "d" curate prints). The last chapters end on the hardest patches in the game.
- Names are unique (tested) and never renamed once shipped.

Chapters (`CHAPTER_NAMES`, ten levels each; level `n` is in chapter `ceil(n/10)`):

| # | Name | Introduces or mixes |
|---|---|---|
| 1 | First sprouts | crawling to the burrow; flags from level 6 |
| 2 | Snack time | fruit (peaches and mushrooms) |
| 3 | Cracked earth | dry patches |
| 4 | Garden gates | keys and gates |
| 5 | Tunnels | tunnels |
| 6 | Rainy days | rain: cloud stones, seedlings, puddles |
| 7 | Riverside | rivers, bridges, cranks |
| 8-10 | Overgrown, Tough patches, Storm season | mixes of the above at rising difficulty |
| 11 | Snail trail | snails |
| 12 | Hedge garden | flower buttons and hedges |
| 13 | Dewy morning | wet leaves |
| 14 | Garden party | mix of snails, flower buttons and wet leaves |
| 15 | Grand bloom | mix of everything so far |
| 16 | Beetle bumps | beetles |
| 17 | Critter crossing | beetles with snails and the early mechanics |
| 18 | Harvest moon | everything, ending very hard |
| 19 | Pollen paths | pollen flowers and petal gates, mixed with earlier mechanics |
| 20 | Soft soil | soft soil, mixed with earlier mechanics |
| 21 | Tangled roots | pollen and soft soil with everything |
| 22 | Far fields | big boards (8-10 wide), a few earlier mechanics each, the hardest in the game |

Each chapter has a hat (`HATS`, by chapter index) and a map scene (`SCENE_COL`, `SCENE_DECO`).

## Key systems in src/game/

Each file starts with a `// ---------- name ----------` divider (some hold several sections); the Layout above
says which file holds what, and a search for a function name finds it fast.

### The board and the worm

- **Scene** (`play/camera.js`): a perspective camera fitted so the board sits between the header and the button row
  (`fitCamera`). It may rotate 90 degrees for wide boards; swipes are mapped through the projected grid
  directions, so controls always match the screen. Lighting is always daytime.
- **Worm body** (`models/worm-body.js`, `worm-skin.js`): a tube rebuilt every frame through segment anchors (`updateWorm`), with tapered radius,
  segment rings and a crawl bulge. Tunnels split the body into chains that dive into the ground; a chain
  that comes out of a tunnel and goes straight back into the same one is drawn as a hairpin, two strands
  side by side, instead of one tube folding back on itself.
- **Head** (`models/worm-head.js`, `play/worm-life.js`): expressions (`applyExpr`), blinking, an idle look-at-camera cycle, reactions, idle acts between
  looks (`startAct`: watch a butterfly, stretch, wiggle), a yawn, and asleep after 25 s.
- **Moves and hints** (`play/moves.js`, `play/hints.js`): `tryMove` queues swipes and animates `step` events; `history` is the undo stack.
  There's no Restart button: a tap on Undo takes back one move, holding it fills a ring (`--hold` on
  `#undoBtn`, `HOLD_WAIT` + `HOLD_MS`) and then calls `restart()`; R still restarts. The hint solver
  `solveFrom` is a capped BFS over `stateKey`.
- **HUD** (`play/hud.js`): `updateHUD` shows the moves meter with par and chips (`hudTile`) only for what isn't visible on
  the board: flags touched, keys held and length vs the burrow. Weather, hedges and pollen show in the
  scene, so they get no chip; keep the row to about four.
- **The worm talks in play** (`play/intro.js`): `wormSays(text,ms)` shows a bubble (`#wormSayG`) that `placeSay` keeps next to
  the head. Snacks, flags, keys, gates and pollen sometimes get a word (`SAY` via `sayFor`: 1 in 4, at most
  every 40 s), while hints and the stuck nudge always speak through it. Rule explanations and blocked moves
  stay as toasts.
- **Meeting a mechanic** (`play/intro.js`): `showIntro(list,done)` pages through one illustrated card per mechanic
  (`renderIntro`, a bobbing `MECH` sticker in a tinted circle, dots, Next / Let's go).

### Board pieces

- **Beetles** (`models/beetles.js`): `makeBeetle` (solid body merged into one mesh; eyes, antennae and legs separate so they
  move), `pushBeetle` (turns to face the worm, scoots along its path with eyes shut), `beetleNope` (shakes
  its head at a blocked push), `updateBeetles` (blinks, watches the worm, scrabbles, looks content on a
  flower). Open hedges pull in from the tile edges so the change reads from above.
- **Pollen and soft soil** (`models/pollen-soil.js`): `makePollenFlower` (cupped bloom, fuzzy dome, floating
  motes in `polItems`), `makePetalGate` (six tall petals closed into a bud; `setPetals(u,o)` folds them
  flat, `syncPetals` opens a gate while the worm wears its colour or lies in it, `petalsNope` shakes it at
  a blocked move), `POLL` / `polMat` for the three colours. The worm's tint: `updatePollen` eases `dustCol` /
  `dustAmt`, `dusty()` blends the tube's vertex colours, and the patch worm's head has its own material
  (`MC.gameHead`) so the home worm never changes; a few motes (`dustG`) drift round the body. Soft soil:
  `makeSoftTile` (a grass tile with a low molehill; `setMound` / `syncSoil` swell it while the worm is in
  the tile, a collar for the head alone), and `updateWorm` sinks every body anchor (never the head) by
  `soilDepth(v)`, so the tube dives under the heap. `syncHedges` calls both syncs.
- **Ambient motion** (`models/board.js`, `models/beetles.js`): river tiles register in `flowTiles` (drifting leaf, glints, ripple, a water-babble
  loop); snails leave a slime strip (`trail`) that grows from tile to tile.

### The garden around the board

- **Scenery batching** (`models/garden.js`): the plants, bushes and trees around the bed are built into a temporary group and
  merged by `batchScenery` into a few chunked meshes (vertex colours, one for outlines). Their sway runs in
  the vertex shader (`windify`, uniforms `windU` / `gustU`, per-vertex `sway`), so the lawn costs a handful
  of draw calls. Critters use the same merge (`merged`).
- **Garden visitors** (`models/visitors.js`): `buildCritters` adds a ladybug on the wooden border and, above the lowest quality,
  a bird on the lawn in front of the bed (placed once the camera is fitted). `birdSpot` only picks spots
  clear of `lawnObstacles` / `treeObstacles` and reachable in a straight line. It bobs when the ambient
  birdsong plays. Animated in `updateCritters`.

### Home (`homeOv`; `home/`, the map in `play/levels.js`)

Five tabs switched by `showTab`. Leaving Play pushes a `tab` layer, so back returns to Play; opening a patch
from a tab replaces that layer with `game`.

- **Play:** the worm with a speech bubble (`say` / `sayHello`, a new line on every tap), Continue with the
  chapter's pips, Daily and Meadow side by side (Meadow grows or resumes a patch in one tap), the closest
  badge (`renderGoal`, which opens it on Badges), and the what's new card.
- **Garden:** the map. `renderLevelList` draws one scene per chapter with its patches as stepping stones on
  a winding SVG path; closed chapters fold into a small card; tapping a stone picks it (`pickPatch`) and
  shows its card with a `drawThumb` preview and the mechanics it uses, and tapping again plays. Above the
  map: stars, a patches-grown bar and the chapter strip (`#chStrip`, one chip per chapter with its hat in a
  progress ring; tapping glides the map to that chapter, and `spyChapter` highlights the one in view).
- **Meadow:** endless setup. A hero card for the chosen difficulty with its description and its own streak,
  best, stars and cleared count (`DIFF_DESC`), a compact difficulty switch, the mechanics mix with All/None
  and Surprise me, and Grow a patch pinned at the bottom.
- **Wardrobe** (ids still `me` / `tabMe`): one grid switched between Hats / Colours / Patterns / Extras
  (`wardTab`), the outfit line, a colour picker for the worn item (below), and Surprise outfit. The home
  worm's canvas moves between Play and Wardrobe; `homeStage(me)` widens it and shows `hBody`, a curled body
  built by `buildHomeBody` (rebuilt on every colour or pattern change), so the outfit shows.
- **Badges:** grouped by `BADGE_GROUPS` with an All / Earned / To find filter and a detail card for the
  tapped badge (`renderBadges`, `renderBadgeDetail`).

### Rewards and the wardrobe (`rewards/`, `models/hats.js`, `models/extras.js`, `home/wardrobe.js`)

- **Badges:** `BADGES` (id, icon, name, description, test) are checked after every win and after moves that
  bump a counter in `progress.stats`; earned ones live in `progress.badges` (with a timestamp, not shown).
  A test written as `counted(()=>[have,need])` also reports progress for the Badges tab. Add new badges to a
  `BADGE_GROUPS` group (ungrouped ones land in the last).
- **Hats:** `HATS` entries are `[id, name, chapter index]` (unlocked by finishing that chapter) or
  `[id, name, -2, how to earn, test]` for milestone hats. Each is built once (`buildHat`) and cloned into
  the head's `hatSlot`.
- **Extras:** `EXTRAS` (`[id, name, how to earn, test]`) work the same way through `buildExtra` into the
  head's `accSlot`, saved in `squirm-extra`. Every hat and extra needs a sticker in `ART` (`hat-<id>` /
  `extra-<id>`).
- **Colour options:** `TINTS` gives some hats and extras five colours. `keys` are the item's `C` materials,
  swapped by `tinted()` when its proto is built (protos are cached per id and option); `art` are the sticker
  hexes `tintArt()` recolours; option 0 is the item's own look. The wardrobe shows a picker row
  (`renderTints`, `#wardTint`) only for the worn item when it has options; choices live in `squirm-tints` by
  item id. Items where a colour makes no sense (sunglasses, monocle, mustaches) have no entry.
- **Worm colours:** `WORM_COLS` (`[name, body, head, stars, cheek]`) unlock with stars. Keep head and body
  the same hex (the toon head and the vertex-coloured body render a hex identically, so any difference shows
  at the neck); the cheek is a blush picked per colour (`cheekMat`).
- **Patterns:** `PATTERNS` (`[id, name, how to earn, test]`), saved in `squirm-pattern`. `colorAt(g,n)` gives
  the tints that run along the body (fade, sunset, rainbow) as tube vertex colours; anything with an edge
  (the body-ring groove, stripes, bands, spots, glitter) is drawn per pixel by `tubeMat`'s shader (`patU` /
  `PAT_ID`) from the tube's `pg` attribute: the place along the worm `g` (one unit per segment, continued
  down the tail tip and through tunnel dives) and the ring direction scaled by the radius, so patterns keep
  their size on the stage and in a patch. `patArt` draws the wardrobe preview in the current colour.
- **Milestones** for unlocks and badges come from `progress.stats` counters (`moves`, `fruit`, `naps`,
  `rains`, `restarts`, `outfits`, `days`, `teatime`, `allPollen`, `burrows`, ...); bump new ones with
  `bumpStat`.

### Modes and screens

- **Endless meadow and daily** (`endless/`): `genCandidate` + `analyzeCapped` + difficulty scoring in `generateEndless`.
  The daily patch (`startDaily`) uses a date seed, `DAILY_OPTS` and a fixed number of tries, so everyone gets
  the same one; it's cached in `squirm-daily-patch` for the day.
- **Win card** (`onWin`, `play/moves.js`): big stars, a line about par or hints, Moves / Par / Time tiles (`New best` tag),
  then `gifts`: rows for what was earned (badges, hats, colours, patterns: `hot`, honey) and progress notes
  (chapter, streaks, next chapter), in a `.fade-scroll`. Next is the big button; Replay, Home and Share sit
  under it. Badges earned by a win only play their jingle; the card lists them.
- **Finale** (`ui/finale.js`): once every patch is cleared (`allCleared`), winning the last one offers "What's next?", which
  opens `finOv` (`showFinale` / `renderFinale`): totals plus choices built from progress (patches below 3
  stars via `shineable`, badges left, the meadow, today's daily). The home Play card turns into "Garden
  grown!" and opens it too, and the map ends with a card about more patches coming.
- **What's new** (`ui/news.js`): `NEWS` (newest first: `[version, date, title, lines]`). Returning players see the newest
  entry once as a card on the Play tab (`renderNews`; `squirm-news` holds the last version seen; new players
  never see it); Settings > About lists them all.
- **Photo mode** (`play/photo.js`): the Photo button in the game's button row (also P), any time in play, via `enterPhoto` /
  `exitPhoto` and a `photo` layer. `photoFrom` remembers where it came from: during play the worm turns to
  the camera and leaving goes back to the patch; after a win the worm peeks out of the burrow and leaving
  reopens the card. The HUD fades out (`body.photo`) and the camera glides to a full-screen framing
  (`glideCamera(photoFrame())`). Free camera (`orbit`: yaw, pitch, distance and a look-at point `t`,
  mirrored in `camLook`): one finger or mouse drag orbits; two fingers pinch to zoom, move together to pan
  and twist to turn; right-drag or Shift-drag pans; the wheel zooms; arrow keys pan. Tilt, distance and the
  look-at point (kept over the bed) are clamped. Reset view (`resetView`, also R) and leaving photo mode
  glide back. `#stage` gets `touch-action:none` in photo mode and Safari's `gesturestart` is cancelled, so
  pinching never zooms the page. `snapPhoto` draws a frame with a caption plaque (from `photoInfo`) and
  shares the PNG where the browser can share files, or downloads it. Keys: Space/Enter snap, P pose, Esc back.
- **Settings and backups** (`ui/settings.js`): the home gear opens `setOv`, one scrolling page (`#setScroll`) of cards with
  sticker headings (`renderSettings`): a stats strip, Sound (music, volume, effects, vibration), Look (theme
  with swatches; Graphics: Auto lets `watchSpeed` adapt, Saver pins the lowest quality, Sharp the highest;
  `squirm-gfx`, device-specific), Reminders, Back up your garden (save code) and About (the anonymous stats
  switch, What's new folded into a `<details>`, the build id). A save code is `SQUIRM1:` + base64 JSON of
  every `squirm-` key except the throwaway ones in `SAVE_SKIP`; restoring replaces those keys and reloads.
  Starting over is only the secret reset: hold the home worm's head for 3 s, which clears every `squirm-` key.
- **Layers and the back button** (`ui/layers.js`): a small layer stack mirrored to `window.history` (`pushLayer` /
  `popLayer` / `swapLayers`). `popLayer`'s `history.go` is async, so use `swapLayers` when replacing a layer
  right after closing another (the finale does this coming from the win dialog).

### Sound, performance and the platform

- **Music and sound** (`audio/`): `sfx(name)` plays synthesized effects. `musicTick` schedules a generated tune (pad,
  bass, melody, echo) a little ahead on the Web Audio clock; its mood follows `todName` (time of day, which
  also brings fireflies in the evening and at night) and rain. `squirm-music` (off by default for new
  players, on for players who already had progress), `squirm-music-vol` (0-1).
- **Performance** (`core/loop.js`): `watchSpeed` lowers `quality` (pixel ratio, shadow map size) when most frames take over
  40 ms (a 30 fps low-power cap doesn't count), raises it one step per session once frames are quick again,
  and remembers it in `squirm-quality`. Behind menus the blurred garden is drawn every third frame only.
  Ground textures use anisotropic filtering. Keep the mobile budget in mind; scenery is the first thing to trim.
- **GPU memory** (`models/board.js`, `core/tweens.js`): `disposeTree` frees a patch's meshes when the next one
  is built, `kill()` frees an effect or board piece when its animation ends (eaten fruit, opened gates,
  sparkles), and `dropSeg` frees the old worm's head (its hat and extra come off first: they share geometry
  with their cached protos). All of them skip the keep lists (`GC`, `MC`, shared geometries, materials and
  textures): add new module-level resources to those lists, and cache an effect's material instead of making
  one per call. The smoke test plays a patch with fruit and a gate to a win twice and fails if geometries or
  textures grow.
- **Fast first paint** (`core/boot.js`, `shell.html`): the home overlay is visible in the markup, and the `boot` script in `shell.html`
  fills in stars, the Continue text and the daily card from `squirm-boot` (written by `renderHome`) before
  three.js loads. `start` shows home first and builds the garden a frame later; the 3D canvases fade in
  (`.ready`) once they've drawn. The `theme` script in `<head>` applies a forced theme before first paint.
- **Offline, install and updates** (`platform/offline.js`): `sw.js` is registered at boot (http/https only) and checked for updates
  when the app returns to the foreground and every 30 minutes. A new worker takes over right away; the page
  reloads into it at a calm moment (immediately on the home screen, otherwise the next time the player heads
  home). The home screen shows an install button on `beforeinstallprompt`.
- **Daily reminder** (`platform/reminder.js`): no server, so no push. Where `PeriodicSyncManager` exists (installed Chrome on
  Android) the page registers periodic sync `squirm-daily`, and `sw.js` shows one notification a day if
  today's daily isn't done and it's past the chosen hour (quiet while the game is on screen). The worker
  reads `{on, hour, done, streak, told}` from the `squirm-state` cache, which the page writes
  (`shareRemindState`) and the worker's cache cleanup skips. Where only `setAppBadge` exists, the icon gets
  a badge instead. Setting: `squirm-remind` (device-specific, in `SAVE_SKIP`).
- **Anonymous stats** (`platform/stats.js`): the one outgoing request: GoatCounter counters via `stat(path)` (a beacon to
  `https://<STATS_CODE>.goatcounter.com/count`), no cookies and nothing personal. Off anywhere but https on a
  real host (so never in tests or local builds); players switch it off in Settings > About (`squirm-stats`,
  device-specific, in `SAVE_SKIP` with `squirm-stats-v`). It sends a visit on boot, `launch/app` or
  `launch/browser`, `version/<x.y.z>` once per version, `install`, and on first clears `clear/<037>`,
  `chapter/<17>`, plus `daily` and `meadow/<difficulty>`. The service worker ignores cross-origin requests,
  so pings never hit the cache. Keep events few, anonymous and aggregate; never add identifiers.

## Conventions

### Code

- Saved data goes through `store`: `get(k)`, `set(k,v)`, `del(k)`, `json(k)` (parsed or `null`),
  `keys()` (all `squirm-` keys). None of them throw, so callers need no try/catch.
- DOM: `$(id)` and `qa(root, sel)` (an array).
- Canvas textures: `canvasTex(w,h,g=>{...},rep)` (`rep` repeats it that many times), not a hand-rolled
  canvas.
- HUD stat tiles: `hudTile(tip,cls,label,value,caption,tap)`, not a new template string.
- 3D: colours from the `C` palette, cached toon materials `m(key)` / `toon(color)`, inverted-hull
  `outline(mesh)`, cached spheres `sph(r)` (radii rounded so the cache stays bounded). Never change a shared
  material's settings (`m(key).side = ...`): every mesh using that key changes with it.
- Pictures: add to `ART` and use `art(name,size)` (see icons).
- New code goes in the matching file under `src/game/`. A new file gets a `// ---------- name ----------`
  divider, a place in `tools/game-files.js`, and a line in the folder map at the top of `core/base.js` and in
  the Layout above. Code that runs as the page loads (a top-level `const`, a list, a call) can only use what
  earlier files in that order define; function declarations are fine anywhere.
- Keep lines readable: break long ones after a statement's `;` (data like stickers and lists may run long).
  `.editorconfig`: 2 spaces, LF, final newline.

### Copy

- Cozy, friendly UI copy, no jargon. Patches, not levels, in player-facing text.

### Styling (`shell.html`)

- UI uses the tokens in section 1 (not the 3D scene, which has its own `C` palette): colours (`--ink`,
  `--ink-soft`, `--paper`, `--paper-2`, `--edge`, `--leaf`, `--berry`, `--honey`, their `-dark` and `--tint-`
  variants, `--soil`, `--deep`, `--lilac`, `--petal`, `--outline`, `--sticker`, `--on-accent`, `--scrim`,
  `--shine`, ...), the top-light gradients `--glaze` (on paper) and `--glaze-accent` (on leaf, honey and
  berry), and the fonts `--fd` (Grandstander, display) and `--fb` (Nunito, body). Need a new colour? Add a
  token, with a dark-mode (and, if needed, more-contrast) value next to the others.
- Inline SVG in markup is coloured with tokens: `style="fill:var(--x);stroke:var(--outline)"`. Stars
  are `--honey` everywhere. Decorative SVGs inside labelled controls get `aria-hidden="true"`.
- Scales: display text 12/14/16/18/21/26/30/52px, body text 11/12/13/14/15/16px, icon glyphs
  16/20/24px; corner radius 10/14/18/22/26px, `999px` for pills, `50%` for circles; borders 2px (small
  inner pieces) or 3px (cards, buttons, tiles); gaps 2/4/6/8/10/12/14/16px.
- Scrolling areas use `.fade-scroll` (every home tab page, the garden map, the badges list; add `.x` for a
  sideways scroller like the chapter strip): content fades out at an edge only while there's more to scroll
  that way, so nothing is cut off sharply. `fadeScroll(el)` wires it up (done at boot for every
  `.fade-scroll` in the markup; call it for ones you create later; it re-measures on scroll, resize, new
  content and when children finish animating); `data-fade` / `data-fade-top` set the size in px. It sets
  `--fade-t` / `--fade-b` on the element: never reuse a token name there, children inherit it.
- `:where(.dialog) p` is a zero-specificity default for dialog paragraphs, so a class on a paragraph
  wins without `!important`. Prefer low-specificity defaults like that over overrides.
- Respect `prefers-reduced-motion`: every animation and transition is listed in the single reduced-motion
  block (section 11), and `reduceMotion` (in `core/base.js`) gates scripted motion.

### Icons

- No emoji or text glyphs in the UI.
- Pictures (badges, hats, extras, settings rows, stats, difficulty, map decorations, mechanic intros and
  Meadow tiles via `MECH[k].i`) come from the `ART` sticker set via `art(name,size)`: a 24-unit grid, pastel
  fills, brown `#5B4436` outline whose width scales with size, stars filled honey. Each object has one
  drawing everywhere, coloured like its 3D model (the mushroom is lilac like the board's; the red one is the
  hat). In `shell.html` write `<span data-art="name" data-size="28"></span>`; `core/boot.js`
  fills it in. Sticker hexes are the one place hard-coded colours are expected (the wardrobe colour swatches
  are drawn the same way).
- Controls (chevrons, back, close, check, HUD buttons) are monoline `currentColor` SVGs from `UI_ICON`
  (class `ui-ic`), stroke rendering about 2.5px.

### UI feedback: one system for every control

- **Motion tokens:** `--dur-fast` (.14s: press, closing), `--dur` (.3s: dialog open, selection pop, page
  slide, shake), `--dur-slow` (.48s: staggered entrances), plus `--ease-pop` (overshoot), `--ease-out`
  and `--ease-in` (exits). No ad-hoc durations.
- **Press:** controls on a ledge (`.btn`, `.round`, `.disc`, `.play`, `.big`, `.set-link`, hats,
  difficulty cards, map stones) sink onto it; flat ones (seg buttons, mechanic tiles, swatches, colour
  swatches, HUD tiles, icon buttons, links, switches) squish to `scale:.94`; tab icons to `.9`. Rules live
  in section 9.
- **Sound and haptics:** a document-level press handler gives every `button` and `[role=button]` one
  `tap` and one light haptic. Don't call `sfx('tap')` or `buzz()` in a click handler. `data-sfx="name"`
  picks a different sound; `data-sfx="none"` when the handler plays its own later (undo, hint, reminder
  switch). If a handler plays any `sfx` or `buzz` during the click, the press adds nothing.
- **Selection** (seg, difficulty, hats, colours, colour swatches, map stones): `tap` + `settle(el)` (the
  `popin` pop). **Toggles** (switches, mechanic tiles, sound and vibration buttons): `sfx('on')` /
  `sfx('off')`. **Blocked** (locked stone, hat or colour, a bad save code, reminders that can't be set):
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

- **The generator runs in Node too:** `tools/load-generator.js` evaluates `src/game/endless/generator.js` with
  logic.js in a sandbox that only has `performance`, `setTimeout`, `console`, a stub `$` and an empty
  `progress`. Don't use other page globals (`store`, `document`, three.js) in that file, or the tests and
  `curate` break.
- **Daily determinism:** `test/generator.test.js` copies `DAILY_OPTS` and the date-seed recipe from
  `startDaily`; change them together. Any change to the endless section that alters output for a seed
  changes everyone's daily patch, so refactors there must produce identical patches, and a new feature may
  only draw random numbers when it's switched on.
- **Debug hooks:** `tools/build.js --debug` inserts `window.__squirm` just before the wrapper it puts round the
  game files closes, and the hooks call `hideAll`, `loadLevel`, `tryMove`, `animating`, `queue`,
  `dirFromScreen`, `renderer` and `state`. Keep those names, or the smoke test loses its hooks.
  (`add-model`'s `look.js` also adds an `ev` hook to its own throwaway build.)
- **Build string surgery:** the build strips the one-line `if(typeof module!=='undefined') ...` export
  from `logic.js` and `levels.js`, replaces the `/*__...__*/` slots and `__BUILD__` in `shell.html`, and
  syntax-checks only the first bare `<script>` (the game). Give any other inline script an attribute
  (`id="theme"`, `id="boot"`), and keep the exports on one line.
- **One solver key:** `stateKey` in `logic.js` feeds the hint solver, the generator and
  `tools/analyze.js` (verify, curate, tests); a new piece of state missing from it makes par and hints wrong.
- **Service worker in dev:** a served build installs `sw.js`, which can serve a stale copy after you
  rebuild. `tools/serve.js` sends `no-cache` and the worker updates itself, but a hard reload or a fresh
  browser context is the quick fix.
- **Storage keys outside the game code:** `squirm-theme` (theme script), `squirm-boot` (boot script) and
  `squirm-state` (a Cache Storage entry the service worker reads) are read by code that can't use `store`.
