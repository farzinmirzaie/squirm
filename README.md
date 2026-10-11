# Squirm

[![Deploy](https://github.com/farzinmirzaie/squirm/actions/workflows/deploy.yml/badge.svg)](https://github.com/farzinmirzaie/squirm/actions/workflows/deploy.yml)

A cozy, turn-based worm puzzle set in a 2.5D garden. Crawl a fixed-length worm through
garden patches, touch every flag, and slip into the burrow at exactly the right length.

**Play it at <https://farzinmirzaie.github.io/squirm/>.** It installs as an app and plays offline.

<p align="center"><img src="docs/screenshot-home.png" width="260" alt="Squirm home screen"> <img src="docs/screenshot-game.png" width="260" alt="A worm crawling to its burrow"></p>

- 110 handmade patches in 11 chapters, each introducing one mechanic
- Endless mode with generated, solver-checked patches (easy / medium / hard)
- A daily patch that's the same for everyone, with stars, streaks, hints and undo
- Haptics and synthesized sound, with no audio or image files
- Swipe, tap or use the keyboard: arrows/WASD to crawl, `Z` undo, `R` restart, `H` hint, `M` mute, `Esc` back

## Develop

Requires Node 18 or newer.

```
npm install          # three.js and the two fonts, which are self-hosted in the build
npm run build        # src/ + public/ -> dist/
npm run serve        # serve dist/ locally
npm run verify       # check every level is solvable, pars are correct, pacing is right
npm run analyze      # print par, state count and winnable % for every level
npm test             # verify + build
```

Every push to `master` is verified, built and deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (Pages source: **GitHub Actions**).

See [`CLAUDE.md`](CLAUDE.md) for architecture, the level format and conventions.

## Credits

- [three.js](https://threejs.org/) r128 (MIT)
- [Grandstander](https://github.com/Etcetera-Type-Co/Grandstander) and
  [Nunito](https://github.com/googlefonts/nunito) fonts (SIL Open Font License 1.1), via
  [Fontsource](https://fontsource.org/)

## License

MIT. See [LICENSE](LICENSE).
