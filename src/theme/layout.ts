/**
 * Shared layout constants.
 *
 * These exist so screens line up with each other rather than each guessing. The
 * bottom-centre control slot in particular is used by two different screens —
 * Actions on the world map's bottom bar, Close on the character screen — and
 * "same position" only stays true if both read the same number.
 */

/**
 * Gap above the home indicator, added on top of the safe-area inset.
 *
 * The inset alone leaves a control in the very corner of the screen, which both
 * looks cramped and collides with the iOS swipe-up gesture area.
 */
export const HOME_INDICATOR_CLEARANCE = 16;

/** Diameter of the circular bottom-centre button (the character screen's close). */
export const BOTTOM_ACTION_DIAMETER = 48;

/**
 * The world screen's bottom bar, above the bottom safe-area inset. The map
 * centres the player in what's left above it.
 */
export const BOTTOM_BAR_HEIGHT = 60;

/**
 * The bar's centre Actions button: a little larger than the other slots, and
 * raised so it overlaps the bar's top edge — it reads as "opens more".
 */
export const ACTIONS_BUTTON_DIAMETER = 54;

/** Gap kept between the bottom bar and anything floating just above it. */
export const ABOVE_BAR_GAP = 12;

/**
 * Screen transition duration, applied globally in the root layout.
 *
 * React Navigation defaults to 500ms, which is sluggish for screens the player
 * flicks in and out of while walking. Kept here next to the other
 * cross-screen numbers so it is tunable in one place.
 *
 * Only takes effect on iOS, and only for `fade`, `simple_push`,
 * `slide_from_bottom` and `fade_from_bottom` — not for `default`, `flip`, or
 * anything presented as a modal/sheet.
 */
export const TRANSITION_DURATION_MS = 160;

/**
 * Gap below the status bar for top-corner controls, on top of the safe-area
 * inset — the inset alone puts them level with the clock and battery.
 */
export const STATUS_BAR_CLEARANCE = 8;

/** Diameter of a round top-corner button (settings). */
export const TOP_BUTTON_DIAMETER = 44;

/** Gap between a top-corner button and the screen's side edge. */
export const TOP_BUTTON_EDGE_INSET = 12;

/** Gap between neighbouring top-corner buttons (settings, friends, inbox). */
export const TOP_BUTTON_GAP = 10;

/**
 * Where the map compass sits below the top-right settings button, from the
 * top safe-area inset. Derived so moving the button moves the compass too.
 */
export const COMPASS_TOP_OFFSET = STATUS_BAR_CLEARANCE + TOP_BUTTON_DIAMETER + 10;
