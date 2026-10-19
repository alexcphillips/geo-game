# geo-game — Architecture

A location-based game: you walk around the real world, your character moves with
you, and things spawn on real landmarks. Mechanically and tonally it takes from
Dark Souls — souls as currency and XP, bonfires as checkpoints, losing your
souls where you died — but the moment-to-moment play is Pokémon Go-simple:
tap-resolved stat-check encounters, not real-time pattern dodging.

This document is the running record of **how** the project is built and **why**.
It is updated as decisions are made. If something here contradicts the code, the
code is wrong or this file is stale — say so.

---

## Design pillars

These shape the technical choices below, so they come first.

1. **The world is fixed; you are what changes.** Enemy difficulty comes from the
   *landmark*, not from your level. A bench spawns a hollow; a cathedral spawns
   something that will kill you. There is no level-scaling, because scaling
   deletes the feeling of having grown stronger.
2. **The interesting decision is the walk, not the fight.** Unbanked souls,
   finite healing, and the distance back to a bonfire are the real tension. Do
   you push two blocks further, or walk back and bank?
3. **Dying costs you something you have to physically retrieve.** Your souls
   stay where you fell. This is the one Souls mechanic the real world *improves*.
4. **Combat is one-thumb and interruptible.** The player is standing on a
   sidewalk. Anything demanding sustained attention or precise timing is wrong
   for the medium, and unsafe.

---

## Stack

| Concern | Choice | Status |
| --- | --- | --- |
| Client | Expo SDK 57 + React Native 0.86 + React 19.2 | in place |
| Language | TypeScript 6, `strict`, `noUncheckedIndexedAccess` | in place |
| Navigation | Expo Router (file-based, routes in `src/app/`) | in place |
| Map rendering | MapLibre GL JS, hosted in `react-native-webview` | in place |
| Basemap tiles | OpenFreeMap — OSM data, OpenMapTiles schema, no API key | in place |
| Location | `expo-location`, foreground only | in place |
| Notifications | `expo-notifications`, local only (works in Expo Go) — scaffold | in place |
| Build | **Expo Go** — no custom native modules, deliberately | in place |
| Client state | Zustand; player state is a cache of the server's (`features/player/`) | in place |
| Backend | cozy-app's Express + Postgres, in its own `geo` folders and schema | in place |
| Landmark data | OpenStreetMap, imported into Postgres | **not started** |

---

## Decision log

### 1. Separate repo from cozy-app, shared backend

The game client is its own repo; the server lives in cozy-app as a new module.
The client is a native app with a completely different toolchain, so colocating
it would mean an Expo build pipeline inside a Vite monorepo for no gain. The
backend is reused because auth, the Postgres pool, and the
`api.paths → routes → controller → repository` convention already work there.

**Consequence:** types are not shared automatically. cozy-app's UI gets contracts
from `@cozy/shared`; this app cannot import that package across repos. The geo
contracts (`cozy-app/shared/src/geo/`) are copied into `src/lib/geo/contracts/`
by `npm run sync:contracts`; never edit the copies. Change a contract in
cozy-app, run the sync, and let the type errors show what to update. If that
becomes painful, the options are publishing `@cozy/shared` to a registry or a
git submodule.

**Server is the source of truth.** Inventory, equipment, the Talisman Bag,
hands, XP, coins, spawns, vendors, the Market, elections and every combat turn
come from the server. The app shows a sign-in screen until signed in with a
geo-game account, separate from cozy-app's (`features/auth/`, `lib/api/session.ts`; the refresh token is
kept in `expo-secure-store`, so a restart stays signed in), loads the player
into `features/player/playerStore.ts`, and sends each change to the server,
adopting the reply. Fights replay the server's battle log as animation
(`features/run/combat/`). With the server unreachable, the map still works and
a banner offers Retry; nothing falls back to local data.

### 2. Landmark data from OpenStreetMap, not Google Places

**Decided on licensing, not data quality.** Google Places' coverage is actually
fine — it has `fountain`, `monument`, `sculpture`, `city_park`,
`cultural_landmark`, `historical_landmark`. The blocker is the Places policy:
*"You must not pre-fetch, cache, or store Places API content."* Only Place IDs
may be stored indefinitely; names, coordinates, and types may not. A persistent
spawn table keyed on Google content is therefore not permitted, and every spawn
lookup would be a billable call forever, scaling with players × refreshes.

OSM has no such restriction. A Geofabrik regional extract is downloaded once into
our own Postgres, after which finding spawns near a player is a spatial SQL query
with no quota and no marginal cost. OSM also carries the hyper-local texture this
game wants: `tourism=artwork` + `artwork_type=mural`, `amenity=fountain`,
`historic=memorial`, `leisure=park`, `tourism=viewpoint`.

**Known cost:** OSM coverage varies by region — dense in cities, thin in rural
areas — and tagging is inconsistent. A normalisation layer mapping raw OSM tags
to spawn tiers is required, and that mapping table is a real piece of game design,
not a chore.

### 3. ~~Map rendering with `react-native-maps`~~ — SUPERSEDED by 3b

Originally chosen because it runs in Expo Go, making the game testable by
scanning a QR code with no native build. Its cost was that `customMapStyle` is a
Google Maps feature, so on iOS (Apple Maps) the dark style was ignored entirely.
That cost turned out to be disqualifying in practice — see 3b.

### 3b. Map rendering with MapLibre + OpenStreetMap vector tiles — TAKEN

Driven by four concrete requirements: not Apple Maps, a zoom-out limit, free map
rotation, and arbitrary styling — plus visible water and highlighted parks.
`react-native-maps` could technically do the first four via
`provider="google"`, but that path dies on its own terms:

**The dev-build realisation.** Using Google Maps on iOS requires the Google Maps
iOS SDK, which Expo Go's binary does not bundle. So `provider="google"` *also*
needs a development build. Expo Go compatibility was the entire reason to prefer
`react-native-maps`, and it does not survive the requirement to leave Apple Maps.
With both options costing a dev build, MapLibre wins on every remaining axis.

What MapLibre gives that Google's `customMapStyle` cannot:

- **Arbitrary layers**, not a fixed `featureType` list. Parks get a fill *and* an
  outline; water gets its own treatment. Later these can be data-driven from our
  own OSM-derived spawn data.
- **One renderer on both platforms**, so the style is written once and looks
  identical on iOS and Android. The Apple/Google split meant maintaining two
  looks, one of which was not stylable at all.
- **No Google dependency**, which also deletes the Android Maps API key chore
  that decision 3 had left as an open thread.
- It is **what Pokémon Go actually does** — Niantic moved to OSM data in 2017.

**Tile host: OpenFreeMap.** OSM data, no API key, no documented request limits,
commercial use permitted, MIT, attribution rendered automatically by MapLibre.
Crucially it serves the **unmodified OpenMapTiles schema**, which MapTiler also
serves, so the highlight layers in `src/theme/mapStyle.ts` are portable:
switching to a paid host with an SLA is a change to `BASEMAP_STYLE_URL` plus a
key, with no restyling.

**Known costs:**

- OpenFreeMap is donation-funded with no SLA. Mitigated by schema portability
  above; self-hosting Protomaps `.pmtiles` is the end-state option if the game
  ever needs to guarantee its own uptime.

**Verified, not assumed:** the layer definitions reference `source="openmaptiles"`
and source-layers `park`, `water`, `waterway`. Those names were read out of the
live style JSON rather than recalled, because a wrong source id fails silently —
the layer simply never draws.

**Amended by 3c:** MapLibre + OSM is still the choice. Hosting it as a *custom
native module* was not, because it broke Expo Go.

### 3c. MapLibre hosted in a WebView, not as a native module — TAKEN

**The constraint that drove this:** Expo Go must keep working. It is how the game
is tested, and — critically — the only free way for other people to run it. A
custom native module ends both: Expo Go cannot load one, and distributing a real
iOS build to anyone else requires the paid Apple Developer Program.

This was missed when 3b was taken. The dev-build requirement was recorded as a
"known cost" rather than raised as a decision, which is backwards for something
that removes a workflow the project depends on. Noted here because the
easy-to-repeat version of this mistake is treating a constraint as a footnote.

**The resolution:** `react-native-webview` *is* bundled in Expo Go, and MapLibre
GL JS inside it renders the same map from the same style definitions. Every
requirement survives — non-Apple basemap, arbitrary styling, free rotation, zoom
limits, visible water, highlighted parks — with no native code.

Because both hosts consume plain MapLibre style-spec JSON, `theme/mapStyle.ts` is
shared: moving to the native module later (if a dev build ever becomes
acceptable) is a change of host, not a restyle.

**Known costs:**

- **Performance ceiling.** WebGL in a WebView is good but not native. Fine for a
  basemap with markers; a few hundred animated sprites would strain it. This is
  the thing most likely to force the native module eventually.
- **MapLibre GL JS loads from unpkg**, pinned to an exact version in
  `mapHtml.ts` so a CDN major bump cannot silently break the map. The app needs
  the network for tiles anyway, but bundling the library as a local asset is the
  hardening step if offline or CDN independence ever matters.
- **A bridge to keep tidy.** Two explicit calls: `window.gameMap.setPlayer()` in,
  `postMessage` with a typed `MapMessage` out. The WebView boundary is the
  easiest place in this architecture to accumulate mess, so it is kept
  deliberately narrow. Game rules stay on the React Native side: the page
  reports every tap on a landmark or skill marker as a `place` message, and
  the world screen decides whether it is in reach (`PLACE_REACH_METRES`,
  lifted by the admin free camera). Fishing water reports raw facts only —
  water class, approximate area, whether a pier reaches in — and
  `places/fishingWaters.ts` turns them into a tier. The tiles carry no depth.
- Map failures are silent black, so `GameMap` surfaces them via `onError` and
  the world screen renders them.

### 4. Foreground location only

The core loop is "open app, walk to a thing, fight it" — there is nothing to
accumulate while the phone is pocketed, unlike Pokémon Go's egg hatching. Skipping
background location avoids a far more invasive permission prompt and extra app
store review. `isAndroidBackgroundLocationEnabled` and
`isIosBackgroundLocationEnabled` are explicitly `false` in `app.json`.

Accuracy is `Location.Accuracy.High` with a 5-metre `distanceInterval` rather
than `BestForNavigation`: proximity is judged in tens of metres, and a distance
threshold lets the OS stay quiet while the player stands still.

### 5. The player marker is a game object, not the OS dot

MapLibre's own `UserLocation` component and `Camera.trackUserLocation` are both
unused. The marker is drawn by us, and the camera is driven from our own
`usePlayerLocation` hook.

Two reasons: the player's marker will need to express game state — hollowed,
embered, in combat — which a stock location dot cannot carry; and letting
MapLibre track location independently would mean two GPS subscriptions, with the
camera following coordinates the game logic never sees.

### 6. Stay Expo Go compatible — this is a hard constraint

**No custom native modules.** Not "prefer to avoid" — a hard constraint, because
it is what keeps the project free to develop and free to share. Any dependency
shipping native code must be checked against Expo Go's bundled module list
before it is installed, and if it is not there, the answer is a decision to
raise rather than a cost to absorb.

What this buys:

- **Local testing** by scanning a QR code, no build step.
- **Other people can play**, at zero cost. On a physical iOS device, Expo Go
  opens a project *"from a development server only when Expo CLI and Expo Go are
  signed in to the same Expo account"* — so family installs the free Expo Go app
  and signs into this project's Expo account.
- `npx expo start --tunnel` exposes the dev server over a public URL rather than
  LAN only, so they don't need to be in the house.

What it costs:

- The dev server has to be running on this machine for anyone to play. There is
  no "install it and keep it" without a real build.
- A real installable iOS build — for people outside the house, or to stop
  depending on a laptop — needs the Apple Developer Program at $99/yr. Android
  can be distributed free as an APK whenever that becomes worth doing.
- Performance-sensitive native work (see 3c) is off the table until that
  tradeoff is deliberately revisited.

### 7. Pokémon Go's legibility, not its palette

Pokémon Go's map is light — pale sage land, near-white road ribbons. This world
is deliberately dark, so what is borrowed is its *structure*, not its colours:

- **Roads are wide, pale, rounded ribbons.** `line-cap`/`line-join: round` plus
  deliberately fat zoom-interpolated widths. The road network is what you
  navigate by, so it dominates rather than hairlining.
- **Casings are darker than their inner fill**, which is what makes a road read
  as an outlined ribbon instead of a flat smear.
- **Areas carry distinct values** — residential, woodland, parks and buildings
  all differ, so the world reads as *places* rather than one flat field.

If the whole thing should actually go light, the change is the basemap style URL
plus re-tuning `BASEMAP_OVERRIDES`; the game layers would mostly survive.

### 8. Landmarks from vector tiles — prototype only

Landmarks come from three OpenMapTiles source-layers, and **which layer holds
what is the single easiest thing to get wrong here**:

| Feature | Source-layer | Why |
| --- | --- | --- |
| National parks, protected areas, nature reserves | `park` | this layer holds *only* those; drawn invisibly, as a marker source only |
| Monuments, artworks, fountains | `poi` | |
| Landmark markers for parks, playgrounds, stadiums | `poi` | named points; `landuse` has no `name` field |

The first version read only the `park` source-layer for parks, so neighbourhood
parks never rendered while distant nature reserves did — a bug that looked like
missing data rather than a wrong query. The OpenMapTiles schema is explicit:
the `park` layer is `boundary=national_park`, `boundary=protected_area`,
`leisure=nature_reserve`, and nothing else.

The schema describes `poi` as excluding parks, but live OpenFreeMap tiles carry
`class=park`, `playground` and `stadium` points with names. `landuse` carries
only `class`. So areas are *drawn* from `landuse` and *marked* from `poi`.
Markers are named-only, and `pitch`/`sports_centre` are excluded: OSM maps every
court in a park as its own pitch, which turned one park into a dozen landmarks.

`LANDMARK_POINT_CLASSES` matches against both `class` and `subclass` because the
schema splits them inconsistently. Every `match` defaults to `false`, so a value
absent from the schema renders nothing rather than erroring.

**Markers are DOM elements, not a symbol layer.** No sprite icon or exotic glyph
to depend on, full CSS control over the look, and it is the same mechanism the
real server-driven landmarks will use. The marker pass groups features by name
and accumulates a bounding box across every fragment, because vector tiles split
a polygon at tile boundaries — using one fragment's centre would drop the pin on
a tile edge instead of the middle of the park. It runs on `idle`, so after a
movement settles rather than every frame.

**Not the real landmark system.** It renders whatever the client has in view,
which is fine for designing the look but cannot decide spawns — those must be
server-authoritative or the game is trivially cheated. End state is a server-side
table from an OSM extract with tag→tier normalisation.

**Pokéstops are not OSM.** They are player-submitted Ingress portals in Niantic's
own database. A Pokéstop may be unmapped in OSM, and OSM landmarks are frequently
not Pokéstops. The two datasets do not correspond and should not be expected to.

### 9. The camera is locked to the player

`dragPan: false` — you cannot pan away from yourself. Walking is how you see
somewhere else, which is the entire premise, and free panning would let a player
scout spawns across town from the sofa. Zoom and rotation stay enabled.

No tilt either: `maxPitch: 0` is the hard guarantee, with `pitchWithRotate` and
`touchPitch` off so no gesture fights it. A tilted view hides things behind
buildings and makes the map harder to read at a glance.

**The gesture map, and why it works:**

| Gesture | Does |
| --- | --- |
| One-finger drag | Rotate the world |
| Two-finger pinch | Zoom only |
| Double tap | Nothing |

Locking the camera is what makes this possible: one-finger drag would normally
pan, so with panning gone it is free to mean rotate. MapLibre has **no built-in
one-finger rotate**, so it is a small custom touch handler on
`map.getCanvasContainer()` — horizontal movement only, since pitch is disabled
and vertical has nothing to control.

Multi-touch is handed straight back to MapLibre's pinch-zoom handler, and
`touchZoomRotate.disableRotation()` removes the two-finger twist so a pinch
cannot spin the world mid-zoom. A 4px threshold means a tap doesn't nudge the
bearing, which keeps tap-to-select-a-landmark viable later.

Double-tap zoom is off: with three usable zoom levels it was more often an
accident than an intent, and it would compete with that same tap gesture.

**`dragPan: false` is not sufficient on its own.** MapLibre zooms about the
pinch's own midpoint by default, the way a photo viewer does, and that
*translates* the centre whenever the midpoint isn't dead centre. It isn't a pan,
so disabling panning doesn't touch it. The drift is a few pixels per pinch and
compounds: zooming out, turning, and zooming back in walked the player off
screen. Both zoom handlers are therefore enabled with `{ around: "center" }`.
Call order matters — `enable()` reapplies the handler's options, so
`disableRotation()` has to come after it.

Behind that, a `moveend` handler re-asserts the player's position as the centre
if it has drifted more than a pixel. In normal use it never fires. It exists
because camera-locked-to-player is a pillar rather than a preference, and one
enforcement point is more durable than trusting that no future gesture or
MapLibre upgrade reintroduces the same class of bug silently. Drift is measured
in projected pixels, since a fixed lat/lng epsilon means something different at
every zoom level.

### 10. One modal shell, content-agnostic

`src/components/Modal/Modal.tsx` owns *being a modal* and knows nothing about
what it contains: backdrop, panel, enter/exit animation, Android hardware back,
safe-area padding, sizing, and marking itself modal to assistive tech. Content is
just `children`.

**Rendered conditionally, not toggled by a `visible` prop.** Unmounting is what
resets the content's state, so a modal cannot reopen half-filled. A visibility
flag keeps content mounted and makes stale state the default — the trap that cost
us in cozy-app's drawers.

The exit animation survives that choice: a close request animates out *first*,
then calls `onClose`. The parent unmounts after an animation it never had to know
about, so "unmount to close" doesn't mean "vanish instantly".

**Sizes are fractions of available height** (`small` 0.34, `medium` 0.58, `large`
0.85) rather than fixed pixels, so they read consistently from an SE to a Pro
Max. `large` deliberately stops short of full screen — the gap is what tells the
player this is a layer over the world rather than a new place.

**Full screen is a route, not a modal size.** Something occupying the whole
screen is a *place*: it wants a URL, a real back button, and history. That is an
Expo Router screen in `src/app/`. The modal tops out at `large` on purpose.

`dismissOnBackdropPress` can be set false to force a deliberate choice — a boss
confirmation shouldn't be dismissible by a stray tap.

### 11. Map caching — what exists and what can't

Audited rather than assumed. Measured response headers:

| Asset | Cache-Control | Effect |
| --- | --- | --- |
| Vector tiles | `public, max-age=86400` + ETag | 24h, then cheap 304s |
| Style JSON | `public, max-age=86400` | 24h |
| maplibre-gl.js (803KB) | `public, max-age=31536000` | fetched once, cached a year |

`cacheEnabled` is explicit (its default is already true) and Android uses
`cacheMode="LOAD_CACHE_ELSE_NETWORK"` — stale tiles are preferred over a network
trip, because streets don't move and it keeps the map usable on a weak signal.

**The fix that mattered:** `source={{ html }}` with no `baseUrl` gives the page an
`about:blank` origin. MapLibre persists tiles through the Cache Storage API,
which is unavailable on an opaque origin and silently no-ops there — so its own
tile cache was inert and only the HTTP cache was working. `baseUrl` is now the
tile host origin (derived from `BASEMAP_STYLE_URL` so it can't drift), which
gives a real secure origin and makes tile requests same-origin.

**Unverified:** that Cache Storage actually activates. It needs checking on a
real device.

**Two known limits:**

- **No offline maps, and not achievable here.** Offline packs are a feature of
  MapLibre's *native* SDK (`OfflineManager`); MapLibre GL JS has no equivalent.
  Downloading a region for offline play would require the native module, which
  decision 6 rules out. Accept it or revisit decision 6.
- **The 803KB library is a cold-start dependency on unpkg.** First launch with no
  network, or a CDN outage, means no map at all. Bundling it locally is the fix;
  not done yet.

Nothing caches *game* data yet because there is no backend. That caching — spawns
and landmarks — is the one that will actually matter, and it needs designing
alongside the endpoint rather than retrofitted.

### 12. The character screen is a route; placeholder art is a component

**A route, not a modal.** It is a place with its own identity and wants the whole
screen, which is precisely the case decision 10 carved out by capping the modal
at `large`. Being a route also means the hardware back button and navigation
history work with no extra code. The first real test of that rule, and it held.

Layout follows Dark Souls' equip screen — weapons left, armor right, rings
underneath — because that is the convention this game borrows from, and it puts
the figure at the centre of its own equipment. The slot data lives in
`characterSlots.ts` as three arrays, so the screen is laid out by iterating
columns rather than hand-placing ten boxes; covenant, ammo and consumables land
there without the screen changing.

**Art is real, and the placeholder is gone.** `KnightFigure` — a silhouette
drawn from Views — was deleted rather than left around once
`features/character/assets/` got actual PNGs. Dead placeholders are worse than
no placeholder: they look like a live code path.

Two separate images, because the two uses are framed differently:

- `knight_head_portrait.png` (170×128) is a bust, used `cover` inside the
  circular badge. It is already framed as a portrait, so the circle just clips
  it.
- `knight_portrait.png` (432×578) is the full figure, used `contain` on the
  character screen.

The figure sizes from **column width with a declared `aspectRatio`**, not a
fixed height. A fixed height overflows the centre column on a narrow phone,
where the two slot columns leave little room between them; sizing from width
degrades gracefully instead.

Equipment slots stay inert: a `Pressable` with no handler renders as a plain
square rather than a button that does nothing.

---

## Project structure

```
src/
  app/                  Expo Router routes ONLY. Every file here is a screen;
                        _layout.tsx files define navigators. No other code.
    _layout.tsx         Root layout: safe area, status bar, headerless stack
    index.tsx           The world screen (map + HUD)
    character.tsx       Character screen — equipment slots around the figure

  components/           Cross-feature UI with no domain knowledge.
    Modal/              The modal shell (decision 10)

  features/             One directory per domain. Self-contained.
    location/hooks/     usePlayerLocation — GPS lifecycle and permissions
    map/                GameMap + the WebView map page
    hud/                CoinCounter (top left), BottomBar + Actions sheet (bottom), action registry
    character/          Slot definitions, equipment squares, portrait badge
      assets/           Knight art (bust for the badge, figure for the screen)
    pets/               Pets modal; pet icons by name (petIcons.generated.ts)
      assets/           Pet icon PNGs, kebab-case names; run `npm run pet-icons`

  lib/
    api/                Typed client for the cozy-app backend
    config.ts           Resolves the backend URL (see below)

  theme/
    colors.ts           UI palette + gameplay terrain colours (water, parks)
    mapStyle.ts         Basemap URL, zoom bounds, basemap overrides, game layers

scripts/
  validate-map-style.ts  Checks every layer spec against the MapLibre style spec
```

**Rules that keep this readable:**

- `src/app/` contains screens and nothing else. Components, hooks, and helpers
  live in `features/` or `lib/`, so the route tree stays a readable map of the
  app's screens.
- A feature owns its own components, hooks, and API calls. Features do not import
  from each other's internals; shared things move to `lib/` or `components/`.
- Colours come from `theme/colors.ts`. A hex literal outside that file (or a
  `StyleSheet` rgba for translucency) is a bug.
- **Art is used at full resolution and sized with styles.** Images are not
  pre-scaled into `@2x`/`@3x` variants — React Native downscales at render time
  and the quality is fine. The tradeoff is bundle size: a full-size PNG can
  be ~90KB for something drawn at 34pt. Acceptable at this scale; if the bundle ever
  matters, generating density variants is a `sips` one-liner per asset.
- Path alias `@/` maps to `src/`. Use it instead of `../../..`.

## Connecting to the backend

`src/lib/config.ts` resolves the API base URL at runtime:

1. `EXPO_PUBLIC_API_URL` if set — **required for any real build.**
2. Otherwise it derives the dev machine's LAN IP from the Expo dev server's own
   `hostUri` and swaps in port 3000.

Step 2 matters because `localhost` on a phone means the phone. Deriving the host
from the bundler means device testing works without hand-editing an IP every time
the network reassigns one.

`setAuthToken()` holds the bearer token in a module variable so `api` has no React
dependency. It is **not yet persisted** — a cold start has no token.

## Running it

```sh
npm start              # dev server; scan the QR with Expo Go
npm run tunnel         # same, reachable off-LAN — use this for family
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run validate:map   # validate map layer specs (see below)
npm run doctor         # expo-doctor dependency/config checks
```

**`validate:map` earns its place.** Map style errors are *silent* — a malformed
expression or a misspelled paint key doesn't throw, the layer just never draws.
Without this check the only way to find out is to run the app, walk to a park,
and notice nothing is there. Run it after touching `theme/mapStyle.ts`.

For someone else to play: they install Expo Go, sign in to the same Expo account
this CLI is signed into (required on physical iOS devices), and scan the QR from
`npm run tunnel`.

No `ios/` or `android/` directory should ever exist here. Their presence means
something pulled in native code and broke decision 6.

## Current state

The app requests foreground location, watches position, and renders a MapLibre
map against OSM tiles:

- Dark basemap, brightened and restyled for legibility (decision 7): wide
  rounded road ribbons, differentiated areas.
- Water in a dark slate-teal: identifiable by hue, without outshining the world.
- No area highlighting: parks and fields used to get a green fill and
  outline, removed in favour of the named markers alone. The basemap's own
  subtle park tint (`landuse_park` in `BASEMAP_OVERRIDES`) remains.
- Landmark markers: the ember dot from the `poi` circle layer, with the name
  above it as a DOM label. Named places only; no sports pitches, places of
  worship or cemeteries.
- Skill hub markers (prototype): red mining (rock, quarries, industrial land),
  blue fishing (lakes, ponds, rivers, marinas), green farming (allotments,
  orchards, farmland, named gardens), brown foraging (woods, forest, scrub,
  heath). Parks stay general landmarks for events and dungeons. Industrial land is usually fenced and
  private, so its marker sits on the site's outline nearest the player, never
  inside. Sources live in `SKILL_LAYERS` in `theme/mapStyle.ts`.
- Deck: a bottom-right button opens hand building, one skill at a time
  (combat, fishing, mining, farming, foraging). Each skill has a current hand
  of up to 6 cards and saved hands; below is that skill's card collection,
  searchable and sortable by rarity, charges, newest or name. Tap to add or
  remove, hold for details. Rules (one skill per hand, no duplicates, no
  faded cards, size limit) live in `checkAddToHand` in `deck/deckStore.ts`.
  Hands persist on the device via Async Storage; Runs will need them
  validated server-side. Items now carry a rarity, shown as the tile border.
- Settings moved to a top-right button, with the map compass in a column
  beneath it (positions shared through `theme/layout.ts`).
- Mock enemy spawn (prototype): a spider placed ~35 m north-east of the
  player's first position, fixed in the world, with white rings pulsing out
  from it. Map sprites live in `features/spawns/assets/` and are cropped and
  embedded as data URIs by `npm run sprites`, because the map's WebView page
  can't load bundled app assets. Pet icons are the opposite case: drawn by app
  screens, so they stay bundled PNGs in `features/pets/assets/`, indexed by
  name into `petIcons.generated.ts` by `npm run pet-icons`. `makeMockSpawns` is what a server spawn
  request will replace.
- Combat Run screen: tapping a spawn opens `/run/combat?enemy=<id>`, a route
  built on the shared `RunScreen` shell (header with Flee, arena, hand) that
  fishing and mining Runs will reuse. Player on the left, enemy on the right,
  each with a name and health bar above; a turn-order strip of square
  portraits above the hand (sorted by speed, faster first, ties to the
  player); and the player's combat hand from the Deck along the bottom
  (empty slots as placeholders).
- Hit effects (`features/run/fx/`): lunge to contact, crescent slash, burst,
  fireball projectile, shake, white flash (a `tintColor` silhouette of the
  art), floating damage numbers, crit screen shake, and a health bar that
  drains with a lingering chunk. Drawn with react-native-svg and Animated,
  no extra art. Every timing lives in `hitTiming.ts`, tuned first in a web
  preview (https://claude.ai/artifact/2JJfwmMwYd1wB6i1dv3dyB).
- Local turn loop (prototype): turns follow the speed order; the enemy acts
  on its own turn after a short beat (the spider's Bite, 12 damage), and the
  player plays a card on theirs. Cards carry placeholder `play` data (move
  + damage, or block); a block soaks 8 from the next hit. The Run ends at
  zero health. Victory shows a centred loot screen: the enemy's drops
  (`loot` in `enemies.ts`, placeholder: Spider Fang, Silk Spool) as tiles
  and a Leave button. Drops aren't added to the inventory yet. Defeat
  offers Fight again or Leave. Dev
  builds fall back to a sample combat hand when the Deck hand is empty.
  Charges aren't spent. All of this moves server-side with real Runs. Static: nothing
  is playable until turns are resolved server-side. Enemy definitions live
  in `features/spawns/enemies.ts`.
- Location suggestions: Settings → Location lets a player suggest a skill hub
  or point of interest, at their position or a pin dropped (tapped or dragged) on the map. With no
  backend yet, it is sent as plain text through the share sheet (coordinates,
  an OpenStreetMap link, distance from the player and GPS accuracy). The draft
  lives in a Zustand store so it survives the modal closing for the pin drop.
- Hand-made places: game admins make skill hubs and landmarks in-game
  (Settings → Admin → Places, a suggestion's Create place, or Edit on a
  place's modal); the server keeps them (`GET /geo/places`, 2 km around the
  player). The map page draws them with the tile places' markers, tap and
  40 m reach, and hides any tile marker of the same type within 40 m of one,
  so a hand-made place replaces the tile place it sits on.
- An ember player marker. The camera is locked to the player — no panning, no
  tilt — zoom capped at 14–18, rotated by one-finger drag, with a compass to
  restore north (decision 9).
- HUD: a coin counter top left, and a five-slot bottom bar — Character
  (portrait), Inventory, Actions (centre, raised), Skills, Deck — with badges
  for new items and skill level-ups. Actions opens a grouped sheet rendered
  from the registry in `features/hud/actions.ts`. The map centres the player
  above the bar (decision 10). The inventory has icon tabs —
  Weapons (main/off hand), Armor, Accessories, Cards, Materials,
  Consumables, Misc — each a grid of item tiles with a per-tab search.
  Materials has skill sub-tabs (Combat, Fishing, Mining, Farming,
  Foraging), keyed by the item's `skill`, the same field that assigns a
  card to its skill's pool. Card tiles
  show remaining charges and grey out when faded. Contents are dev-only
  sample items (`SAMPLE_INVENTORY`) until an item system exists. Coins are hardcoded to 0 — there is no economy yet.
- The GPS-accuracy readout that used to sit at the top is gone: it told the
  *developer* something and the *player* nothing. `position.accuracy` is still
  returned by `usePlayerLocation`, so an admin or debug panel can surface it
  later without anything being re-plumbed.

Verified by `tsc --noEmit`, `eslint`, `expo-doctor` (21/21), a full Metro bundle,
and `validate:map` (6 game layers + 15 basemap overrides, 0 errors). Source and
source-layer names were read out of the live style JSON rather than recalled,
because a wrong name fails silently.

**The MapLibre map has never been seen on a screen.** The earlier Apple Maps
version ran on a phone; this one has not.

## Open threads

Roughly in dependency order.

1. **Run it in Expo Go and look at the map.** Most likely things to need tuning:
   the park and water colours against the dark basemap, the zoom bounds, marker
   size, and whether WebView gesture handling feels right for pan and twist.
2. **Backend module in cozy-app**: OSM extract import with PostGIS, a landmark
   table, tag→tier normalisation, and a "what has spawned near this coordinate"
   endpoint. This is the biggest remaining piece.
4. ~~Server-authoritative spawns~~ — done. Still open: GPS spoofing, the
   standard plague of location games; plausibility checks on movement speed
   are table stakes.
5. ~~Auth + token persistence~~ — sign-in with a geo-game account (email and
   password, separate from cozy-app's), tokens in `expo-secure-store`, done. Apple and Google sign-in
   could still come later.
6. **Encounter system.** Tap-resolved stat checks. Design pillar 4 constrains
   this hard.
7. **Bonfires and the souls-at-risk loop** — pillar 2 and 3, and the thing most
   worth prototyping early, because if the walk isn't fun nothing else matters.
