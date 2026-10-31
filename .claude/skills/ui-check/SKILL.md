---
name: ui-check
description: Visually check a Squirm UI or 3D change in headless Chromium - debug build, serve, screenshot every home tab and a patch in light and dark at phone size, then compare. For a 3D model itself, use add-model. Use after editing src/shell.html CSS or markup, UI code in src/game.js, or anything that changes how the game looks.
---

# Checking the UI visually

1. **Shoot.** From the repo root:

   ```
   node .claude/skills/ui-check/shoot.js <outDir> [--level 151] [--scale 2]
   ```

   It builds a debug copy into a temp folder (your `dist/` is untouched), serves it under `/squirm/` with
   `tools/serve.js`, and saves `home-{play,garden,meadow,me,badges}-{light,dark}.png` and
   `patch-<level>-{light,dark}.png` at 390x844 CSS pixels (times `--scale`). It exits non-zero if the
   page logged errors. Put `<outDir>` in your scratchpad, not the repo. Needs Playwright and its
   Chromium; with a global Playwright run it as `NODE_PATH=$(npm root -g) node ...`.

2. **Compare.** Shoot the base first (`git stash`, shoot to `<outDir>/before`, `git stash pop`, shoot to
   `<outDir>/after`) and look at the pairs with the Read tool. Check: both themes, token colours (no
   stray hard-coded colour in dark mode), text fits at 390px wide, nothing hidden behind the HUD or tab
   bar.

3. **Go further when the change needs it.** Copy `shoot.js` into the scratchpad and adapt it: open a
   dialog by clicking its button, play moves with `window.__squirm.move('N')` (wait for
   `!window.__squirm.busy()` between moves, and after `load(i)` too: software rendering makes a patch pop in
   over a few seconds, so an early shot has no worm), set `squirm-` localStorage keys in `addInitScript` to fake
   progress, or `page.emulateMedia({ reducedMotion: 'reduce' })` to check the reduced-motion block. The
   debug hooks and launch flags are listed in CLAUDE.md under "Seeing the game in a browser";
   `test/smoke.js` is a fuller example.

4. **3D models** (hats, extras, colour options, tiles, items) have their own skill, `add-model`, with
   `look.js` for close-ups from every side. Use it for any model change, then come back here for the
   screens around it.

5. **Finish** with `npm run check` (unit tests, verify, build, smoke).
