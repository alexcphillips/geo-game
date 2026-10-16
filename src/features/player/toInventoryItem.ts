import type { GameIconName } from "@/components/Icon/Icon";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import { CARD_SKILLS, type CardSkill } from "@/features/cards/cardSkills";
import type { EquipKind } from "@/features/character/characterSlots";
import type { InventoryItem, InventoryTabId, ItemStat } from "@/features/inventory/inventoryItems";
import { MAGIC_POWER } from "@/features/talismans/talismans";
import type { GeoInventoryEntry, GeoItemView, GeoPetState, GeoReforgeView } from "@/lib/geo/contracts";

/** Shown for an icon the server names but this build doesn't have yet. */
const FALLBACK_ICON: GameIconName = "knapsack";

const SLOT_LABELS: Record<EquipKind, string> = {
    mainHand: "Main hand",
    offHand: "Off hand",
    head: "Head",
    shoulders: "Shoulders",
    chest: "Chest",
    hands: "Hands",
    legs: "Legs",
    feet: "Feet",
    cloak: "Cloak",
    belt: "Belt",
    amulet: "Amulet",
    ring: "Ring",
};

function iconOf(name: string): GameIconName {
    return name in GAME_ICONS ? (name as GameIconName) : FALLBACK_ICON;
}

function cardSkillOf(skill: string | undefined): CardSkill | undefined {
    return CARD_SKILLS.find((info) => info.id === skill)?.id;
}

/** Which inventory tab a kind of item lives in. */
export function tabOf(def: GeoItemView): InventoryTabId {
    switch (def.kind) {
        case "card":
            return "cards";
        case "equipment":
            if (def.slot === "ring" || def.slot === "amulet") return "accessories";
            return def.slot === "mainHand" || def.slot === "offHand" ? "weapons" : "armour";
        case "talisman":
            return "accessories";
        case "material":
            return "materials";
        case "consumable":
            return "consumables";
        case "misc":
        case "petItem":
            return "misc";
        case "pet":
            return "pets";
    }
}

/** A pet copy's rows: its level, then what it gives now, abilities included. */
function petStats(pet: GeoPetState): ItemStat[] {
    return [
        { label: "Level", value: `${pet.level} / ${pet.maxLevel}` },
        ...pet.stats,
        ...pet.abilities.flatMap((ability) => ability.stats.map((stat) => ({ label: `${stat.label} (${ability.name})`, value: stat.value }))),
    ];
}

/** Rows the app adds in front of the server's: where it's worn, where it's from. */
function leadingStats(def: GeoItemView): ItemStat[] {
    switch (def.kind) {
        case "equipment":
            return def.slot ? [{ label: "Slot", value: SLOT_LABELS[def.slot] }] : [];
        case "talisman":
            return [
                { label: "Slot", value: "Talisman" },
                { label: "Magic Power", value: `+${MAGIC_POWER[def.rarity]}` },
            ];
        case "material": {
            const skill = CARD_SKILLS.find((info) => info.id === def.skill);
            return skill ? [{ label: "Source", value: skill.label }] : [];
        }
        default:
            return [];
    }
}

/** A reforge's rows for this item's rarity, each marked as the reforge's. */
function reforgeStats(def: GeoItemView, reforge: GeoReforgeView | undefined): ItemStat[] {
    if (!reforge) return [];
    return reforge.stats[def.rarity].map((stat) => ({ label: `${stat.label} (${reforge.name})`, value: stat.value }));
}

/**
 * One inventory entry from the server, joined with its item definition, as
 * the screens draw it. The entry id becomes the item's id, so two copies of
 * a card stay two items. A reforged copy is named for its reforge ("Heavy
 * Iron Helm") and lists its rows after the item's own.
 */
export function toInventoryItem(
    entry: GeoInventoryEntry,
    def: GeoItemView,
    reforges: Record<string, GeoReforgeView> = {},
): InventoryItem {
    const isStack = def.kind === "material" || def.kind === "consumable" || def.kind === "misc" || def.kind === "petItem";
    const pet = entry.pet ?? undefined;
    const reforge = entry.reforge ? reforges[entry.reforge] : undefined;
    return {
        id: entry.id,
        itemId: def.id,
        name: reforge ? `${reforge.name} ${def.name}` : def.name,
        tab: tabOf(def),
        icon: iconOf(def.icon),
        rarity: def.rarity,
        skill: cardSkillOf(def.skill),
        equipSlot: def.kind === "talisman" ? "talisman" : def.kind === "equipment" ? def.slot : undefined,
        quantity: isStack ? entry.quantity : undefined,
        charges:
            def.kind === "card"
                ? { remaining: entry.chargesLeft ?? 0, max: def.maxCharges ?? entry.chargesLeft ?? 0 }
                : undefined,
        description: def.description,
        stats: pet ? petStats(pet) : [...leadingStats(def), ...def.stats, ...reforgeStats(def, reforge)],
        reforge: reforge?.id,
        effects: pet
            ? pet.abilities.filter((ability) => ability.unlocked).map((ability) => `${ability.name}: ${ability.description}`)
            : def.effects.length > 0
              ? def.effects
              : undefined,
        unlocksCards: def.unlocksCards,
        sellValue: def.sellValue,
        obtainedAt: entry.obtainedAt,
        quality: def.quality,
        soulbound: def.soulbound,
        petInfo: def.pet,
        pet,
    };
}

/**
 * An item nobody owns yet, as on a Market listing: the definition
 * alone, at full charges.
 */
export function catalogueItem(def: GeoItemView, id: string): InventoryItem {
    return toInventoryItem(
        { id, itemId: def.id, quantity: 1, chargesLeft: def.maxCharges ?? null, reforge: null, pet: null, obtainedAt: new Date().toISOString() },
        def,
    );
}
