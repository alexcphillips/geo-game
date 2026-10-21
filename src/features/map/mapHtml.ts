import { GAME_ICON_VIEWBOX, GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import { PLACE_REACH_METRES, PLACE_TYPES } from "@/features/places/places";
import { SPRITE_SCALES, SPRITES } from "@/features/spawns/sprites";
import { GEO_WORLD_HABITAT_METRES, type GeoWorldHabitat, type GeoWorldWaterKind } from "@/lib/geo/contracts";
import {
    COMPASS_TOP_OFFSET,
    TOP_BUTTON_DIAMETER,
    TOP_BUTTON_EDGE_INSET,
} from "@/theme/layout";
import {
    BASEMAP_OVERRIDES,
    BASEMAP_STYLE_URL,
    MAP_COLORS,
    FISHING_WATER_LAYER_ID,
    GAME_LAYERS,
    LANDMARK_MARKER_LAYER_IDS,
    OSM_SOURCE_ID,
    PIER_LAYER_ID,
    SKILL_EDGE_LAYER_IDS,
    SKILL_MARKER_LAYERS,
    ZOOM,
    type Skill,
} from "@/theme/mapStyle";
import { PALETTES, type Mood } from "@/theme/palette";

/**
 * Everything on the page that changes with the mood, as CSS custom properties
 * on `body.mood-day` / `body.mood-dusk`. Markers are inked like the rest of
 * the UI: a hard outline, white icons on a coloured disc, parchment labels.
 */
function moodCss(mood: Mood): string {
    const p = PALETTES[mood];
    const day = mood === "day";
    return [
        `--land: ${MAP_COLORS[mood].land}`,
        `--panel: ${p.surface}`,
        `--text: ${p.text}`,
        `--outline: ${p.outline}`,
        `--ember: ${p.ember}`,
        `--you-glow: ${day ? "rgba(201, 97, 42, 0.18)" : "rgba(232, 169, 58, 0.18)"}`,
        // Spawns: a ring rippling out, and a pool under the sprite so it
        // separates from the ground.
        `--pulse: ${day ? "rgba(58, 48, 36, 0.75)" : "rgba(255, 255, 255, 0.95)"}`,
        `--pool-strong: ${day ? "rgba(58, 48, 36, 0.16)" : "rgba(255, 255, 255, 0.22)"}`,
        `--pool-soft: ${day ? "rgba(58, 48, 36, 0.05)" : "rgba(255, 255, 255, 0.08)"}`,
        // By day the cartoon outlines read on their own; at night a faint
        // light rim keeps dark art from sinking into the ground.
        `--sprite-filter: ${
            day
                ? "drop-shadow(0 3px 0 rgba(58, 48, 36, 0.3))"
                : "drop-shadow(0 0 1px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 2.5px rgba(255, 255, 255, 0.5)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7))"
        }`,
        `--attrib-bg: ${day ? "rgba(251, 243, 226, 0.8)" : "rgba(23, 21, 31, 0.8)"}`,
    ].join("; ");
}

/** Map-layer colours that change with the mood: the spawn and camp rings. */
const RING_COLORS: Record<Mood, { spawnLine: string; spawnFill: string; camp: string }> = {
    day: { spawnLine: PALETTES.day.outline, spawnFill: PALETTES.day.outline, camp: PALETTES.day.ember },
    dusk: { spawnLine: "#ffffff", spawnFill: "#ffffff", camp: PALETTES.dusk.ember },
};

/** On-map width of an enemy sprite; height follows the art's proportions. */
const SPAWN_SPRITE_WIDTH_PX = 56;

/**
 * Diameter of a place marker's badge — the coloured disc with the type's icon.
 * Shared by the CSS and the marker offset.
 */
const MARKER_BADGE_PX = 26;
const MARKER_ICON_PX = 16;

/**
 * Each place type's badge: its colour and its icon as inline SVG markup. The
 * icons are the same ones the place modal shows, from `places.ts`, so a
 * marker and the page it opens always match.
 */
const MARKER_BADGES = Object.fromEntries(
    Object.entries(PLACE_TYPES).map(([type, info]) => [
        type,
        {
            color: info.color,
            svg:
                `<svg viewBox="0 0 ${GAME_ICON_VIEWBOX} ${GAME_ICON_VIEWBOX}" width="${MARKER_ICON_PX}" height="${MARKER_ICON_PX}" aria-hidden="true">` +
                GAME_ICONS[info.icon].map((d) => `<path d="${d}"/>`).join("") +
                "</svg>",
        },
    ]),
);

/** The player's camp marker: the campfire, on an ember disc a size up from places'. */
const CAMP_BADGE_PX = 32;
const CAMP_BADGE_SVG =
    `<svg viewBox="0 0 ${GAME_ICON_VIEWBOX} ${GAME_ICON_VIEWBOX}" width="20" height="20" aria-hidden="true">` +
    GAME_ICONS.campfire.map((d) => `<path d="${d}"/>`).join("") +
    "</svg>";

/**
 * How far from a marker's point, in screen pixels, a tap still counts as
 * hitting it. The dots are 6–12px across; a fingertip is ~40px.
 */
const PLACE_TAP_RADIUS_PX = 28;

/**
 * MapLibre GL JS version pinned deliberately — the map is the game's whole
 * surface, and a silent CDN major bump would break it with no code change on
 * our side.
 */
const MAPLIBRE_VERSION = "4.7.1";
const MAPLIBRE_JS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

/** Messages the page posts back to React Native. */
export type MapMessage =
    | { type: "ready" }
    | { type: "error"; message: string }
    /** Pin-drop mode: where the player placed the pin. */
    | { type: "pin"; latitude: number; longitude: number }
    /** The player tapped their camp marker. */
    | { type: "camp" }
    /** The player tapped an enemy spawn. */
    | { type: "spawn"; id: string }
    /**
     * The nearest water edge to the player, after each settled pass, when it
     * changes; null when there's none in view within NEAR_WATER_METRES.
     */
    | { type: "water"; water: MapNearWater | null }
    /**
     * The nearest place of each other habitat within GEO_WORLD_HABITAT_METRES,
     * after each settled pass, when it changes.
     */
    | { type: "habitats"; places: MapNearPlaces }
    /**
     * The player tapped a landmark or skill hub marker, from the tiles or
     * hand-made. `name` is empty for unnamed areas; `skill` is null for
     * landmarks. The coordinates are where the marker is drawn, so React
     * Native can judge reach against them.
     */
    | {
          type: "place";
          /**
           * Stable while the place stays on the map, e.g. a lake's tile id.
           * Hand-made places send the id they were given in `setPlaces`.
           */
          id: string;
          name: string;
          skill: Skill | null;
          latitude: number;
          longitude: number;
          /** Fishing water areas only: raw facts for the fishing tier. */
          water: MapWater | null;
      };

/** The point on the nearest water's edge, and what that water is. */
export type MapNearWater = { latitude: number; longitude: number; kind: GeoWorldWaterKind };

/**
 * The nearest point of the nearest place of each habitat but water (which
 * has its own edge message), for themed spawns. Landmarks are POIs.
 */
export type MapNearPlaces = Partial<Record<Exclude<GeoWorldHabitat, "water">, { latitude: number; longitude: number }>>;

/** What the page can tell about a body of water, from the tiles alone. */
export type MapWater = {
    /** The best water class among the area's fragments, e.g. "lake". */
    kind: "pond" | "lake" | "river" | "dock" | "ocean";
    /** Approximate surface area of what's loaded, in square metres. */
    areaM2: number;
    /** A pier reaches into it. */
    hasPier: boolean;
};

/**
 * The map page.
 *
 * ## Why a WebView
 *
 * MapLibre's native module would perform better, but it is custom native code
 * and so cannot run in Expo Go — which would end both local testing and sharing
 * the game with family, and on iOS would require the paid Apple Developer
 * Program to distribute. `react-native-webview` *is* bundled in Expo Go, and
 * MapLibre GL JS inside it delivers the same map. See ARCHITECTURE.md
 * → decision 3c.
 *
 * ## What lives where
 *
 * This file is **plumbing only**: load MapLibre, apply whatever
 * `theme/mapStyle.ts` declares, and run the bridge. No colours, widths, or
 * layer definitions — those all live in the theme so there is exactly one place
 * to go to change how the world looks.
 *
 * ## Contract with React Native
 *
 * - Out: `window.ReactNativeWebView.postMessage` with a {@link MapMessage}.
 * - In: `window.gameMap.setPlayer(lng, lat)` — called via `injectJavaScript`.
 * - In: `window.gameMap.setAdminMode(enabled)` — frees the camera for
 *   debugging; see `setAdminMode` below.
 * - In: `window.gameMap.setBottomPadding(px)` — screen covered by the HUD's
 *   bottom bar; the camera centres the player in what's left above it.
 * - In: `window.gameMap.setSpawnRadius(metres | null)` — the ring around the
 *   player showing how far out enemies spawn; null hides it.
 * - In: `window.gameMap.setSpawns(spawns)` — enemies on the map, as
 *   `{ id, sprite, latitude, longitude }[]`. Replaces the previous set.
 * - In: `window.gameMap.startPinDrop(lng, lat, colour)` / `stopPinDrop()` —
 *   a pin to tap or drag into place (suggestions, places). Each placement
 *   posts a `pin`.
 * - In: `window.gameMap.setPlaces(places)` — hand-made places, as
 *   `{ id, name, skill, latitude, longitude }[]`, drawn with the tile places'
 *   markers. Replaces the previous set. A tile marker of the same type within
 *   reach of one is hidden; see `refreshLandmarks`.
 * - In: `window.gameMap.setCamp(lng, lat, metres)` / `setCamp(null)` — the
 *   player's camp, with a ring as far out as counts as being at it. Tapping
 *   it posts a `camp`.
 * - In: `window.gameMap.focusOn(lng, lat, colour)` / `clearFocus()` — flies
 *   the free camera to a point and marks it (admins reviewing suggestions).
 * - Out: tapping a landmark or skill marker posts a `place`. The page reports
 *   every tap; whether the player is close enough is React Native's call.
 *
 * Both sides are small and explicit on purpose; the bridge is the easiest place
 * in this architecture to accumulate mess.
 */
export function buildMapHtml(initialMood: Mood): string {
    // Serialised rather than hand-written into the template so the single
    // source of truth stays `theme/mapStyle.ts`.
    const config = JSON.stringify({
        styleUrl: BASEMAP_STYLE_URL,
        sourceId: OSM_SOURCE_ID,
        zoom: ZOOM,
        overrides: BASEMAP_OVERRIDES,
        ringColors: RING_COLORS,
        initialMood,
        gameLayers: GAME_LAYERS,
        landmarkLayers: LANDMARK_MARKER_LAYER_IDS,
        fishingWaterLayer: FISHING_WATER_LAYER_ID,
        pierLayer: PIER_LAYER_ID,
        skillLayers: SKILL_MARKER_LAYERS,
        skillEdgeLayers: SKILL_EDGE_LAYER_IDS,
        sprites: SPRITES,
        spriteScales: SPRITE_SCALES,
        markerBadges: MARKER_BADGES,
        campBadgeSvg: CAMP_BADGE_SVG,
        handMadeCoverMetres: PLACE_REACH_METRES,
        nearPlaceMetres: GEO_WORLD_HABITAT_METRES,
    });

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <link href="${MAPLIBRE_CSS}" rel="stylesheet" />
  <script src="${MAPLIBRE_JS}"></script>
  <style>
    body.mood-day { ${moodCss("day")}; }
    body.mood-dusk { ${moodCss("dusk")}; }
    html, body, #map {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: var(--land);
    }
    /* The player marker. Drawn in the DOM rather than as a map layer so it can
       later carry game state (hollowed, embered, in combat) with plain CSS. */
    .player {
      width: 26px;
      height: 26px;
      box-sizing: border-box;
      border-radius: 50%;
      background: var(--ember);
      border: 3px solid var(--outline);
      box-shadow: 0 0 0 3px var(--panel), 0 0 0 16px var(--you-glow);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .player-core {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--panel);
    }
    /* Place markers: an optional name label above a badge — a disc in the
       type's colour with its icon. Anchored at the bottom, offset so the
       badge's centre sits on the place. */
    /* Stacking: enemies at the bottom, then places, then camp, then the
       dropped and focus pins, so markers are never hidden under a sprite. MapLibre makes marker elements
       absolute, so z-index applies. */
    .landmark {
      z-index: 2;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .landmark-badge {
      width: ${MARKER_BADGE_PX}px;
      height: ${MARKER_BADGE_PX}px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2.5px solid var(--outline);
      color: #ffffff;
      box-shadow: 0 2px 0 var(--outline);
    }
    .landmark-badge svg {
      display: block;
      fill: currentColor;
    }
    /* A parchment pill, so names stay readable over any terrain. */
    .landmark-label {
      margin-bottom: 4px;
      max-width: 110px;
      padding: 1px 7px;
      border-radius: 9px;
      border: 2px solid var(--outline);
      background: var(--panel);
      text-align: center;
      font-family: -apple-system, Roboto, sans-serif;
      font-size: 10px;
      font-weight: 800;
      color: var(--text);
    }
    /* The player's camp: an ember disc with the campfire, drawn above the
       place markers. Taps are found by distance, like places, so it never
       blocks the one-finger rotate. */
    .camp {
      z-index: 3;
      pointer-events: none;
    }
    .camp-badge {
      width: ${CAMP_BADGE_PX}px;
      height: ${CAMP_BADGE_PX}px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--panel);
      border: 2.5px solid var(--outline);
      color: var(--ember);
      box-shadow: 0 2px 0 var(--outline);
    }
    .camp-badge svg {
      display: block;
      fill: currentColor;
    }
    /* Enemy spawns: the sprite, with two white rings rippling out from under
       it, staggered so there is always one on its way out. The marker is the
       tap target: 84px at street level, shrinking with the art when zoomed
       out (never under 44px) so far-off enemies don't cover the map.
       No \`position\` here: this is the marker element, and MapLibre places it
       with \`position: absolute\`. Overriding that puts every marker in normal
       flow, each pushed down by the ones before it, and they swim around as
       the map rotates. */
    .spawn {
      z-index: 1;
      width: max(44px, calc(84px * var(--spawn-scale, 1)));
      height: max(44px, calc(84px * var(--spawn-scale, 1)));
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    /* Everything drawn, in its own positioned box: the rings are placed
       against it, not the marker, so they sit on the sprite even before
       MapLibre's stylesheet (loaded from the CDN) makes the marker absolute.
       Scaled by --spawn-scale, which follows the zoom (\`spawnScale\`). */
    .spawn-body {
      position: relative;
      flex: none;
      width: 84px;
      height: 84px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scale(var(--spawn-scale, 1));
    }
    .spawn-body,
    .spawn-pulse,
    .spawn-sprite {
      pointer-events: none;
    }
    /* A soft pool of light under the sprite, so dark art separates from the
       dark ground even between pulses. */
    .spawn-body::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 84px;
      height: 84px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: radial-gradient(
        circle,
        var(--pool-strong) 0%,
        var(--pool-soft) 45%,
        transparent 70%
      );
    }
    .spawn-pulse {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 76px;
      height: 76px;
      box-sizing: border-box;
      border: 2.5px solid var(--pulse);
      border-radius: 50%;
      /* Centred and unseen outside the animation, so a ring that isn't
         running never shows at its unshifted spot, down-right of the sprite. */
      transform: translate(-50%, -50%);
      opacity: 0;
      /* A ring every 1.8s: each ripples out over the first half of its
         3.6s cycle, then rests unseen, and the second starts halfway. */
      animation: spawn-pulse 3.6s ease-out infinite;
    }
    /* A negative delay starts the second ring halfway through its cycle the
       moment the marker appears. A positive one would leave it outside the
       animation — no keyframe transform — for its first 1.8s. */
    .spawn-pulse.delayed {
      animation-delay: -1.8s;
    }
    @keyframes spawn-pulse {
      /* Starts at the sprite's edge (~30px out) so the whole ripple is
         visible, and fades by ~40px: a tight ring that stays with its enemy. */
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
      50%, 100% { transform: translate(-50%, -50%) scale(1.04); opacity: 0; }
    }
    .spawn-sprite {
      position: relative;
      width: ${SPAWN_SPRITE_WIDTH_PX}px;
      /* Per mood: see moodCss. */
      filter: var(--sprite-filter);
    }
    /* Location-suggestion pin. Colour is set inline from the chosen category.
       Anchored at its bottom tip, so the point is exactly where it was tapped. */
    /* The dropped pin. The marker element is a finger-sized drag handle;
       the pin is drawn inside it, because MapLibre positions markers with an
       inline transform that would wipe out the pin's own rotation. */
    .suggest-pin-handle {
      z-index: 4;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      cursor: grab;
    }
    .suggest-pin {
      z-index: 4;
      width: 22px;
      height: 22px;
      margin-bottom: 4px;
      box-sizing: border-box;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid var(--outline);
      box-shadow: 0 2px 0 var(--outline);
      pointer-events: none;
    }
    /* Attribution is required by OpenStreetMap's licence. Restyled to fit the
       palette, never removed. */
    .maplibregl-ctrl-attrib {
      background: var(--attrib-bg) !important;
      font-size: 9px;
    }
    .maplibregl-ctrl-attrib a { color: var(--ember); }

    /* MapLibre's controls live inside this page, so they can't read the React
       Native safe-area insets. The CSS env(safe-area-inset-*) values are the
       WebView's own equivalent, available because the viewport is set to
       viewport-fit=cover.

       The attribution is nudged clear of the home indicator in the bottom
       corner. */
    /* The compass sits in a column under the top-right settings button
       (React Native, outside this page). MapLibre gives each control a 10px
       margin, and its compass is 29px wide; these numbers line its centre up
       with the button's. */
    .maplibregl-ctrl-top-right {
      top: calc(env(safe-area-inset-top) + ${COMPASS_TOP_OFFSET - 10}px) !important;
      right: ${TOP_BUTTON_EDGE_INSET + TOP_BUTTON_DIAMETER / 2 - 29 / 2 - 10}px !important;
    }
    .maplibregl-ctrl-bottom-right {
      bottom: calc(env(safe-area-inset-bottom) + 54px) !important;
    }
  </style>
</head>
<body class="mood-${initialMood}">
  <div id="map"></div>
  <script>
    (function () {
      var CONFIG = ${config};
      var mood = CONFIG.initialMood;
      var MARKER_BADGE_PX = ${MARKER_BADGE_PX};
      var PLACE_TAP_RADIUS_PX = ${PLACE_TAP_RADIUS_PX};

      function send(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      window.onerror = function (message) {
        send({ type: "error", message: String(message) });
      };

      if (!window.maplibregl) {
        send({ type: "error", message: "MapLibre failed to load." });
        return;
      }

      var map = new maplibregl.Map({
        container: "map",
        style: CONFIG.styleUrl,
        center: [0, 0],
        zoom: CONFIG.zoom.initial,
        minZoom: CONFIG.zoom.min,
        maxZoom: CONFIG.zoom.max,

        // The camera is locked to the player: you cannot pan away from
        // yourself. Walking is how you see somewhere else — that is the game.
        // This is also what frees up one-finger drag to mean "rotate" below.
        dragPan: false,

        // No tilt. maxPitch is the hard guarantee; the two handler flags stop
        // the gestures that would otherwise fight it.
        pitch: 0,
        maxPitch: 0,
        pitchWithRotate: false,
        touchPitch: false,

        // Double-tap zoom off: with only three zoom levels available it is more
        // often an accident than an intent, and it fights the tap gesture that
        // will eventually select a landmark.
        doubleClickZoom: false,

        attributionControl: { compact: true },
      });

      // Belt and braces — the constructor flag should cover touch taps too, but
      // the handler is also disabled directly so a library change can't quietly
      // re-enable it.
      map.doubleClickZoom.disable();

      // Two fingers zoom, and only zoom, and always about the centre of the
      // screen.
      //
      // The "around: center" part is what keeps the camera on the player.
      // MapLibre's default is to zoom about the gesture's own midpoint, the way
      // a photo viewer does — which quietly *translates* the map whenever that
      // midpoint isn't dead centre. dragPan: false doesn't help: this isn't a
      // pan, it's a side effect of the zoom. The drift is small per pinch and
      // compounds, so zooming out, turning, and zooming back in used to leave
      // the player off-screen.
      //
      // enable() before disableRotation(): enable() reapplies the handler's
      // options, so disabling rotation afterwards is what makes it stick.
      map.touchZoomRotate.enable({ around: "center" });
      map.touchZoomRotate.disableRotation();

      // Same correction for the wheel/trackpad path. Not reachable on a phone,
      // but it is the identical bug and it keeps a desktop browser — the
      // quickest way to debug the map — behaving like the real thing.
      map.scrollZoom.enable({ around: "center" });

      map.addControl(new maplibregl.NavigationControl({
        showZoom: false,
        visualizePitch: false,
      }), "top-right");

      /**
       * One-finger rotation.
       *
       * MapLibre has no built-in one-finger rotate — its touch rotation is the
       * two-finger twist, which we disabled. But because the camera is locked to
       * the player, one-finger drag is otherwise unused, so it is free to mean
       * "turn the world".
       *
       * Rotation follows the finger's angle around the map's centre, like
       * turning a dial: whatever is under your finger stays under it, wherever
       * on the screen you grab. (Reading horizontal movement alone only feels
       * right below the centre — it runs backwards above it and does nothing
       * at the sides.)
       */
      (function enableOneFingerRotate() {
        // Movement below this is treated as a tap, so selecting something
        // doesn't nudge the bearing on the way.
        var DRAG_THRESHOLD_PX = 4;

        // Right by the centre a tiny move is a huge change of angle, so the
        // turn is ignored there rather than spinning the map.
        var DEAD_ZONE_PX = 30;

        var startX = 0;
        var startY = 0;
        var lastAngle = null;
        var isRotating = false;
        var isTracking = false;

        var surface = map.getCanvasContainer();

        /** The finger's angle around the map centre, in degrees; null in the dead zone. */
        function angleAt(touch) {
          var rect = surface.getBoundingClientRect();
          // The centre as drawn, padding included: what the camera turns about.
          var centre = map.project(map.getCenter());
          var dx = touch.clientX - rect.left - centre.x;
          var dy = touch.clientY - rect.top - centre.y;
          if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE_PX) return null;
          return (Math.atan2(dy, dx) * 180) / Math.PI;
        }

        surface.addEventListener("touchstart", function (event) {
          // Hand multi-touch straight to MapLibre's pinch-zoom handler, and in
          // admin mode hand one finger to dragPan instead. A finger on the
          // dropped pin is dragging it, not turning the map.
          var onPin = event.target && event.target.closest && event.target.closest(".suggest-pin-handle");
          if (isAdminMode || onPin || event.touches.length !== 1) {
            isTracking = false;
            isRotating = false;
            return;
          }

          isTracking = true;
          isRotating = false;
          startX = event.touches[0].clientX;
          startY = event.touches[0].clientY;
          lastAngle = angleAt(event.touches[0]);
        }, { passive: true });

        surface.addEventListener("touchmove", function (event) {
          if (!isTracking || event.touches.length !== 1) return;
          var touch = event.touches[0];

          if (!isRotating) {
            var moved = Math.hypot(touch.clientX - startX, touch.clientY - startY);
            if (moved < DRAG_THRESHOLD_PX) return;
            isRotating = true;
          }

          // Stops the WebView treating the drag as a scroll or pull-to-refresh.
          event.preventDefault();

          var angle = angleAt(touch);
          if (angle === null || lastAngle === null) {
            lastAngle = angle;
            return;
          }

          // Step by step rather than from the start, wrapped to ±180°, so
          // crossing the left side (where atan2 jumps 360°) doesn't spin it.
          var step = angle - lastAngle;
          if (step > 180) step -= 360;
          if (step < -180) step += 360;
          lastAngle = angle;

          // Screen angles grow clockwise and bearing turns the world the other
          // way, so the world follows the finger when the signs are opposed.
          map.setBearing(map.getBearing() - step);
        }, { passive: false });

        function endTracking() {
          isTracking = false;
          isRotating = false;
          lastAngle = null;
        }

        surface.addEventListener("touchend", endTracking, { passive: true });
        surface.addEventListener("touchcancel", endTracking, { passive: true });
      })();

      var playerElement = document.createElement("div");
      playerElement.className = "player";
      playerElement.appendChild(
        Object.assign(document.createElement("div"), { className: "player-core" })
      );

      var playerMarker = new maplibregl.Marker({ element: playerElement })
        .setLngLat([0, 0])
        .addTo(map);

      // The player's last known position, and null until the first real GPS
      // fix — which is also how the camera knows to jump there rather than ease
      // across the ocean from the null island at [0,0].
      var playerLngLat = null;

      // Admin mode: a free camera for debugging. Pan, unrestricted zoom, and
      // the player lock suspended. Everything it relaxes is restored on exit.
      var isAdminMode = false;
      var ADMIN_ZOOM = { min: 0, max: 22 };

      window.gameMap = {
        /** Day or dusk: repaints the basemap, the rings and the markers' CSS. */
        setMood: function (next) {
          if (next === mood) return;
          mood = next;
          document.body.className = "mood-" + mood;
          applyOverrides();
          paintRings();
        },

        setAdminMode: function (enabled) {
          isAdminMode = !!enabled;

          if (isAdminMode) {
            map.setMinZoom(ADMIN_ZOOM.min);
            map.setMaxZoom(ADMIN_ZOOM.max);
            map.dragPan.enable();
            // Zoom about the fingers again — there is no player lock to protect.
            map.touchZoomRotate.enable();
            map.touchZoomRotate.disableRotation();
            map.scrollZoom.enable();
            return;
          }

          map.dragPan.disable();
          map.touchZoomRotate.enable({ around: "center" });
          map.touchZoomRotate.disableRotation();
          map.scrollZoom.enable({ around: "center" });

          // setMin/MaxZoom clamp the current zoom into range themselves.
          map.setMinZoom(CONFIG.zoom.min);
          map.setMaxZoom(CONFIG.zoom.max);

          if (playerLngLat) map.easeTo({ center: playerLngLat, duration: 500 });
        },

        setSpawns: function (list) {
          spawns.set(list);
        },

        setPlaces: function (list) {
          handMadePlaces = list;
          refreshLandmarks();
        },

        /**
         * Keeps the camera's centre, and so the player, in the middle of the
         * part of the map not under the bottom bar. MapLibre's own padding,
         * so zoom and rotate still turn about the player.
         */
        setBottomPadding: function (px) {
          map.setPadding({ top: 0, right: 0, left: 0, bottom: px });
        },

        /** Draws the spawn radius around the player; null hides it. */
        setSpawnRadius: function (metres) {
          spawnRing.setRadius(metres);
        },

        startPinDrop: function (lng, lat, colour) {
          pinDrop.start([lng, lat], colour);
        },

        stopPinDrop: function () {
          pinDrop.stop();
        },

        /** Free camera only: anywhere else the player lock pulls it back. */
        focusOn: function (lng, lat, colour) {
          focusMarker.show([lng, lat], colour);
          map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 17), duration: 800 });
        },

        clearFocus: function () {
          focusMarker.hide();
        },

        /** The player's camp and its radius; null removes both. */
        setCamp: function (lng, lat, metres) {
          campMarker.set(lng === null ? null : [lng, lat], metres);
        },

        setPlayer: function (lng, lat) {
          playerMarker.setLngLat([lng, lat]);
          spawnRing.setCentre([lng, lat]);

          // The marker still tracks the player, but the camera is the admin's —
          // except for the very first fix, so the map doesn't open on [0,0].
          if (isAdminMode && playerLngLat) {
            playerLngLat = [lng, lat];
            // No camera move means no "idle", so edge-placed markers wouldn't
            // follow the player. Refresh them directly.
            refreshLandmarks();
            return;
          }

          if (playerLngLat) {
            map.easeTo({ center: [lng, lat], duration: 500 });
          } else {
            map.jumpTo({ center: [lng, lat], zoom: CONFIG.zoom.initial });
          }

          playerLngLat = [lng, lat];
        },
      };

      /**
       * The spawn radius: a ring on the ground around the player, as far out
       * as new enemies appear. A real circle in metres, drawn as a map layer,
       * so it stays true to the ground at any zoom and turns with the map.
       * Only ever touched after "ready", once the style has loaded.
       */
      var spawnRing = (function () {
        var SOURCE_ID = "spawn-radius";
        var STEPS = 96;
        var radius = null;
        var centre = null;

        function circle(lngLat, metres) {
          var lat = (lngLat[1] * Math.PI) / 180;
          var metresPerDegreeLat = 111320;
          var metresPerDegreeLng = 111320 * Math.cos(lat);
          var ring = [];
          for (var i = 0; i <= STEPS; i++) {
            var angle = (i / STEPS) * 2 * Math.PI;
            ring.push([
              lngLat[0] + (metres * Math.sin(angle)) / metresPerDegreeLng,
              lngLat[1] + (metres * Math.cos(angle)) / metresPerDegreeLat,
            ]);
          }
          return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
        }

        function render() {
          var data =
            radius && centre
              ? circle(centre, radius)
              : { type: "FeatureCollection", features: [] };

          var source = map.getSource(SOURCE_ID);
          if (source) {
            source.setData(data);
            return;
          }

          map.addSource(SOURCE_ID, { type: "geojson", data: data });
          map.addLayer({
            id: SOURCE_ID + "-fill",
            type: "fill",
            source: SOURCE_ID,
            paint: { "fill-color": CONFIG.ringColors[mood].spawnFill, "fill-opacity": 0.04 },
          });
          map.addLayer({
            id: SOURCE_ID + "-line",
            type: "line",
            source: SOURCE_ID,
            paint: {
              "line-color": CONFIG.ringColors[mood].spawnLine,
              "line-opacity": 0.55,
              "line-width": 1.5,
              "line-dasharray": [3, 2],
            },
          });
        }

        return {
          setRadius: function (metres) {
            radius = metres;
            render();
          },
          setCentre: function (lngLat) {
            centre = lngLat;
            if (radius) render();
          },
          /** Shared with the camp ring. */
          circle: circle,
        };
      })();

      /**
       * Enemy spawns. React Native owns the list; this keeps one DOM marker
       * per spawn id, moving existing ones rather than rebuilding them so the
       * pulse animation never restarts mid-ripple.
       */
      var spawns = (function () {
        var markers = {};

        /**
         * How big spawns draw at the current zoom: full size at the default
         * street-level zoom, about half a zoom level out, and a little bigger
         * zoomed in. One CSS variable on the map, so every spawn follows.
         */
        function spawnScale() {
          var scale = Math.pow(2, (map.getZoom() - CONFIG.zoom.initial) * 0.6);
          map.getContainer().style.setProperty(
            "--spawn-scale",
            String(Math.min(1.15, Math.max(0.4, scale)))
          );
        }
        spawnScale();
        map.on("zoom", spawnScale);

        function build(spawn) {
          var sprite = CONFIG.sprites[spawn.sprite];
          var wrapper = document.createElement("div");
          wrapper.className = "spawn";

          // stopPropagation keeps the tap from also reaching the map, where
          // it would count as a map click (and, in pin-drop mode, move the pin).
          // Camp and place markers win over the enemy under them: they draw
          // on top, so that's what the player meant to tap.
          wrapper.addEventListener("click", function (event) {
            event.stopPropagation();
            if (!pinDrop.isActive()) {
              var origin = map.getContainer().getBoundingClientRect();
              var point = { x: event.clientX - origin.left, y: event.clientY - origin.top };
              if (tapMarkerAt(point)) return;
            }
            send({ type: "spawn", id: spawn.id });
          });

          var body = document.createElement("div");
          body.className = "spawn-body";
          wrapper.appendChild(body);

          body.appendChild(
            Object.assign(document.createElement("div"), { className: "spawn-pulse" })
          );
          body.appendChild(
            Object.assign(document.createElement("div"), { className: "spawn-pulse delayed" })
          );

          if (sprite) {
            var image = document.createElement("img");
            image.className = "spawn-sprite";
            image.src = sprite.uri;
            image.alt = "";
            var scale = CONFIG.spriteScales[spawn.sprite];
            if (scale) image.style.width = ${SPAWN_SPRITE_WIDTH_PX} * scale + "px";
            body.appendChild(image);
          }

          return wrapper;
        }

        return {
          set: function (list) {
            var present = {};

            list.forEach(function (spawn) {
              present[spawn.id] = true;
              var lngLat = [spawn.longitude, spawn.latitude];

              if (markers[spawn.id]) {
                markers[spawn.id].setLngLat(lngLat);
                return;
              }

              markers[spawn.id] = new maplibregl.Marker({ element: build(spawn) })
                .setLngLat(lngLat)
                .addTo(map);
            });

            Object.keys(markers).forEach(function (id) {
              if (!present[id]) {
                markers[id].remove();
                delete markers[id];
              }
            });
          },
        };
      })();

      /**
       * Pin-drop mode for location suggestions and admins' places.
       *
       * A tap moves the pin there, or the pin can be dragged. Markers live
       * inside the canvas container, so the one-finger rotate skips touches
       * that start on the pin's handle; otherwise a drag would turn the map
       * too. Each placement goes straight back to React Native, which owns
       * the coordinates.
       */
      var pinDrop = (function () {
        var marker = null;
        /** When the last drag ended: the tap the drop also makes is ignored. */
        var lastDragEnd = 0;

        function report(lngLat) {
          send({ type: "pin", latitude: lngLat[1], longitude: lngLat[0] });
        }

        function onTap(event) {
          if (Date.now() - lastDragEnd < 400) return;
          var lngLat = [event.lngLat.lng, event.lngLat.lat];
          marker.setLngLat(lngLat);
          report(lngLat);
        }

        return {
          start: function (lngLat, colour) {
            if (marker) this.stop();

            var handle = document.createElement("div");
            handle.className = "suggest-pin-handle";
            var pin = document.createElement("div");
            pin.className = "suggest-pin";
            pin.style.background = colour;
            handle.appendChild(pin);

            // The rotated square's corner is its tip, at the handle's bottom
            // centre; "bottom" puts that tip on the coordinate. Tap anywhere
            // to put the pin there, or drag it.
            marker = new maplibregl.Marker({
              element: handle,
              anchor: "bottom",
              draggable: true,
            })
              .setLngLat(lngLat)
              .addTo(map);
            marker.on("dragend", function () {
              lastDragEnd = Date.now();
              var dropped = marker.getLngLat();
              report([dropped.lng, dropped.lat]);
            });

            map.on("click", onTap);
            report(lngLat);

            // Admins move pins that may be far off; the free camera can go
            // to them. A player's pin starts at their feet anyway.
            if (isAdminMode) {
              map.flyTo({ center: lngLat, zoom: Math.max(map.getZoom(), 17), duration: 800 });
            }
          },

          stop: function () {
            map.off("click", onTap);
            if (marker) marker.remove();
            marker = null;
          },

          isActive: function () {
            return marker !== null;
          },
        };
      })();

      /**
       * The player's camp: a marker, and a ring on the ground as far out as
       * counts as being at camp (packing, resting). The ring is a real circle
       * in metres, like the spawn radius.
       */
      var campMarker = (function () {
        var SOURCE_ID = "camp-radius";
        var marker = null;

        function render(lngLat, metres) {
          var data = lngLat
            ? spawnRing.circle(lngLat, metres)
            : { type: "FeatureCollection", features: [] };

          var source = map.getSource(SOURCE_ID);
          if (source) {
            source.setData(data);
            return;
          }

          map.addSource(SOURCE_ID, { type: "geojson", data: data });
          map.addLayer({
            id: SOURCE_ID + "-fill",
            type: "fill",
            source: SOURCE_ID,
            paint: { "fill-color": CONFIG.ringColors[mood].camp, "fill-opacity": 0.08 },
          });
          map.addLayer({
            id: SOURCE_ID + "-line",
            type: "line",
            source: SOURCE_ID,
            paint: {
              "line-color": CONFIG.ringColors[mood].camp,
              "line-opacity": 0.6,
              "line-width": 1.5,
            },
          });
        }

        return {
          set: function (lngLat, metres) {
            render(lngLat, metres);
            if (!lngLat) {
              if (marker) marker.remove();
              marker = null;
              return;
            }
            if (!marker) {
              var wrapper = document.createElement("div");
              wrapper.className = "camp";
              var disc = document.createElement("div");
              disc.className = "camp-badge";
              // Built from our own generated icon data, never from map content.
              disc.innerHTML = CONFIG.campBadgeSvg;
              wrapper.appendChild(disc);
              marker = new maplibregl.Marker({ element: wrapper }).setLngLat(lngLat).addTo(map);
            }
            marker.setLngLat(lngLat);
          },

          /** Whether a tap at this screen point hits the camp marker. */
          isAt: function (point) {
            if (!marker) return false;
            var anchor = map.project(marker.getLngLat());
            return Math.hypot(anchor.x - point.x, anchor.y - point.y) <= PLACE_TAP_RADIUS_PX;
          },
        };
      })();

      /**
       * A marked point to look at, e.g. a suggestion under review. Drawn like
       * the suggestion pin, but it ignores taps.
       */
      var focusMarker = (function () {
        var marker = null;

        return {
          show: function (lngLat, colour) {
            this.hide();
            var element = document.createElement("div");
            element.className = "suggest-pin";
            element.style.background = colour;
            marker = new maplibregl.Marker({ element: element, anchor: "bottom", offset: [0, -4] })
              .setLngLat(lngLat)
              .addTo(map);
          },

          hide: function () {
            if (marker) marker.remove();
            marker = null;
          },
        };
      })();

      /**
       * Hard guarantee that the camera stays on the player.
       *
       * Every gesture is already configured not to move the centre, so in
       * normal use this does nothing. It exists because "the camera is locked
       * to the player" is a design pillar, and enforcing it once here is more
       * durable than trusting that no handler ever drifts again — a MapLibre
       * upgrade or a new gesture shouldn't be able to break it silently.
       *
       * Drift is measured in screen pixels rather than degrees because a fixed
       * lat/lng epsilon means something different at every zoom level.
       */
      var DRIFT_TOLERANCE_PX = 1;

      function lockCameraToPlayer() {
        if (isAdminMode || !playerLngLat) return;

        var target = map.project(playerLngLat);
        var centre = map.project(map.getCenter());
        var dx = target.x - centre.x;
        var dy = target.y - centre.y;

        if (dx * dx + dy * dy <= DRIFT_TOLERANCE_PX * DRIFT_TOLERANCE_PX) return;

        // jumpTo rather than easeTo: this is a correction, not a camera move,
        // and it should never be something the player can see happening.
        // It re-fires moveend, but by then drift is zero, so this stops.
        map.jumpTo({ center: playerLngLat });
      }

      // moveend covers zoom and rotation too — both are moves as far as the
      // camera is concerned — and only fires once the gesture has settled.
      map.on("moveend", lockCameraToPlayer);

      /**
       * Each override/layer is applied independently inside its own try so one
       * bad entry reports itself and the rest of the map still renders. A
       * basemap that renames a layer should degrade, not go blank.
       */
      function applyOverrides() {
        CONFIG.overrides[mood].forEach(function (override) {
          if (!map.getLayer(override.layer)) return;

          applyProperties(override.layer, override.paint, map.setPaintProperty);
          applyProperties(override.layer, override.layout, map.setLayoutProperty);
        });

        function applyProperties(layerId, properties, setter) {
          if (!properties) return;

          Object.keys(properties).forEach(function (property) {
            try {
              setter.call(map, layerId, property, properties[property]);
            } catch (e) {
              send({
                type: "error",
                message: "override " + layerId + "." + property + ": " + e,
              });
            }
          });
        }
      }

      /** The rings are drawn lazily; recolour whichever exist now. */
      function paintRings() {
        var colours = CONFIG.ringColors[mood];
        [
          ["spawn-radius-fill", "fill-color", colours.spawnFill],
          ["spawn-radius-line", "line-color", colours.spawnLine],
          ["camp-radius-fill", "fill-color", colours.camp],
          ["camp-radius-line", "line-color", colours.camp],
        ].forEach(function (entry) {
          if (map.getLayer(entry[0])) map.setPaintProperty(entry[0], entry[1], entry[2]);
        });
      }

      function addGameLayers() {
        CONFIG.gameLayers.forEach(function (layer) {
          try {
            var spec = {
              id: layer.id,
              type: layer.type,
              source: CONFIG.sourceId,
              "source-layer": layer.sourceLayer,
            };

            if (layer.filter) spec.filter = layer.filter;
            if (layer.minzoom !== undefined) spec.minzoom = layer.minzoom;
            if (layer.paint) spec.paint = layer.paint;
            if (layer.layout) spec.layout = layer.layout;

            map.addLayer(spec);
          } catch (e) {
            send({ type: "error", message: "layer " + layer.id + ": " + e });
          }
        });
      }

      /**
       * Landmark and skill markers.
       *
       * DOM markers rather than a symbol layer: no sprite icon or exotic glyph
       * to depend on, full CSS control over the look, and the same mechanism the
       * real server-driven landmarks will use.
       *
       * Vector tiles split a polygon across tile boundaries, so the same park
       * arrives as several features. Fragments are merged and the bounding box
       * accumulated across all of them — taking one fragment's centre would drop
       * the marker at a tile edge instead of the middle of the park.
       *
       * Two kinds of marker:
       * - Landmarks (named only): a gold badge with its name above.
       * - Skill hubs (prototype): a badge in the skill's colour with its icon,
       *   plus a name if there is one. Merged by name when named; unnamed areas (a lake, a
       *   patch of rock) are merged with any touching fragment of the same
       *   skill, then dropped if too small to be worth walking to.
       *
       * Edge-placed areas (industrial land — see SKILL_EDGE_LAYER_IDS) put
       * their marker on the outline nearest the player instead of the centre,
       * so the marker never points people into private, fenced ground.
       *
       * Hand-made places (from the server, through setPlaces) use the same
       * markers. One hides any tile marker of its own type within reach of
       * it, so an admin's place replaces the tile one it sits on rather than
       * stacking on it. A hand-made fishing spot takes the facts of the water
       * it sits on (in its box, or by the marker), for the fishing tier.
       * Other types stay: a landmark beside a lake keeps both markers.
       */
      var markers = {};
      var handMadePlaces = [];

      /** Close enough for map markers: flat-earth metres between [lng, lat]s. */
      function metresBetween(a, b) {
        var dy = (a[1] - b[1]) * 111320;
        var dx = (a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
        return Math.hypot(dx, dy);
      }

      /**
       * Water edges this close to the player, in metres, are reported to
       * React Native for water spawns. The server decides what counts as
       * near; this only needs to be past its reach.
       */
      var NEAR_WATER_METRES = 100;
      /** The last water edge sent, so an unchanged one isn't sent again. */
      var lastNearWater;
      /** The last nearby places sent, so unchanged ones aren't sent again. */
      var lastNearPlaces;

      /** Unnamed skill areas smaller than this, in metres, get no marker. */
      var MIN_SKILL_AREA_METRES = 25;
      /** Fragments this close, in degrees (~1m), count as touching. */
      var TOUCH_EPSILON = 0.00001;

      function featureName(feature) {
        var props = feature.properties || {};
        return props.name_en || props.name || "";
      }

      function featureBounds(feature) {
        var geometry = feature.geometry;
        if (!geometry) return null;

        var bounds = null;

        function visit(coords) {
          if (typeof coords[0] === "number") {
            var lng = coords[0];
            var lat = coords[1];
            if (!bounds) {
              bounds = { minX: lng, minY: lat, maxX: lng, maxY: lat };
            } else {
              bounds.minX = Math.min(bounds.minX, lng);
              bounds.minY = Math.min(bounds.minY, lat);
              bounds.maxX = Math.max(bounds.maxX, lng);
              bounds.maxY = Math.max(bounds.maxY, lat);
            }
            return;
          }
          for (var i = 0; i < coords.length; i++) visit(coords[i]);
        }

        visit(geometry.coordinates);
        return bounds;
      }

      function extend(target, bounds) {
        target.minX = Math.min(target.minX, bounds.minX);
        target.minY = Math.min(target.minY, bounds.minY);
        target.maxX = Math.max(target.maxX, bounds.maxX);
        target.maxY = Math.max(target.maxY, bounds.maxY);
      }

      function touches(a, b) {
        return (
          a.minX <= b.maxX + TOUCH_EPSILON &&
          b.minX <= a.maxX + TOUCH_EPSILON &&
          a.minY <= b.maxY + TOUCH_EPSILON &&
          b.minY <= a.maxY + TOUCH_EPSILON
        );
      }

      /** Longest side of a bounding box, in metres. Good enough at city scale. */
      function sizeMetres(bounds) {
        var midLat = ((bounds.minY + bounds.maxY) / 2) * Math.PI / 180;
        var width = (bounds.maxX - bounds.minX) * 111320 * Math.cos(midLat);
        var height = (bounds.maxY - bounds.minY) * 110540;
        return Math.max(width, height);
      }

      /**
       * Repeatedly merges touching areas until none touch. Each area is
       * { bounds, polygons, classes }; polygons are kept for edge placement
       * and water info, classes (the fragments' tile classes) for water info. Quadratic,
       * but it runs once per settled camera over one screen of features.
       */
      function mergeTouching(areas) {
        var merged = true;
        while (merged) {
          merged = false;
          for (var i = 0; i < areas.length && !merged; i++) {
            for (var j = i + 1; j < areas.length; j++) {
              if (touches(areas[i].bounds, areas[j].bounds)) {
                extend(areas[i].bounds, areas[j].bounds);
                areas[i].polygons = areas[i].polygons.concat(areas[j].polygons);
                areas[i].classes = areas[i].classes.concat(areas[j].classes);
                areas.splice(j, 1);
                merged = true;
                break;
              }
            }
          }
        }
        return areas;
      }

      /** Best first: a merged area takes the best class among its fragments. */
      var WATER_CLASS_ORDER = ["ocean", "lake", "river", "dock", "pond"];

      /** Shoelace area of a ring, in square metres, near latitude \`lat\`. */
      function ringAreaM2(ring, lat) {
        var kx = 111320 * Math.cos((lat * Math.PI) / 180);
        var ky = 110540;
        var sum = 0;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          sum += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
        }
        return Math.abs(sum) / 2;
      }

      /**
       * Water facts for one merged fishing area: its best class, its area
       * (outer rings minus holes — tiles overlap by a small buffer, so this
       * runs slightly high, which is fine for tiers), and whether a pier
       * reaches into it (any pier vertex inside the water).
       */
      function waterInfo(area, piers) {
        var lat = (area.bounds.minY + area.bounds.maxY) / 2;
        var areaM2 = 0;
        area.polygons.forEach(function (polygon) {
          polygon.forEach(function (ring, index) {
            areaM2 += (index === 0 ? 1 : -1) * ringAreaM2(ring, lat);
          });
        });

        var kind = "pond";
        for (var c = 0; c < WATER_CLASS_ORDER.length; c++) {
          if (area.classes.indexOf(WATER_CLASS_ORDER[c]) !== -1) {
            kind = WATER_CLASS_ORDER[c];
            break;
          }
        }

        var hasPier = piers.some(function (pier) {
          var geometry = pier.geometry;
          if (!geometry) return false;
          // Piers come as lines or, where mapped as areas, as outlines.
          var lines = geometry.type === "LineString" ? [geometry.coordinates]
            : geometry.type === "MultiLineString" || geometry.type === "Polygon"
              ? geometry.coordinates
            : geometry.type === "MultiPolygon"
              ? [].concat.apply([], geometry.coordinates)
            : [];
          return lines.some(function (line) {
            return line.some(function (point) {
              return area.polygons.some(function (polygon) {
                return pointInPolygon(point, polygon);
              });
            });
          });
        });

        return { kind: kind, areaM2: Math.round(Math.max(0, areaM2)), hasPier: hasPier };
      }

      /**
       * Merges fragments that share a feature id; fragments without one fall
       * back to merging by touch.
       */
      function mergeById(areas) {
        var byId = {};
        var loose = [];
        areas.forEach(function (area) {
          if (area.waterId === undefined || area.waterId === null) {
            loose.push(area);
            return;
          }
          var existing = byId[area.waterId];
          if (!existing) {
            byId[area.waterId] = area;
            return;
          }
          extend(existing.bounds, area.bounds);
          existing.polygons = existing.polygons.concat(area.polygons);
          existing.classes = existing.classes.concat(area.classes);
        });
        return Object.keys(byId)
          .map(function (id) { return byId[id]; })
          .concat(mergeTouching(loose));
      }

      /** A feature's polygons as [ring[], ...] each, whatever its type. */
      function featurePolygons(feature) {
        var geometry = feature.geometry;
        if (!geometry) return [];
        if (geometry.type === "Polygon") return [geometry.coordinates];
        if (geometry.type === "MultiPolygon") return geometry.coordinates;
        return [];
      }

      function pointInRing(point, ring) {
        var inside = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          var xi = ring[i][0], yi = ring[i][1];
          var xj = ring[j][0], yj = ring[j][1];
          if (
            (yi > point[1]) !== (yj > point[1]) &&
            point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
          ) {
            inside = !inside;
          }
        }
        return inside;
      }

      /** Inside the outer ring and outside every hole. */
      function pointInPolygon(point, polygon) {
        if (!pointInRing(point, polygon[0])) return false;
        for (var h = 1; h < polygon.length; h++) {
          if (pointInRing(point, polygon[h])) return false;
        }
        return true;
      }

      /**
       * The point on an area's outline nearest the player.
       *
       * Tiles clip polygons at their edges, so a fragment's outline includes
       * cut lines that aren't real boundaries. Tiles overlap by a small buffer,
       * which means a cut line always lies *inside* the neighbouring fragment —
       * so any candidate inside another fragment is a cut, and is skipped.
       *
       * Distances use longitude scaled by cos(latitude), which is plenty
       * accurate across one screen.
       */
      function nearestEdgePoint(polygons, from) {
        var edge = nearestEdge(polygons, from);
        return edge ? edge.point : null;
      }

      /** As nearestEdgePoint, also saying which polygon the point is on. */
      function nearestEdge(polygons, from) {
        var scale = Math.cos((from[1] * Math.PI) / 180);
        var candidates = [];

        polygons.forEach(function (polygon, owner) {
          polygon.forEach(function (ring) {
            for (var i = 0; i + 1 < ring.length; i++) {
              var ax = ring[i][0] * scale, ay = ring[i][1];
              var bx = ring[i + 1][0] * scale, by = ring[i + 1][1];
              var px = from[0] * scale, py = from[1];
              var dx = bx - ax, dy = by - ay;
              var lengthSq = dx * dx + dy * dy;
              var t = lengthSq === 0
                ? 0
                : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
              var cx = ax + t * dx, cy = ay + t * dy;
              candidates.push({
                point: [cx / scale, cy],
                distanceSq: (px - cx) * (px - cx) + (py - cy) * (py - cy),
                owner: owner,
              });
            }
          });
        });

        candidates.sort(function (a, b) { return a.distanceSq - b.distanceSq; });

        for (var c = 0; c < candidates.length; c++) {
          var candidate = candidates[c];
          var isCut = polygons.some(function (polygon, index) {
            return index !== candidate.owner && pointInPolygon(candidate.point, polygon);
          });
          if (!isCut) return candidate;
        }
        return null;
      }

      /**
       * Sends React Native the nearest water edge in view, from every fishing
       * water feature, named or not. Sent only when it moves a few metres or
       * changes kind, or water comes into or out of range.
       */
      function reportNearWater(features) {
        var near = null;
        if (playerLngLat) {
          var polygons = [];
          var kinds = [];
          features.forEach(function (feature) {
            if (feature.layer.id !== CONFIG.fishingWaterLayer) return;
            var kind = (feature.properties || {}).class;
            featurePolygons(feature).forEach(function (polygon) {
              polygons.push(polygon);
              kinds.push(WATER_CLASS_ORDER.indexOf(kind) !== -1 ? kind : "pond");
            });
          });
          var edge = polygons.length > 0 ? nearestEdge(polygons, playerLngLat) : null;
          if (edge && metresBetween(playerLngLat, edge.point) <= NEAR_WATER_METRES) {
            near = { latitude: edge.point[1], longitude: edge.point[0], kind: kinds[edge.owner] };
          }
        }

        var last = lastNearWater;
        var same = last === undefined ? false
          : !last || !near ? last === near
          : last.kind === near.kind &&
            metresBetween([last.longitude, last.latitude], [near.longitude, near.latitude]) < 3;
        if (same) return;
        lastNearWater = near;
        send({ type: "water", water: near });
      }

      /**
       * Sends React Native the nearest place of each habitat — mining,
       * foraging, farming, landmark — within CONFIG.nearPlaceMetres, for
       * themed spawns. Measured to the nearest point of an area's box, so
       * standing in a big park counts as being on it. Fishing is left to
       * reportNearWater. Sent only when one moves a few metres, or comes
       * into or out of range.
       */
      function reportNearPlaces(present) {
        var best = {};
        if (playerLngLat) {
          Object.keys(present).forEach(function (key) {
            var entry = present[key];
            var habitat = entry.skill || "landmark";
            if (habitat === "fishing") return;
            var box = entry.bounds;
            var point = box
              ? [
                  Math.max(box.minX, Math.min(box.maxX, playerLngLat[0])),
                  Math.max(box.minY, Math.min(box.maxY, playerLngLat[1])),
                ]
              : entry.center;
            var metres = metresBetween(playerLngLat, point);
            if (metres > CONFIG.nearPlaceMetres) return;
            if (best[habitat] && best[habitat].metres <= metres) return;
            best[habitat] = { metres: metres, point: point };
          });
        }

        var near = {};
        Object.keys(best).forEach(function (habitat) {
          near[habitat] = { latitude: best[habitat].point[1], longitude: best[habitat].point[0] };
        });

        var last = lastNearPlaces;
        var same = last !== undefined &&
          Object.keys(last).length === Object.keys(near).length &&
          Object.keys(near).every(function (habitat) {
            var a = last[habitat], b = near[habitat];
            return !!a && metresBetween([a.longitude, a.latitude], [b.longitude, b.latitude]) < 3;
          });
        if (same) return;
        lastNearPlaces = near;
        send({ type: "habitats", places: near });
      }

      function buildMarkerElement(name, skill) {
        var badge = CONFIG.markerBadges[skill || "landmark"];
        var wrapper = document.createElement("div");
        wrapper.className = skill ? "landmark skill" : "landmark";

        if (name) {
          var label = document.createElement("div");
          label.className = "landmark-label";
          label.textContent = name;
          wrapper.appendChild(label);
        }

        var disc = document.createElement("div");
        disc.className = "landmark-badge";
        disc.style.background = badge.color;
        // Built from our own generated icon data, never from map content.
        disc.innerHTML = badge.svg;
        wrapper.appendChild(disc);

        return wrapper;
      }

      function refreshLandmarks() {
        var layerIds = CONFIG.landmarkLayers.concat(Object.keys(CONFIG.skillLayers));

        var features = map.queryRenderedFeatures({
          layers: layerIds.filter(function (id) {
            return !!map.getLayer(id);
          }),
        });

        var present = {};
        /** Unnamed areas, grouped by skill and placement. */
        var unnamedGroups = {};
        var piers = map.getLayer(CONFIG.pierLayer)
          ? map.queryRenderedFeatures({ layers: [CONFIG.pierLayer] })
          : [];

        reportNearWater(features);

        features.forEach(function (feature) {
          var bounds = featureBounds(feature);
          if (!bounds) return;

          var skill = CONFIG.skillLayers[feature.layer.id] || null;
          var name = featureName(feature);

          // Unnamed landmarks are almost always the courts and fields inside a
          // park, not somewhere worth walking to. Unnamed skill areas are
          // fine — most lakes and rock outcrops have no name in the tiles.
          if (!name) {
            if (!skill) return;
            var edge = CONFIG.skillEdgeLayers.indexOf(feature.layer.id) !== -1;
            var isWater = feature.layer.id === CONFIG.fishingWaterLayer;
            var groupKey = skill + (edge ? ":edge" : "") + (isWater ? ":water" : "");
            var group = unnamedGroups[groupKey] =
              unnamedGroups[groupKey] ||
              { skill: skill, edge: edge, water: isWater, areas: [] };
            group.areas.push({
              bounds: bounds,
              polygons: edge || isWater ? featurePolygons(feature) : [],
              classes: [(feature.properties || {}).class],
              waterId: isWater ? (feature.properties || {}).id : undefined,
            });
            return;
          }

          var key = (skill || "landmark") + ":" + name;
          if (present[key]) {
            extend(present[key].bounds, bounds);
          } else {
            present[key] = { bounds: bounds, name: name, skill: skill };
          }
        });

        Object.keys(unnamedGroups).forEach(function (groupKey) {
          var group = unnamedGroups[groupKey];

          // Water merges by the tiles' own feature id, which is the same in
          // every tile a lake spans: merging by touching boxes would swallow
          // a pond into the lake beside it and give it the lake's tier.
          var areas = group.water ? mergeById(group.areas) : mergeTouching(group.areas);

          areas.forEach(function (area) {
            var bounds = area.bounds;
            if (sizeMetres(bounds) < MIN_SKILL_AREA_METRES) return;

            // Keyed by the water's id, or else the area's centre, rounded, so
            // it keeps its marker across refreshes even as more fragments
            // load — and even when an edge marker slides along the outline
            // as the player walks.
            var key = area.waterId !== undefined
              ? groupKey + ":id:" + area.waterId
              : groupKey + ":at:" +
                ((bounds.minX + bounds.maxX) / 2).toFixed(3) + "," +
                ((bounds.minY + bounds.maxY) / 2).toFixed(3);

            var position = group.edge && playerLngLat
              ? nearestEdgePoint(area.polygons, playerLngLat)
              : null;

            present[key] = {
              bounds: bounds,
              name: "",
              skill: group.skill,
              position: position,
              water: group.water ? waterInfo(area, piers) : null,
            };
          });
        });

        Object.keys(present).forEach(function (key) {
          var entry = present[key];
          entry.center = entry.position || [
            (entry.bounds.minX + entry.bounds.maxX) / 2,
            (entry.bounds.minY + entry.bounds.maxY) / 2,
          ];
        });

        handMadePlaces.forEach(function (place) {
          var center = [place.longitude, place.latitude];
          var water = null;
          Object.keys(present).forEach(function (key) {
            var entry = present[key];
            if (entry.id || entry.skill !== place.skill) return;
            var isNear = metresBetween(entry.center, center) <= CONFIG.handMadeCoverMetres;
            // A lake's marker sits mid-lake, so a spot on its shore takes its
            // water if it's inside the lake's box, near its marker or not.
            var isInside = entry.bounds &&
              center[0] >= entry.bounds.minX && center[0] <= entry.bounds.maxX &&
              center[1] >= entry.bounds.minY && center[1] <= entry.bounds.maxY;
            if (entry.water && (isNear || isInside) && (!water || entry.water.areaM2 > water.areaM2)) {
              water = entry.water;
            }
            if (isNear) delete present[key];
          });
          // Name and type in the key: an edit builds a new marker.
          present["hm:" + place.id + ":" + (place.skill || "landmark") + ":" + place.name] = {
            id: place.id,
            center: center,
            name: place.name,
            skill: place.skill,
            water: water,
          };
        });

        reportNearPlaces(present);

        // Drop markers for places that scrolled out of view, or were removed.
        Object.keys(markers).forEach(function (key) {
          if (!present[key]) {
            markers[key].remove();
            delete markers[key];
          }
        });

        Object.keys(present).forEach(function (key) {
          var entry = present[key];
          var center = entry.center;

          // Refreshed every pass, not just on creation: water info grows as
          // more of a lake's tiles load.
          var place = {
            id: entry.id || key,
            name: entry.name,
            skill: entry.skill,
            water: entry.water || null,
          };

          if (markers[key]) {
            markers[key].setLngLat(center);
            markers[key].place = place;
            return;
          }

          markers[key] = new maplibregl.Marker({
            element: buildMarkerElement(entry.name, entry.skill),
            anchor: "bottom",
            // The badge is the element's bottom, so shift down by half of it
            // to put its centre — not the element's edge — on the place.
            offset: [0, MARKER_BADGE_PX / 2],
          })
            .setLngLat(center)
            .addTo(map);
          markers[key].place = place;
        });
      }

      /**
       * Taps on landmark and skill markers.
       *
       * Hit-tested here rather than with click listeners on the marker
       * elements: leaving them \`pointer-events: none\` keeps them from
       * swallowing the one-finger rotate. A tap hits a marker if it lands on
       * its label or badge, or within PLACE_TAP_RADIUS_PX of its point; the
       * closest wins when several qualify.
       */
      function placeAt(point) {
        var origin = map.getContainer().getBoundingClientRect();
        var best = null;
        var bestDistance = Infinity;

        Object.keys(markers).forEach(function (key) {
          var marker = markers[key];
          var anchor = map.project(marker.getLngLat());
          var distance = Math.hypot(anchor.x - point.x, anchor.y - point.y);

          var rect = marker.getElement().getBoundingClientRect();
          var onElement =
            point.x >= rect.left - origin.left &&
            point.x <= rect.right - origin.left &&
            point.y >= rect.top - origin.top &&
            point.y <= rect.bottom - origin.top;

          if (!onElement && distance > PLACE_TAP_RADIUS_PX) return;
          if (distance < bestDistance) {
            best = marker;
            bestDistance = distance;
          }
        });

        return best;
      }

      /**
       * Opens the camp or place marker at this screen point, if there is one.
       * Returns whether a marker took the tap. Used by map clicks and by
       * spawns, which sit under markers and hand them the tap first.
       */
      function tapMarkerAt(point) {
        // Camp first: it sits on top, often right over a place.
        if (campMarker.isAt(point)) {
          send({ type: "camp" });
          return true;
        }

        var marker = placeAt(point);
        if (!marker) return false;

        var lngLat = marker.getLngLat();
        send({
          type: "place",
          id: marker.place.id,
          name: marker.place.name,
          skill: marker.place.skill,
          water: marker.place.water,
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
        return true;
      }

      map.on("click", function (event) {
        // Mid pin-drop a tap places the pin; nothing else should open.
        if (pinDrop.isActive()) return;
        tapMarkerAt(event.point);
      });

      /**
       * Collapse the attribution to its (i) button after a few seconds, or on
       * the first touch, whichever comes first.
       *
       * It has to stay on the map: OSM's attribution guidelines don't allow
       * moving it into a menu, only collapsing it after a timer or map
       * interaction, so long as the (i) brings it back. MapLibre's compact
       * mode only collapses on a pan-drag, and panning is disabled here, so
       * without this it never collapses at all. The full credits also live in
       * the settings menu.
       */
      var ATTRIBUTION_VISIBLE_MS = 5000;

      function collapseAttribution() {
        var attribution = document.querySelector(
          ".maplibregl-ctrl-attrib.maplibregl-compact-show"
        );
        if (attribution) attribution.classList.remove("maplibregl-compact-show");
      }

      map.once("load", function () {
        setTimeout(collapseAttribution, ATTRIBUTION_VISIBLE_MS);
      });
      map.once("touchstart", collapseAttribution);
      map.once("mousedown", collapseAttribution);

      map.on("load", function () {
        addGameLayers();
        // After our layers, so the mood's colours reach our water too.
        applyOverrides();
        refreshLandmarks();
        send({ type: "ready" });
      });

      // "idle" fires once the map has finished moving and rendering, so this
      // runs after a pan/zoom settles rather than on every animation frame.
      map.on("idle", refreshLandmarks);

      map.on("error", function (event) {
        send({
          type: "error",
          message: (event && event.error && event.error.message) || "Map error",
        });
      });
    })();
  </script>
</body>
</html>`;
}
