# CLAUDE.md

Guide for working on **Squirm**, a cozy turn-based worm puzzle PWA. This file is the single source of
truth for agents; README.md is a short public overview without details that go stale (no counts; its one picture is
`public/share.png`, which `store-shots.js` keeps current). Three project skills cover the recurring workflows (in `.claude/skills/`): `add-levels`,
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
  anonymous stats pings (see "Anonymous stats") and, only while two phones connect for a race, a few public Nostr
  relays and STUN servers (see "Race a friend"); there is no game server. Every 3D model is built in code and every sound is
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
npm install          # three.js r128 + the Baloo 2 Fontsource package (+ playwright for the smoke test)
npm run build        # src/ + public/ -> dist/ (git-ignored)
npm run build:debug  # same, plus window.__squirm hooks for browser automation
npm run serve        # serve dist/ at http://localhost:8080/ (npm run serve -- --port 8081 --base /squirm/)
npm test             # unit tests (test/*.test.js) + verify + build; this is what CI runs
npm run smoke        # debug build served under /squirm/, plays patch 1 in headless Chromium
npm run check        # npm test + smoke: run before pushing
npm run verify       # every level solvable, par correct, pacing respected
npm run analyze      # par, state count, winnable % and a solution for every level
npm run curate -- …  # generate candidate levels (see the add-levels skill)
npm run harden -- …  # make candidate levels harder (tools/harden.js)
npm run shots        # refresh the install screenshots and link preview in public/ (after any visual change)
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
  audio/          sfx.js (effects), music.js (the song engine; haptics and birdsong at its end)
  models/         3D objects: garden.js (scenery, batching), visitors.js (ladybug, bird), board.js (tiles,
                  items, disposeTree, buildBoard), snails.js, beetles.js, pollen-soil.js,
                  digmole.js (dirt mounds, molehills and moles), weather.js,
                  worm-head.js, worm-skin.js (tube material, pattern shader), worm-body.js (updateWorm),
                  hats.js (buildHat), extras.js (buildExtra)
  rewards/        wardrobe.js (HATS, EXTRAS, TINTS), colours.js (WORM_COLS, PATTERNS), badges.js
  play/           worm-life.js (idle acts), moves.js (tryMove, win), photo.js, hints.js, resume.js, hud.js,
                  intro.js (mechanic cards, the worm talks, tutorial), levels.js (startLevel, garden map),
                  camera.js, input.js, race.js (race a friend; joined after platform/)
  ui/             feedback.js, stickers.js (ART), dialogs.js, layers.js (back button), news.js (NEWS),
                  finale.js, settings.js
  home/           tabs.js, wardrobe.js (the tab), worm.js (home worm, secret reset)
  endless/        generator.js (rng, genCandidate, analyzeCapped, usage, generateEndless), daily.js
  platform/       stats.js, offline.js (service worker, install), reminder.js, nostr.js (race meeting point)
src/sw.js         service worker template (version and file list filled in by the build)
public/           manifest, icons (icon.svg is the source art; maskable, Apple and shortcut PNGs), install
                  screenshots, share.png (link preview): copied as-is into dist/
tools/build.js    builds dist/ and syntax-checks the game script; --debug adds window.__squirm; --out <dir>
tools/game-files.js  the order the src/game/ files are joined in
tools/serve.js    tiny static server (also used by smoke): [dir] --port --base
tools/analyze.js  BFS solver: par, state count, "winnable %" (share of reachable states that can still win)
tools/verify-levels.js  solvable + par + pacing check for src/levels.js
tools/load-generator.js runs src/game/endless/generator.js in Node (curate.js, tests)
tools/curate.js   generates candidate levels with that generator, picks a difficulty spread -> gen/ (ignored)
tools/harden.js   hill-climbs candidates to make them harder (big boards come out of the generator easy)
test/logic.test.js      rules, unique level names, stateKey
test/generator.test.js  daily and endless generation (daily patches must not change)
test/news.test.js       What's new vs package.json version, semver order
test/pwa.test.js        manifest icons, shortcuts and screenshots exist at their declared sizes; head links ship
test/nostr.test.js      the race's Schnorr signatures match the BIP-340 test vectors
test/smoke.js           headless Chromium: boot, win patch 1, saved stars, GPU memory while playing, offline reload
.claude/skills/   add-levels; add-model (look.js: 3D model close-ups); ui-check (shoot.js: UI screenshots,
                  store-shots.js: the install screenshots and link preview in public/)
```

`logic.js` and `levels.js` are plain scripts in the browser and CommonJS modules in Node (a guarded
one-line `module.exports` that the build strips), so the same rules run in the game, the hint solver
and the tools. The `src/game/` files are not modules: `tools/build.js` joins them in `tools/game-files.js`
order inside one function wrapper, so they share one scope and any file can call any other's functions.

### What ships (`dist/`)

- `index.html`: shell + logic + levels + game joined into one page, with the build id (`__BUILD__`:
  version and short git sha) shown in Settings > About.
- `vendor/three.min.js` (UMD) and `fonts/` (Baloo 2 woff2 in weights 600, 700 and 800, latin subset), each with
  its licence file.
- `manifest.webmanifest`, `icons/`, `screenshots/`, `share.png` from `public/`.
- `sw.js`: precaches every file above except the screenshots, `share.png` and licence texts (only needed online)
  under `squirm-<content hash>`, so each deploy replaces the cache.

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

**Only gameplay goes in the changelog.** A release (version bump and `NEWS` entry) is for what players play: new
patches, chapters, mechanics, modes, unlockables, gameplay features, and fixes to things they run into. Refactors,
cleanups, tooling, docs, tests and look-and-feel changes such as a font swap ship with neither: players don't need
to hear about them. `test/news.test.js` ties the top `NEWS` entry to `package.json`, so no entry means no bump.

### Adding levels

Use the `add-levels` skill. In short: hand-write or `curate` candidates, add them to `src/levels.js`,
set `par` from `npm run analyze`, order them by difficulty, then `npm test`.

### Adding a chapter

A chapter is ten levels plus everything around them. Touch all of these:

1. The levels (`add-levels` skill) and a name appended to `CHAPTER_NAMES`.
2. Its row in the chapter table under "Rules for levels" below.
3. The garden map: one more colour in `SCENE_COL` and a pair of `ART` stickers in `SCENE_DECO` for its scene.
4. Unlockables: a reward for finishing it and usually a badge for that too (`BADGES`, placed in a `BADGE_GROUPS`
   group). The reward is a hat (a `HATS` entry with the chapter index, a `buildHat` model, a `hat-<id>` sticker), or,
   so it isn't always a hat, an extra or pattern whose test is `byChapter(k)` (`core/base.js`: it marks the item with
   the chapter, so `chapterReward(k)` shows it on the garden map, and reports the chapter's patches as progress).
   Not every reward has to follow the chapter's theme: fun things people want to wear anyway (like the bushy
   mustache) are some of the best. It doesn't have to be one thing per chapter: add what fits, such as an extra, a worm
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
- Then refresh the install screenshots and link preview (`store-shots.js`, see "Screenshots") and commit them too.

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

**Keep them current: whenever a change is visible in the game (UI, fonts, colours, the HUD, a model on the
home or patch screens, the board), run `node .claude/skills/ui-check/store-shots.js`, look at every image, and
commit them with the change.** They're what people see before installing and when the link is shared, so an
outdated one misrepresents the game. The tool renders straight into `public/`:

- `screenshots/{home,game,garden,wardrobe}.png`: 390x844, the manifest's `narrow` shots (sizes must match it).
- `screenshots/{home,game}-wide.png`: 1280x800, `wide`, for the richer desktop install dialog.
- `share.png`: 1200x630, the link preview (`og:image`, `twitter:card` `summary_large_image`).

They aren't precached (only the install dialog and link previews use them, online). `shoot.js` is for checking a
change in light and dark. The README shows `share.png`, so it stays current with it.

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
| `T` | turnaround mushroom (twirl-cap): eaten when the head enters, then the worm turns around (tail becomes head) |
| `D` | dirt mound (sits where soil would be): the head digs in, it turns to grass and the worm comes out one shorter |
| `M` / `N` | molehill: the head can't enter while its mole is up (`M` up after an even number of moves, `N` after an odd one) |

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
- **Turnaround mushrooms:** the head crawls onto `T` as a normal move (the body follows), the mushroom is eaten, then
  `segs` are reversed, so the old tail is the new head; `ev.turn`. A turn ends a wet-leaf slide. Nothing new in the
  solver key (the order of `segs` already is). The game animates the crawl in the old order, then `turnAround`
  (`play/moves.js`) shrinks the head away in a swirl and pops it up at the other end; `stats.turns` counts them.
- **Dirt mounds:** digging needs a worm of three or more (`DIG_MIN`, else blocked `'dig'`); the tile becomes `.`, the worm
  loses its last segment and `ev.dug` is `[x,y]`. Nothing else (beetles, snails) can use a mound. `stats.digs` counts digs.
- **Moles:** `moleUp(t,moves)` is by the move count's parity only, so it joins the solver key (`state.moles`) only on
  boards with moles. The head can't enter an up mole's hill (`'mole'`, `stats.moleBonks` counts the bumps); a body lying
  on a hill is fine, and the mole stays down in its hole while covered. A wet-leaf slide is judged by the move it started on.

### Rules for levels

- Every level must be **solvable**, and `par` must equal the BFS shortest solution (`npm run verify`).
- **Pacing:** a mechanic may not appear before its chapter (`introAt` in `verify-levels.js`). The first
  level of a chapter that introduces something is a gentle introduction to it.
- **Difficulty** rises inside a chapter. `par * (1 - winnable)` from `tools/analyze.js` is a rough score
  (the "d" curate prints). The last chapters end on the hardest patches in the game.
- Names are unique (tested) and never renamed once shipped.
- **Moles need something that shifts the beat.** On a plain grid the head always reaches a given tile after an
  odd or always after an even number of moves, so a mole there is just a wall or just grass. Only a tunnel, a
  wet-leaf slide (one move, several tiles) or a turnaround with an even-length worm changes when the head arrives,
  so every mole patch has one of them. Curate's `moles` check also wants the solution to walk over a mole, which
  generated boards almost never do; adding moles to finished boards and keeping placements where the solution
  crosses a mole and every mole makes it longer works much better. The meadow does the same: `genCandidate` adds a
  tunnel or wet leaves to any try with moles and none of them.

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
| 22 | Far fields | big boards (8-10 wide), a few earlier mechanics each |
| 23 | Moonlit meadow | the biggest boards (10-12 wide), hardened, a few earlier mechanics each |
| 24 | Long way home | the biggest boards, the hardest patches in the game |
| 25 | Twirl-caps | turnaround mushrooms, gently, with a few early mechanics |
| 26 | Topsy-turvy | turnaround mushrooms mixed with the later mechanics, hardened, ending hard |
| 27 | Spring showers | small, easy boards (4-6 wide): rain and rivers again, gently re-introduced, a few flags and fruit |
| 28 | Old orchard | big boards (9-11 wide) with keys, gates, tunnels and dry patches, hardened, ending very hard |
| 29 | Digging in | dirt mounds, small easy boards (4-7 wide) with a few flags and fruit: digging costs a segment, the burrow sign cares |
| 30 | Molehill lane | moles, easy to medium (5-7 wide), with wet leaves, tunnels or fruit to shift the beat |
| 31 | Under the lawn | dirt mounds and moles together, with tunnels and keys and gates, medium |
| 32 | Muddy boots | digging with rain, rivers and bridges, dry patches or beetles, medium-hard |
| 33 | Mole patrol | moles with snails, flower buttons and hedges or pollen (and wet leaves to shift the beat), hard |
| 34 | Deep roots | big boards (9-11 wide) with dirt mounds and moles and a few earlier mechanics each, hardened, very hard |
| 35 | Picnic in the rain | from here on every patch needs three or more mechanics at once: rain with fruit and turnaround mushrooms or snails, gentle to medium |
| 36 | Busy bees | pollen and petal gates, flower buttons and hedges, beetles (a beetle parked on a flower holds the hedges open), medium |
| 37 | Secret passages | tunnels, keys and gates, dirt mounds and moles in every patch (tunnels shift the moles' beat), hardened, medium-hard |
| 38 | Slip and tumble | wet leaves, beetles, dry patches and soft soil, all four in every patch, hardened, hard |
| 39 | Everything blooms | big boards (8-10 wide) with four or more mechanics each, hardened, ending on the hardest patches in the game |

Each chapter has a reward (`chapterReward(k)`: its hat in `HATS` by chapter index, or an extra or pattern unlocked with
`byChapter(k)`) and a map scene (`SCENE_COL`, `SCENE_DECO`).

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
  looks (`startAct`: watch a butterfly, stretch, wiggle), a yawn, and asleep after 25 s. The idle clock (`lastMoveT`) only
  runs while the patch is on screen (`frame` holds it while any overlay, home included, is up), so naps and yawns never
  happen, or count, behind a menu.
- **Moves and hints** (`play/moves.js`, `play/hints.js`): `tryMove` queues swipes and animates `step` events; `history` is the undo stack.
  There's no Restart button: a tap on Undo takes back one move, holding it fills a ring (`--hold` on
  `#undoBtn`, `HOLD_WAIT` + `HOLD_MS`) and then calls `restart()`; R still restarts. The hint solver
  `solveFrom` is a capped BFS over `stateKey`.
- **Hint seeds** (`play/hints.js`): garden and daily hints cost one seed from the pouch (`progress.seeds`, at most
  `SEED_MAX` 9; new players start with 3). `hintFree()`: the first chapter and the meadow are free, but a hinted
  meadow patch earns nothing. `onWin` fills the pouch with `addSeeds`: the daily +2 (+1 if hinted, +1 more every
  7th streak day), a meadow patch +1 (hard +2), +1 for the first meadow patch of the day (`progress.meadowDay`).
  Asking again for the same position is free. An empty pouch opens `seedOv` (`openSeeds`), which sends the player
  to the daily or the meadow; the garden patch keeps its own resume slot. The count shows on the hint button
  (`#seedN`, `renderSeeds` from `updateHUD`), the seeds half of the home pill (`#homeSeeds`; tap: `seedInfo`, the same dialog as an
  explainer) and chips on the Daily and Meadow cards. `stats.seedsGot` counts seeds grown; 30 unlock the `idea` hat.
- **HUD** (`play/hud.js`): `updateHUD` shows the moves meter with par and chips (`hudTile`) only for what isn't visible on
  the board: flags touched, keys held and length vs the burrow. Weather, hedges and pollen show in the
  scene, so they get no chip; keep the row to about four.
- **The worm talks in play** (`play/intro.js`): `wormSays(text,ms)` shows a bubble (`#wormSayG`) that `placeSay` keeps next to
  the head. Snacks, flags, keys, gates and pollen sometimes get a word (`SAY` via `sayFor`: 1 in 4, at most
  every 40 s), while hints and the stuck nudge always speak through it. Rule explanations and blocked moves
  stay as toasts.
- **Meeting a mechanic** (`play/intro.js`): `showIntro(list,done)` pages through one illustrated card per mechanic
  (`renderIntro`, dots, Next / Let's go). Its picture is the real board pieces (`MECH_PIECES`), slowly turning with no
  tile behind them: `spinBuild` makes a little scene (borrowing `makeTile` / `makeItem` and undoing their `flowTiles` /
  `polItems` entries), and `spinTick` (from `frame`, up to 30 fps, still under reduced motion) renders it into a render
  target and copies the pixels to the card's `#introSpin` canvas, flipped by CSS; it frees itself once the card closes.
  If the pieces can't be built, the `MECH` sticker shows in a tile instead.

### Board pieces

- **Beetles** (`models/beetles.js`): `makeBeetle` (solid body merged into one mesh; eyes, antennae and legs separate so they
  move), `pushBeetle` (turns to face the worm, scoots along its path with eyes shut), `beetleNope` (shakes
  its head at a blocked push), `updateBeetles` (blinks, watches the worm, scrabbles, looks content on a
  flower). Open hedges pull in from the tile edges so the change reads from above.
- **Pollen and soft soil** (`models/pollen-soil.js`): `makePollenFlower` (each colour its own bloom: four-petal poppy, cupped buttercup, starry bluebell; floating
  motes in `polItems`), `makePetalGate` (a bud with that colour's petal count; `setPetals(u,o)` folds them
  flat, `syncPetals` opens a gate while the worm wears its colour or lies in it, `petalsNope` shakes it at
  a blocked move), `POLL` / `polMat` for the three colours. The worm's tint: `updatePollen` eases `dustCol` /
  `dustAmt`, `dusty()` blends the tube's vertex colours, and the patch worm's head has its own material
  (`MC.gameHead`) so the home worm never changes; a few motes (`dustG`) drift round the body. Soft soil:
  `makeSoftTile` (a grass tile with a low molehill; `setMound` / `syncSoil` swell it while the worm is in
  the tile, a collar for the head alone), and `updateWorm` sinks every body anchor (never the head) by
  `soilDepth(v)`, so the tube dives under the heap. `syncHedges` calls both syncs.
- **Dirt mounds and moles** (`models/digmole.js`): `makeDirtTile` (a lumpy heap rising out of the bed's soil, crumbs,
  pebbles, a root and a trowel, merged into one mesh), `digOut` (from `syncBoard` on `D` to `.`: the heap crumbles with a
  dust puff while a grass tile springs up; the worm's shrink is `animateMove`'s), `digNope` (the heap shrugs). Molehills
  are holed tiles (like the burrow) with `makeMoleHill`'s heap and a mole (`makeMole`: velvety body, pink snout, nose and
  paws, bead eyes) registered in `moleItems`. `syncMoles` (from `syncHedges`) sets each mole's target from the state
  (`moleWant`: up, down, or deeper while the worm covers the hill), snapping on load, undo and restart; `updateMoles`
  (from `frame`) springs it there, turns it to the camera and a little toward the worm, sniffs and blinks; `moleNope`
  shakes its head and blows a raspberry at a blocked move.
- **Ambient motion** (`models/board.js`, `models/beetles.js`): river tiles register in `flowTiles` (drifting leaf, glints, ripple, a water-babble
  loop); snails leave a slime strip (`trail`) that grows from tile to tile.

### The garden around the board

- **Scenery batching** (`models/garden.js`): the plants, bushes and trees around the bed are built into a temporary group and
  merged by `batchScenery` into a few chunked meshes (vertex colours, one for outlines). Their sway runs in
  the vertex shader (`windify`, uniforms `windU` / `gustU`, per-vertex `sway`), so the lawn costs a handful
  of draw calls. Lawn chunks are 6 units wide; the optional `ground` argument darkens vertices near the lawn so
  plants look rooted (garden and trees, not critters). Lawn pieces (flower drifts, mossy stones, tufts) keep room
  round each other and register in `lawnObstacles`. Rain also drops rings on the lawn (one instanced mesh, kept),
  and fireflies hover in a ring just outside the bed. Critters use the same merge (`merged`).
- **Garden visitors** (`models/visitors.js`): `buildCritters` adds a ladybug on the wooden border and, above the lowest quality,
  a bird on the lawn in front of the bed (placed once the camera is fitted). `birdSpot` only picks spots
  clear of `lawnObstacles` / `treeObstacles` and of the bed with its border (`bedBox`), reachable in a straight line,
  so a hop never crosses the board. The two butterflies each fly their own loop (speed, shape, direction, height). It bobs when the ambient
  birdsong plays. Animated in `updateCritters`.

### Home (`homeOv`; `home/`, the map in `play/levels.js`)

Behind it is only the garden: `homeBackdrop` (`play/levels.js`) builds `HOME_DEF` (`L.home`), a clearing on the lawn
with no bed, border, board or worm (`buildGarden` and `buildCritters` skip the bed pieces and the ladybug), at boot and
whenever `showHome` runs (`frame` keeps the worm, board and effects hidden while `L.home`, even if a finishing animation
turns them back on); a patch is built only when one is played, and the resume slot keeps play in between.
Five tabs switched by `showTab`; on screens 600px and wider the tab bar floats as a card the width of the content
column. Dialogs are at most 720px tall (they scroll inside). Above them, stars and hint seeds share one pill (`.home-pills`, two buttons with a
line between): the seeds half opens `seedInfo`, the stars half `gardenInfo` (`garOv`, layer `gar`, in `ui/finale.js`):
one grid of tiles: the totals (stars, patches, badges and hats, each out of the most there are), then every counter in
`GAR_STATS`. Add a row there when you add a new counter. Leaving Play pushes a `tab` layer, so back returns to Play; opening a patch
from a tab replaces that layer with `game`.

- **Play:** the worm with a speech bubble that speaks now and then and fades after a few seconds (`say`): `sayHello`
  greets on the first visit and only sometimes later, a tap says something about one time in three, and four quick
  taps start the poking jokes (`sayTap`, `SAY_SPAM`). Continue with the chapter's pips, Daily (its week as dots
  with weekday letters, the same look as the pips: filled done, ring today) and Meadow (a chip with the difficulty
  it grows) side by side (Meadow grows or resumes a patch in one tap), the closest
  badge (`renderGoal`: its name as the title, what earns it below and a bar when it counts up; opens it on Badges),
  and the what's new card.
- **Garden:** the map. `renderLevelList` draws one scene per chapter with its patches as stepping stones on
  a winding SVG path; closed chapters fold into a small card; tapping a stone picks it (`pickPatch`) and
  shows its card with a `drawThumb` preview and the mechanics it uses, and tapping again plays. Above the
  map: the title with the Shine button beside it, and the chapter strip (`#chStrip`, one chip per chapter with its reward in a
  progress ring (`chapterReward`: the hat, extra or pattern finishing it earns; a chapter without one shows a sprout, and its
  banner says "Reward: ..." or "... earned" the same way); tapping glides the map to that chapter, and `spyChapter` highlights the one in view). Once a chapter
  is fully grown its ring fills with stars instead (gold when all 30), and a honey badge counts its patches below 3
  stars (`shineable`). The Shine button (`#shineBtn`) picks the next of those from the chapter in view, and a
  picked patch's card says what 3 stars needs (par, or no hint).
- **Meadow:** endless setup. A hero card for the chosen difficulty with its description and its own streak,
  best, stars and cleared count (`DIFF_DESC`), a compact difficulty switch, the mechanics mix with All/None
  and Surprise me, and Grow a patch pinned at the bottom.
- **Wardrobe** (ids still `me` / `tabMe`): one list switched between Hats / Colours / Patterns / Extras
  (`wardTab`), a button row per item (all the same height) like the badge cards (`tile`: picture in a tile, tinted once owned, cream and faded with
  a lock until then; while locked, how to earn it and a bar from `testProg` / `chapterProg` / stars where it counts up), a colour picker for the worn item (below), and Surprise me. The home
  worm's canvas moves between Play and Wardrobe; `homeStage(me)` widens it and shows `hBody`, a curled body
  built by `buildHomeBody` (rebuilt on every colour or pattern change), so the outfit shows.
- **Badges:** grouped by `BADGE_GROUPS` with an All / Earned / To find filter, hidden until a badge is earned (Earned is one list, newest first, by the
  time stored in `progress.badges`), one card per badge (`badgeCard`: medal, name,
  what earns it, and Earned or a bar with the count) in a list (`renderBadges`). `badgeSel` set before opening the tab
  (the home badge card) scrolls that badge's card into view and pops it.

### Rewards and the wardrobe (`rewards/`, `models/hats.js`, `models/extras.js`, `home/wardrobe.js`)

- **Badges:** `BADGES` (id, icon, name, description, test) are checked after every win and after moves that
  bump a counter in `progress.stats`; earned ones live in `progress.badges` (with a timestamp, not shown).
  A test written as `counted(()=>[have,need])` (in `core/base.js`) also reports progress, for the Badges tab and, on
  milestone hats, extras and patterns written the same way, the wardrobe rows. Add new badges to a
  `BADGE_GROUPS` group (ungrouped ones land in the last).
- **Hats:** `HATS` entries are `[id, name, chapter index]` (unlocked by finishing that chapter) or
  `[id, name, -2, how to earn, test]` for milestone hats. Each is built once (`buildHat`) and cloned into
  the head's `hatSlot`. `hBake` merges a hat into one mesh per material, except parts marked to move.
- **Extras:** `EXTRAS` (`[id, name, how to earn, test]`) work the same way through `buildExtra` into the
  head's `accSlot`, saved in `squirm-extra`. An extra (or pattern) that a chapter earns uses `byChapter(k)` as its test. Every hat and extra needs a sticker in `ART` (`hat-<id>` /
  `extra-<id>`).
- **Wear motion** (end of `models/extras.js`): a few items have a part that moves (pinwheel, butterfly, firefly,
  bee antennae, lightbulb, weathervane, teacup steam, rain cloud, sprout, the flowerpot's seedling, the mole friend's bob,
  the propeller, the bubble-gum bubble, star earrings). Put `userData.anim` on the part
  (swing `r`, sway `p`, scale pulse `s`, `spin` with gusts, `drip`; the comment there lists them); `hBake` keeps it
  as its own child, `dressHat` / `dressExtra` register worn clones with `wearAdd`, and `wearTick` (from `frame`)
  moves them round their rest pose. Reduced motion keeps them still. Keep it to items where motion fits.
- **Colour options:** `TINTS` gives some hats and extras five colours. `keys` are the item's `C` materials,
  swapped by `tinted()` when its proto is built (protos are cached per id and option); `art` are the sticker
  hexes `tintArt()` recolours; option 0 is the item's own look. The wardrobe shows a picker row
  (`renderTints`, `#wardTint`) only for the worn item when it has options; choices live in `squirm-tints` by
  item id. Items where a colour makes no sense (sunglasses, monocle, mustaches) have no entry.
- **Worm colours:** `WORM_COLS` (`[name, body, head, stars, cheek]`) unlock with stars. Keep head and body
  the same hex (the toon head and the vertex-coloured body render a hex identically, so any difference shows
  at the neck); the cheek is a blush picked per colour (`cheekMat`).
- **Patterns:** `PATTERNS` (`[id, name, how to earn, test]`), saved in `squirm-pattern`. `colorAt(g,n)` gives
  the tints that run along the body (fade, sunset, rainbow, two-tone, muddy tail) as tube vertex colours; anything with an edge
  (the body-ring groove, stripes, bands, spots, glitter) is drawn per pixel by `tubeMat`'s shader (`patU` /
  `PAT_ID`) from the tube's `pg` attribute: the place along the worm `g` (one unit per segment, continued
  down the tail tip and through tunnel dives) and the ring direction scaled by the radius, so patterns keep
  their size on the stage and in a patch. Shimmer, Glow worm and Prism move: the shader reads `uT` (`patT`, set
  from `idleT` in `frame`, held still under reduced motion). `patArt` draws the wardrobe preview in the current colour.
- **Milestones** for unlocks and badges come from `progress.stats` counters (`moves`, `fruit`, `naps`,
  `rains`, `restarts`, `outfits`, `days`, `teatime`, `allPollen`, `burrows`, `digs`, `moleBonks`, ...); bump new ones with
  `bumpStat`. A few keep a best instead of a count: `pokeRun` (the longest run of quick taps on the worm in a
  patch, `wormEmote`), `slideMax`.

### Modes and screens

- **Endless meadow and daily** (`endless/`): `genCandidate` + `analyzeCapped` + difficulty scoring in `generateEndless`.
  A board only fits a few mechanics, so with more switched on than `fit` (3 easy, 4 medium, 5 hard) each try takes a
  random handful of them (`pickSome`; only then are extra random numbers drawn, so the daily stays the same).
  The daily patch (`startDaily`) uses a date seed, `DAILY_OPTS` and a fixed number of tries, so everyone gets
  the same one; it's cached in `squirm-daily-patch` for the day.
- **Win card** (`onWin`, `play/moves.js`): big stars, a line about par or hints, Moves / Par / Time tiles (`New best` tag),
  then `gifts`: rows for what was earned (badges, hats, extras, colours, patterns, hint seeds: `hot`, honey; new hats and
  extras are compared with `wardSnap` taken in `startLevel`, so one a move earned on the way, like the 50th gate, shows too) and progress notes
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
- **Settings and backups** (`ui/settings.js`): the home gear opens `setOv` (choice rows are one word each, no second line), one scrolling page (`#setScroll`) of cards with
  sticker headings (`renderSettings`): Sound (music, volume, effects, vibration), Look (theme
  with swatches; Graphics: Auto lets `watchSpeed` adapt, Saver pins the lowest quality, Sharp the highest;
  `squirm-gfx`, device-specific), Comfort, Reminders, Back up your garden (save code), About (the anonymous stats switch, the build id) and
  What's new last, a card that folds open on its own heading (`details.set-acc`). Each heading's sticker sits in a
  tinted tile with the card edge, like the home cards' icons (`--tint` on the span). A save code is `SQUIRM1:` + base64 JSON of
  every `squirm-` key except the throwaway ones in `SAVE_SKIP`; restoring replaces those keys and reloads.
  Starting over is only the secret reset: hold the home worm's head for 3 s, which clears every `squirm-` key.
- **Comfort** (Settings, `core/base.js`): three device-specific switches. Calm motion (`calmMotion`, `squirm-calm`) sets
  `reduceMotion` like the system setting and adds `body.calm`, which gets a copy of the CSS reduced-motion block made at
  boot (`calmCSS` in `core/boot.js`), so that block stays the one list. Bigger text (`squirm-bigtext`, `body.big-text`)
  zooms the app column and dialogs by 1.12 (not the HUD stat row). Colour helpers (`colourMarks`, `squirm-marks`): a
  shape per pollen colour (circle poppy, triangle buttercup, square bluebell) on a sprite over every flower and petal
  gate (`addMark`, `syncMarks`, `ART.mark*`) and a Pollen chip in the HUD showing the worn one.
- **Race a friend** (`play/race.js`, `platform/nostr.js`, `raceOv`, the home `#raceBtn`, the `?play=race` shortcut): two
  phones race on one patch, connected straight to each other over a WebRTC data channel with no server of our own.
  The host gets a six-character room code (`raceNewCode`, letters and digits that can't be mixed up) and an invite
  link (`GAME_URL#race=<code>`, read at boot and from `launchQueue`); the friend opens the link or types the code
  (Join with a code). Both phones meet on a few public Nostr relays (`NOSTR_RELAYS`, `nostrRoom`): ephemeral events
  (kind 25050, never stored) tagged with a topic hashed from the code and AES-GCM encrypted with a key from the code,
  signed with a throwaway secp256k1 Schnorr key (BIP-340 in BigInt, `schnorrSign`, checked by `test/nostr.test.js`).
  Through them the friend knocks (`join`, every 3 s), the host answers with a WebRTC offer, and the friend replies
  with an answer (repeated until connected); then the relays are closed. Public STUN servers (`RACE_ICE`) help across
  networks; some strict mobile networks still can't connect (`raceFail`, suggesting the same Wi-Fi or a hotspot), and
  no relay answering or no host for 30 s fails kindly too. Data-channel messages: `hi`, `look`, `start` (the host
  grows the patch with `generateEndless(diff, RACE_OPTS)` and sends it whole), `mv`, `won`, `again`, `bye`.
  One dialog walks the steps (`raceStep`: start, just Start a race and Join with a code; room, the big code (tap it to copy,
  `raceCopy`) with the patch size toggle (`raceDiffMark`; the code doesn't depend on it) and Back to start; join, with Back to start; link, grow, count, fail,
  with Cancel or Close). Start has no cancel button: tapping outside or Back closes it. The race is mode `race`: no hints (the button is hidden), no resume slot, no meadow or garden progress, its
  own clock from "Go" (`raceSecs`, so a restart doesn't reset it), a race row under the HUD (`#raceBar`: the friend's
  moves or status and the race clock; `raceBar`, `raceClockTick`; `raceTick` sends our move count), a "Leave the race?"
  check (`leaveOv`) on Home, back or Esc while the race is still on (`raceLive`, `raceAskLeave`), and `onWin` hands over to `raceWin` / `raceResult` (who got home first, both moves, Rematch
  once both ask, the host grows the next round, and the session's totals for both sides: `raceSettle` counts a round
  once both are home or the friend left, into `race.tally` (rounds, wins, stars, total time), shown by `raceTallyHTML` in
  `#raceTally`; `won` carries our stars). A race win checks badges and lists new badges, hats and extras like `onWin`. Leaving (home, back, closing) sends `bye`; the friend sees "wandered
  off" and keeps
  playing. `stats.races` counts finished rounds, `stats.raceWins` wins and `stats.rematches` rematch rounds (the racing
  badges, the `racer` helmet and the `medal` extra). The friend's ghost: on connect each phone sends `look` (`myLook`: colour,
  pattern, hat and extra with their colour options), and every `mv` carries our segments, so `raceGhostBuild` makes a
  see-through worm in their outfit (`makeSeg` plus their hat and extra protos, `tinted` with their option; see-through
  copies of each material cached in `MC` by `ghostMat`) and `raceGhostTick` (from `frame`) eases it after their moves,
  snapping on tunnels and turnarounds; its body tapers to a tail tip, and its see-through materials still write depth so
  its own far side and outline shell stay hidden. Gradient patterns show on it; shader patterns (stripes, spots...) don't.
  `raceGhostDrop` frees it when the friend finishes or leaves and when the race ends. An eye button in the race row hides
  or shows it (`ghostShown`, remembered in `squirm-race-ghost`, shown by default).
- **Layers and the back button** (`ui/layers.js`): a small layer stack mirrored to `window.history` (`pushLayer` /
  `popLayer` / `swapLayers`). `popLayer`'s `history.go` is async, so use `swapLayers` when replacing a layer
  right after closing another (the finale does this coming from the win dialog).

### Sound, performance and the platform

- **Music and sound** (`audio/`): `sfx(name)` plays synthesized effects (`sfx.js`; haptics and birdsong sit at the end
  of `music.js`). Every effect can carry a vibration rhythm in `HAPTIC` (ms on, off, ...; one distinct pattern per
  event, ambient sounds none), played by `buzz` at the player's strength (`hapticLvl`: Off / Gentle / Full,
  `squirm-haptics`; Gentle shortens the pulses); iOS, which has no `navigator.vibrate`, gets one switch tick per pulse
  on the pattern's own timing. The music is little songs composed on the fly: `musicTick` calls `musicSchedule`, which plans
  notes a bar at a time a little ahead on the Web Audio clock. Each patch has its own song (`makeSong`, seeded by
  `songKey()`: the patch name or meadow seed, so a replay brings its tune back); home plays the hand-written
  `THEME`. A song is 16 bars, A A B A', over seventh-chord `PROGS`, its melody a motif (`RHY` rhythm + steps)
  that repeats and varies with strong beats snapped to chord tones (`melodyBar`). Instruments are synthesized
  (kalimba, FM electric piano, music box, a filtered saw pad, plucked bass, soft kick, rim, brush, shaker) into
  layer gains (`mLayer`) that `musicWants()` fades in as a patch goes on: pad and melody, bass after a few
  moves, arpeggio, drums past about half of par, a sparkle once the burrow is ready; a dozing worm thins it to
  a lullaby. `MOODS` by `todName` (time of day, which also brings fireflies in the evening and at night) pick
  tempo, lead and drums; rain slows and darkens it. `MIX` balances the layers; a glue compressor and a trim
  (keep the level matched to the sound effects) feed `master`, plus a generated reverb. `mForce` pins mood,
  rain, song and layers for offline renders. `squirm-music` (off by default for new
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
  three.js loads. `start` shows home first and builds the home backdrop a frame later; the 3D canvases fade in
  (`.ready`) once they've drawn. The `theme` script in `<head>` applies a forced theme before first paint.
- **Offline, install and updates** (`platform/offline.js`): `sw.js` is registered at boot (http/https only) and checked for updates
  when the app returns to the foreground and every 30 minutes. A new worker takes over right away; the page
  reloads into it at a calm moment (immediately on the home screen, otherwise the next time the player heads
  home), with a toast that an update is waiting. On `beforeinstallprompt` the Play tab shows an install card under Play (`#installCard`); closing it
  (`squirm-install-hide`, device-specific) moves the offer to a small header button (`#installBtn`, `installShow`).
  Launch links: `?play=continue|daily|meadow|race` (the manifest's four shortcuts, the daily reminder) go through
  `launchPlay` in `core/boot.js`, at boot and, since `launch_handler` reuses an open window, from `launchQueue`.
  The manifest asks for portrait (`orientation`).
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
  `chapter/<17>`, plus `daily`, `meadow/<difficulty>` and `seeds/empty` (the hint-seed pouch ran out), `start/new` (a
  new device, once), `days/<N>` (played on 2, 3, 7, 14, 30, 60 different days), `quit/<037>` (a never-cleared garden patch
  left after 3+ moves without winning, once per patch per session: `noteQuit` from `loadLevel`, `showHome` and
  `pagehide`) and `hint/<NN>` / `hint/daily` / `hint/meadow` per new hint (`noteHint`), `race/start` (the host's
  phone, once connected) and `race/won`. Funnels and retention come from
  these once-per-device milestones (compare counts), never from an id. The service worker ignores cross-origin requests,
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
  berry), and the fonts `--fd` (display) and `--fb` (body), both Baloo 2 for now; keep using the two tokens so they can
  differ again. Canvas text (burrow signs, the sleepy z, photo captions) names `"Baloo 2"` directly. Need a new colour? Add a
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
- One shape for icon tiles: a sticker standing for a thing, mode or feature sits in a rounded square (cream
  `--sticker` fill and `--sticker-edge` border, or a `--tint-` fill for mode tiles), its corner radius stepping with
  size: 10px under 30px (`.ic`), 14px around 40 (`.set-ico`, `.mech .mi`, `.ch-banner .emb`, `.gift .gi`, stat tiles),
  18px at 52 (`.mode-ico`), 22px around 70-85 (`.m-em`, `.fin-emb`, `.seed-art`), 26px for the intro card's big tile.
  Badge icons (`.b-medal`) are such tiles too: earned ones take turns through the tints (`badgeTint`), the rest cream and faded.
  Circles only where the shape means something: the chapter progress rings, round buttons.
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
- **Dialogs:** every `.ov` scrim fades in while its `.dialog` pops. A dialog whose content can run long is a `.dlg`: its
  content sits in a scrolling `.dlg-body` and its button row stays at the bottom (the win card, settings and mechanic
  intro scroll their own middle the same way). A tap on the scrim closes the dialog the way Back
  would (`OV_LAYER` in `ui/dialogs.js` maps each closable one to its layer; not the win card, the growing dialog or a
  race that's growing or counting down). `hide()` adds `.out` for a short
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
