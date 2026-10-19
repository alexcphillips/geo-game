/**
 * The palette. Ash, rust, and ember — the world is cold and the only warm
 * things in it are bonfires and your own HUD.
 *
 * Every colour the app uses is declared here. Screens and components reference
 * these names, never hex literals, so the whole game can be re-graded in one
 * file.
 */
export const colors = {
    /** Deepest background — behind everything. */
    void: "#0B0908",
    /** Panel and sheet backgrounds. */
    surface: "#14100F",
    /** Raised surface, e.g. a card on a panel. */
    surfaceRaised: "#1F1917",
    /** Hairline dividers. */
    border: "#2E2523",

    textPrimary: "#D8CFC4",
    textSecondary: "#8A7D74",
    /** For text on top of an ember-coloured fill. */
    textOnEmber: "#14100F",

    /**
     * Item effects — passive bonuses like "+10% ash chance". Yellow rather
     * than ember so an effect never reads as a button or a name.
     */
    effect: "#E3C55A",

    /**
     * Damage taken, as floating numbers. A bright, warm red so it reads
     * against both the dark arena and the white hit flash behind it.
     */
    damage: "#FF4D3D",

    /**
     * Item rarity, lowest to highest. Shown as a tile's border and the label
     * on the detail page. Conventional order (grey → green → blue → purple →
     * gold) so players read it without being taught.
     */
    rarityCommon: "#6E655E",
    rarityUncommon: "#5DA84A",
    rarityRare: "#3F8FD6",
    rarityEpic: "#9A62C9",
    rarityLegendary: "#E0A93A",

    /** Bonfire orange. Reserved for checkpoints and the player's own marker. */
    ember: "#C9641E",
    emberBright: "#E8873C",
    /** Humanity red — danger, damage, death. */
    blood: "#8C2420",
    /**
     * Toast stripes, by kind. Brighter than `blood` and the bars, because a
     * thin stripe has to read at a glance.
     */
    toastError: "#D9483B",
    toastSuccess: "#5DA84A",
    toastInfo: "#E8873C",
    /** Coins. Warm gold, a shade deeper than effect text so they never blur. */
    coins: "#E0B34A",

    /**
     * Market listing types, on a row's stripe and badge. Auctions are a cool
     * teal so they never read as a price; buy-it-now shares the coins' gold,
     * since you pay that number now. Neither is a rarity colour's hue, and the
     * badge always carries a word too.
     */
    listingAuction: "#4FB3A9",
    listingBuyNow: "#E0B34A",

    /**
     * Vital bars, matched to Dark Souls 3's — far darker and more
     * desaturated than a conventional game HUD. Bars are meant to sit
     * quietly in the corner and only read as alarming when they drain.
     */
    health: "#6B211B",
    /** Shared empty-bar colour, so a drained bar reads the same either way. */
    barTrack: "#241F1D",

    /**
     * Vertical gradient stops for a bar's fill: lit top edge, base colour
     * through the middle, shadowed bottom. Three stops rather than two because
     * a two-stop ramp reads as a flat tint, while light→base→dark reads as a
     * rounded surface catching light.
     */
    healthGradient: ["#8C3127", "#6B211B", "#49150F"],
    /** A barrier over the health bar: gold, lit the same way. */
    barrierGradient: ["#F2D978", "#D9B24A", "#9C7A26"],
    /** The bar's frame, lit from above like the fills. */
    barFrameGradient: ["#4C443C", "#1A1614"],

    /**
     * Cartographic colours for gameplay-relevant terrain. These are part of the
     * palette rather than basemap tuning: the player needs to identify water
     * at a glance because things spawn at it.
     *
     * Water is a dark, desaturated slate-teal: it differs from the warm grey
     * ground mainly in hue, only a little in brightness, so it reads as cold
     * water without glowing. It was a bright cyan (#1F93AB), which outshone
     * everything else on the map.
     */
    water: "#26434A",

    /**
     * Skill hub markers — prototype. Plain, saturated hues so the three skills
     * are told apart at a glance; they will want regrading once skills have a
     * real visual identity.
     */
    skillMining: "#C8473B",
    skillFishing: "#3F8FD6",
    skillFarming: "#5DA84A",
    skillForaging: "#A9793F",

    /**
     * Mayor candidates, on the border of their election tab — placeholders,
     * like the candidates. Distinct hues so the tabs are told apart, and kept
     * off the exact rarity colours so a candidate never reads as an item tier.
     */
    candidateMarlon: "#5E9C9E",
    candidateSiegmoor: "#4C7FB8",
    candidateMalphas: "#B0413A",
    candidateLuna: "#B9A6E0",

    /**
     * Chest tiers, on a chest's icon and border — placeholders. Wood, gold,
     * ruby and void, cheapest to dearest; a chest always carries its name
     * too, so none relies on its colour alone.
     */
    chestPlain: "#9C7A55",
    chestGold: "#E0B34A",
    chestRuby: "#D2364F",
    chestVoid: "#8B5CF0",

    /**
     * Combat statuses, on their names under a combatant and in floating
     * labels. Hue tells the status at a glance; the name is always there too.
     */
    statusBurning: "#FF8A2B",
    statusFrozen: "#5FE3F0",
    statusPoison: "#C9A0F0",

    /**
     * Fish quality tiers — placeholders. Shown as a metal rim around a fish,
     * never as its fill, so a tier never clashes with the rarity colours. Ruby
     * sits off `chestRuby` so a Ruby fish never reads as a chest.
     */
    tierBronze: "#C98A52",
    tierSilver: "#C9D2DA",
    tierGold: "#F2C94C",
    tierRuby: "#E3245E",

    /**
     * The fishing line's Tension: teal in the sweet zone, yellow over it, red
     * near the snap, grey when slack. The zone band is the teal at low alpha.
     */
    tensionZone: "#4FB3BF",
    tensionHigh: "#E3B94C",
    tensionDanger: "#E2574C",
    tensionSlack: "#8FB0B6",
    /** Fish stamina, draining as it tires. */
    fishStamina: "#74C27A",

    /**
     * The fishing scene, at dusk: a dark sky warming at the horizon, water a
     * deeper version of the map's slate-teal, and foam for ripples.
     */
    sceneSkyTop: "#121A2E",
    sceneSkyHorizon: "#5A3A30",
    sceneWaterTop: "#1B4650",
    sceneWaterDeep: "#050F14",
    sceneFoam: "#9FE0E7",
    /**
     * The rod: a dark carbon blank with a cool sheen, a cork grip, and a
     * steel reel and guides. The tip wrap uses `emberBright`.
     */
    rodBlank: "#1C2127",
    rodHighlight: "#6E8494",
    rodGrip: "#A9825A",
    rodReel: "#9AA3AD",
    /** The bobber: red over white, like the real thing. */
    bobber: "#E2574C",
    bobberBelly: "#F4EFE4",

    /**
     * The mining face, side-on: hidden rock is darkest, revealed stone and
     * granite a shade lighter, dug-out tiles a near-black cavity. Ore and gem
     * hues are the minerals' own, in mining content, like fish colours.
     */
    rockHidden: "#1E1A18",
    rockStone: "#4A423D",
    rockGranite: "#5F5A63",
    rockOpen: "#0A0807",
    rockBedrock: "#121014",
    rockRubble: "#3A322C",
    /** A fault line's dashed edge, and the rockfall warning. */
    faultLine: "#E3B94C",
    rockfall: "#E2574C",
    /** The sparkle on hidden ore or gems. */
    glint: "#FFF3B0",
    gas: "#9BD46A",
    /** Stability, full to collapsing. */
    stabilityFull: "#74C27A",
    stabilityLow: "#E2574C",

    /**
     * The farm plot: soil goes from dry tan to dark loam to waterlogged
     * blue-brown, so a bed's moisture reads before its number.
     */
    soilDry: "#8A6B44",
    soilMoist: "#4E3A26",
    soilWet: "#2E3440",
    moisture: "#4FA3D6",
    nutrients: "#B98ADF",
    cropLeaf: "#5DA84A",
    pest: "#E2574C",
    weed: "#9C9A3C",
    frostCover: "#BFE4F2",
    /** A ripe crop's rim: ready to harvest, or to push. */
    cropRipe: "#E3C55A",
    /** Soil types, as a dot on the tile. */
    soilRich: "#6FCF5A",
    soilBoggy: "#4FA3D6",
    soilCursed: "#B56BD8",
    /** Nuclear waste: a sick glow over the soil. */
    waste: "#3F5A1E",
    wasteGlow: "#B6E84A",
    /** A farm structure: weathered wood. */
    structure: "#D9C7A3",
    /** A mutation's leaves: something not quite natural. */
    cropMutant: "#C77DFF",
    /** A rotten crop: a sickly brown wash over the soil. */
    cropRotten: "#5C4A2E",
    /** A tile not yet bought, and the dashed rim of one that can be. */
    tileLocked: "#171311",
    tileUnlockable: "#6E655E",

    /**
     * The woodland walk: canopy greens, a warm path, and the daylight bar
     * that runs from noon yellow to dusk red.
     */
    woodCanopy: "#1E3324",
    woodFloor: "#2B2419",
    woodPath: "#6B5638",
    daylight: "#F2C94C",
    dusk: "#D9634A",
    noise: "#E39B4C",
    basket: "#C9A26B",
    toxic: "#C04BD0",
} as const;

export type ColorName = keyof typeof colors;
