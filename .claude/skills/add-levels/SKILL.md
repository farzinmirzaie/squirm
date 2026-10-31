---
name: add-levels
description: Add or retune handmade Squirm patches in src/levels.js - generate candidates with tools/curate.js, place them by pacing and difficulty, set par from the solver, and verify. Use when adding levels, starting a new chapter, or changing an existing level's map.
---

# Adding levels

The rules (solvable, `par` = BFS shortest, pacing by chapter, rising difficulty, unique names that are
never renamed), the character table and the chapter table are in CLAUDE.md under "Level format". This is
the procedure. For a whole new chapter, also follow CLAUDE.md's "Adding a chapter" checklist (map scene,
hat, unlockables, model review).

1. **Decide the slot.** Level `n` (1-based) is in chapter `ceil(n/10)`. Check which mechanics that
   chapter may use (the pacing table) and what its first level introduces. A chapter's first level is a
   gentle introduction; hand-writing it is often clearer than a generated one.

2. **Get candidates.** Hand-write them, or generate with the in-game generator:

   ```
   LO=.5 HI=.95 node tools/curate.js ch12 '{"flags":true,"snails":true}' snails medium 5 1401 90
   #   <tag> <allowed features JSON> <required feature(s) joined with +, or none> <easy,medium,hard> <count> <seed> <seconds>
   ```

   - Feature keys: `flags fruit dry keys portals rain rivers snails buttons leaves beetles pollen soil`.
     Every allowed feature is placed in every candidate, so for variety run several smaller mixes (in
     parallel, one per CPU) rather than one with everything.
   - Output goes to `gen/gen_<tag>.json` (git-ignored): entries with `d` (difficulty score), `par`, `win`
     (winnable %), `exitLen`, `worm`, `map`, `diff`. `LO`/`HI` pick from that slice of the pool sorted by
     difficulty. Generated maps have blank edge rows and columns: trim them (and shift `worm`) when adding.
   - A required feature must be used by the shortest solution. With `snails` or `soil` required, a
     candidate is also kept only if that mechanic makes the solution longer (removing the snails, or
     turning soft soil into grass, shortens it).
   - Bigger boards: add `"size":{"w":[9,10],"h":[9,11]},"fill":0.42` to the features JSON and raise the
     solver limit with `CAP=60000`. Big open boards tend to be easy; keys, dry patches and beetles make them hard.
   - Generated maps always start dry (`rain:false`). If a pool is small, try other seeds or more seconds.

3. **Add entries** to `LEVELS` in `src/levels.js`, matching the existing style:

   ```js
    { name:"Shell Corner", hint:"", par:18,
      exitLen:3, worm:[[2,0],[1,0],[0,0]],
      map:[
       ".Cv   ",
       "E.. . " ]},
   ```

   Give each a new, unique, cozy name (check with grep; progress is keyed by name). Keep `hint` short and
   friendly, or empty (an intro level's hint can explain its mechanic). A new chapter also needs its name
   appended to `CHAPTER_NAMES` and a row in CLAUDE.md's chapter table.

4. **Set par and check difficulty.** `npm run analyze` prints `index name par … states … winnable …%
   solution` per level. Copy the par. The difficulty score is `par * (1 - winnable/100)`; inside a chapter
   it should rise, so reorder if needed. To analyze only the candidates, write them to a scratch module
   (`module.exports=[...]`) and pass its path: `node tools/analyze.js /path/to/candidates.js`.

5. **Verify.** `npm test` (unit tests incl. unique names, `verify`, build). Fix every `UNSOLVABLE`,
   `PAR` or `TOO EARLY` line. Then look at the new patches: `npm run build:debug && npm run serve`, and
   `window.__squirm.load(i)` with the 0-based index (the ui-check skill has the screenshot scripts).
   Check that big boards stay readable at phone size.
