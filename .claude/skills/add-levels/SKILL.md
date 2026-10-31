---
name: add-levels
description: Add or retune handmade Squirm patches in src/levels.js - generate candidates with tools/curate.js, place them by pacing and difficulty, set par from the solver, and verify. Use when adding levels, starting a new chapter, or changing an existing level's map.
---

# Adding levels

The rules (solvable, `par` = BFS shortest, pacing by chapter, rising difficulty, unique names that are
never renamed) and the character table are in CLAUDE.md under "Level format". This is the procedure.

1. **Decide the slot.** Level `n` (1-based) is in chapter `ceil(n/10)`. Check which mechanics that
   chapter may use (pacing rule) and what its first level introduces. A chapter's first level is a gentle
   introduction.

2. **Get candidates.** Hand-write them, or generate with the in-game generator:

   ```
   LO=.5 HI=.95 node tools/curate.js ch12 '{"flags":true,"snails":true}' snails medium 5 1401 90
   #   <tag> <allowed features JSON> <required feature(s) joined with +, or none> <easy,medium,hard> <count> <seed> <seconds>
   ```

   Feature keys: `flags fruit dry keys portals rain rivers snails buttons leaves beetles`. Output goes to
   `gen/gen_<tag>.json` (git-ignored): entries with `d` (difficulty score), `par`, `win` (winnable %),
   `exitLen`, `worm`, `map`, `diff`. `LO`/`HI` pick from that slice of the pool sorted by difficulty. With
   `snails` required, a candidate is kept only if removing its snails shortens the solution. Generated
   maps always start dry (`rain:false`); try other seeds or a longer time if the pool is small.

3. **Add entries** to `LEVELS` in `src/levels.js`, matching the existing style:

   ```js
    { name:"Shell Corner", hint:"", par:18,
      exitLen:3, worm:[[2,0],[1,0],[0,0]],
      map:[
       ".Cv   ",
       "E.. . " ]},
   ```

   Give each a new, unique, cozy name (check with grep; progress is keyed by name). Keep `hint` short and
   friendly, or empty. A new chapter needs a name appended to `CHAPTER_NAMES`, a hat in `HATS` in
   `src/game.js` (with its `buildHat` model and a `hat-<id>` sticker in `ART`), and a row in README's
   chapter table. Totals that mention 210 patches or 21 chapters (README, manifest, package.json,
   the `<meta>` description in `shell.html`) need updating too.

4. **Set par and check difficulty.** `npm run analyze` prints `index name par … states … winnable …%
   solution` per level. Copy the par. Difficulty score is `par * (1 - winnable/100)`; inside a chapter it
   should rise, so reorder if needed. To analyze only the candidates, write them to a scratch module
   (`module.exports=[...]`) and pass its path: `node tools/analyze.js /path/to/candidates.js`.

5. **Verify.** `npm test` (unit tests incl. unique names, `verify`, build). Fix every `UNSOLVABLE`,
   `PAR` or `TOO EARLY` line. Optionally play the new patches: `npm run build:debug && npm run serve`, then
   `window.__squirm.load(i)` with the 0-based index (see the ui-check skill for screenshots).
