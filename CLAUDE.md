@AGENTS.md

# geo-game conventions

## Checking work

- `npm run check`: contracts match geo-game-server, then `tsc --noEmit`, then `expo lint`. Run it before calling anything done.
- Never run or test in the simulator; the device is tested by hand. Stop at `npm run check`.

## Server and contracts

- The backend is `../geo-game-server`: `server/src/` (see its README.md) and the API contracts in `shared/src/`.
- `src/lib/geo/contracts/` is a copy. Change a contract in geo-game-server, then `npm run sync:contracts` here. Never edit the copy.

## Calling the API

- Each feature has a `*Api.ts` (or store) built on `api` from `@/lib/api`.
- Paths come from `GEO_API_PATHS`; fill params with `apiPath(GEO_API_PATHS.runs.flee, { runId })`. A missing or misspelled param is a type error.
- Live server state on screen (market, lobbies, votes, friends): `usePolling(read, ms, enabled)` from `@/lib/usePolling`. It reads one at a time, pauses in the background and reads again on return.
- Where a poll and an action both write the same state, guard reads with `latestOnly()` (same file): ticket each read, and `start()` when an action's answer lands.
- Anything that sends a turn or spends something (a card, a cast) guards with a ref as well as state; state lags a render, so two taps in one frame both pass a state check.

## UI

- Build screens from the kit in `src/components/`: Button, Panel, Tabs, TextField, NumberField (`Field`, `NumberInput`, `QuantityInput`), Text (`Title`, `SectionTitle`, `Body`, `Hint`, `Label`), Meter, Pill, Chips, Badge, EmptyState, Divider, Modal, Sheet, MenuTile, SearchField, Icon, Toast (`showToast`).
- Missing something? Add a prop or variant to the kit component; don't hand-roll a button, input or box in a feature. `TextField` takes `leading`/`trailing` for icons and toggles inside the well.
- Styles: `createStyles((p) => ({ … }))` and `useTheme()` from `@/theme/theme`; colours come from the palette, fonts from `FONTS`.
- Only scene art (map, fishing scene, combat backdrop) is custom.

## Generated files (don't edit)

- `src/features/spawns/sprites.generated.ts`: `npm run sprites` (also writes geo-game-server's `world/app-sprites.generated.ts`).
- `src/components/Icon/gameIcons.generated.ts`: `npm run icons`.

## Shell

- zsh: quote globs, e.g. `grep -rn x --include='*.ts' src`.
