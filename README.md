# geo-game

A location-based game in the spirit of Dark Souls: walk the real world, fight
what spawns on real landmarks, and lose your souls where you fall.

Expo + React Native, with a MapLibre map over OpenStreetMap tiles. The backend
lives in `cozy-app` as a separate module.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the stack, decision log, project
structure, and current state.

## Quick start

```sh
npm install
npm start        # scan the QR code with Expo Go
npm run tunnel   # same, reachable from outside your network
```

Runs in **Expo Go** — no build step. That is a deliberate constraint, not a
temporary state: no custom native modules, so the app stays free to develop and
free to share. See decision 6 in ARCHITECTURE.md before adding any dependency
that ships native code.

## Icons

Icons come from [Game Icons](https://game-icons.net) — about 4,000 fantasy icons
(the same set as react-icons' `Gi` prefix). Only the ones the app uses are
bundled: list a name in `scripts/generate-icons.mjs`, then
`<Icon name="broadsword" color={...} />`.

## Generated art

Icons, map sprites (`src/features/spawns/assets/`) and item art
(`src/features/items/art/`) are turned into code by generators. You never need
to run them: `npm start` (and tunnel, android, ios) brings them up to date and
reruns them whenever those files change while it's running. `npm run check`
fails if any are stale; `npm run assets` runs them all by hand.

## Credits

Icons by Lorc, Delapouite and contributors at
[game-icons.net](https://game-icons.net), licensed under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
