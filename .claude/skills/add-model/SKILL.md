---
name: add-model
description: Build or change a Squirm 3D model (hat, extra, colour option, board tile or item, critter, scenery) in the house style, then review it properly from every side with look.js and fix it until it looks right. Use whenever a 3D model is added or changed.
---

# Adding or changing a 3D model

Every model is built in code (`src/game.js`), so nothing is checked by eye unless you look. A model isn't
done until it looks right from every side, in its real places, in light and dark, in every colour option.
Budget the time for several review rounds; the first version is rarely right.

## 1. Plan it

- **Where it lives:**

  | Kind | List | Built by | Lives in |
  |---|---|---|---|
  | Hat | `HATS` | `buildHat(id)` | the head's `hatSlot` (cloned from a cached proto) |
  | Extra (face, neck, head) | `EXTRAS` | `buildExtra(id)` | the head's `accSlot` |
  | Colour options | `TINTS` | `tinted()` swaps materials | any hat or extra |
  | Board tile | (map char) | `makeTile` | `cells[y][x].tile` |
  | Board item | (map char) | `makeItem` | `cells[y][x].item` |
  | Snail, beetle | `state` | `makeSnail`, `makeBeetle` | their own update functions |
  | Scenery, critters | | `buildGarden`, `buildCritters` | merged by `batchScenery` / `merged` |

- **Start from its sticker.** Draw the `ART` sticker first (or read the existing one): the model and the
  sticker are the same object in the same colours, and the sticker forces a clear silhouette.
- **Find a similar model** and read it: the beret or bow for a small hat, the wizard or gnome hat for a tall
  bent cone, the scarf or bandana for something round the neck, the butterfly or ladybug for something
  perched on the head, the flower button or pollen flower for a flat tile item.

## 2. Coordinates to build against

- **Head** (`HEAD_R` = .34, its centre is the origin of `accSlot`): eyes at (±.13, .14, .24) with radius .11
  (their fronts reach z ≈ .35, a little more when the worm says "wow"), mouth around (0, -.06, .33),
  cheeks at (±.21, -.04, .25). The neck joins under the back of the head. Keep everything clear of the face.
- **Hat slot:** (0, .27, -.02) on the head, tipped back by .18; a hat's y = 0 sits on the crown. A brim of
  radius about .3 covers the top of the head. Tall hats are fine (the stage camera fits them).
- **On the head's surface:** a point in direction `n` is `n.normalize().multiplyScalar(HEAD_R + gap)`. A ring
  lying on the head is a circle at distance `d` along a (tilted) axis through the centre, with radius
  `sqrt(HEAD_R² - d²)`: tilt a group round the head's centre, then put the ring at `y = d` inside it (see
  the sweatband and the daisy chain). Don't tilt a ring around its own centre: it sinks in on one side and
  floats on the other.
- **Board:** a tile is 1×1, its grass top at y = 0, the board centred on the origin; `wp(x, y, h)` gives a
  tile's world position. Items stand on y = 0 and should stay inside their tile (about ±.45) unless they're
  meant to reach over.

## 3. Build it in the house style

- Colours from the `C` palette (add named entries, never inline hexes in the model code), cached toon
  materials `m(key)` / `toon(color)`, cached spheres `sph(r)`.
- Outlines: `outline(mesh, t)` (an inverted hull) for round, closed shapes. For thin or curved parts (rings,
  tubes, curls) make the hull yourself: the same shape a little fatter with `lineMat` (see the fancy
  mustache and the sweatband). Flat shapes get `outlineBox` or a slightly larger copy behind.
- Never change a shared material's settings (`m(key).side = ...`): every mesh using that key changes with it.
  Make a separate cached material in `MC` instead.
- Thin, small details vanish at phone size. Prefer a few chunky, readable parts to many fine ones, and
  check the silhouette from the in-patch camera (above, about 56 degrees).
- `castShadow` on solid parts. Hats and extras are built once per id (and colour option) and cloned, so their
  geometry can be bespoke. Board pieces are rebuilt for every patch and freed by `disposeTree`, so anything
  module-level (a cached geometry or material) must sit in `GC` / `MC` or a keep list.
- Motion goes in an update function, stays subtle, and respects `reduceMotion`.

## 4. Wire it up

- Hat or extra: its list entry (a chapter hat `[id, name, chapter index]`, a milestone
  `[id, name, -2, how to earn, test]`, an extra `[id, name, how to earn, test]`), its `hat-<id>` /
  `extra-<id>` sticker, and a creative unlock (CLAUDE.md, "Adding a chapter").
- Colour options: a `TINTS` entry when a colour makes sense (not for glasses, mustaches, creatures): `keys`
  are the `C` materials to swap, `art` the sticker hexes to recolour, option 0 the item's own look.
- Board pieces: the map character, `THUMB_COL`, and the `MECH` intro sticker if it's a new mechanic.

## 5. Review it from every side

```
node .claude/skills/add-model/look.js <outDir> wardrobe '[["teacup","teacup","none",{"teacup":1},0]]'
node .claude/skills/add-model/look.js <outDir> board '[["gate",{"map":["P.y.Y"],"worm":[[1,0],[0,0]],"exitLen":2},[2,0],"W"]]'
```

Wardrobe entries are `[name, hat, extra, {colour option by item id}, worm colour index]` and render the
front, both sides, the back and the top (about the in-patch angle) on the wardrobe stage. Board entries are
`[name, level, [x, y] to look at, moves to play first]` and render the normal patch view plus close orbits
from four sides. Each run also saves `<name>.png` with the views side by side; read those with the Read tool.
Add `--dark` for dark mode. Put `<outDir>` in your scratchpad, and with a global Playwright prefix
`NODE_PATH=$(npm root -g)`.

Look for, every time:

- clipping into the head, eyes, mouth, cheeks, body or neighbouring tiles;
- parts floating off the surface, gaps, or parts sunk out of sight;
- outlines that are missing, doubled, ragged or poking out;
- pieces hidden from the usual cameras (under the chin, behind the head, under a hat);
- scale against the other items, and readability at phone size;
- every colour option (one entry per option), and the worm in a few colours;
- that it matches its sticker.

Fix, re-render and look again. A model that only looks right from the front isn't finished.

## 6. See it in its real places

- The wardrobe and the HUD: `node .claude/skills/ui-check/shoot.js <outDir>` (the `ui-check` skill), and the
  tile in the wardrobe grid with its sticker.
- A patch: the board mode above, with moves that put the worm on or next to it (and any state it has, like
  open and closed).
- `npm run check`: the smoke test fails if GPU geometries or textures grow across patches.

Then release it (CLAUDE.md, "Releasing") with a cozy `NEWS` line.
