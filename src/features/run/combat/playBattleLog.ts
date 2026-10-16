import type { Move, Side } from "@/features/run/fx/useCombatHits";
import type { GeoLogEntry } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/** The burst colour for a hit's element. */
function elementColor(element: string, crit: boolean): string {
    if (crit) return colors.effect;
    switch (element) {
        case "fire":
            return "#FFB04A";
        case "ice":
            return "#9FD0FF";
        case "lightning":
            return "#F4F1A0";
        default:
            return "#FFFFFF";
    }
}

/** "burning" → "Burning"; "frozen.skip" → "Frozen". */
export function displayName(id: string): string {
    const word = id.split(/[.:-]/)[0] ?? id;
    return word.charAt(0).toUpperCase() + word.slice(1);
}

/** A status's text colour by its id ("frozen.skip" → frozen's), or undefined for the default. */
export function statusColor(id: string): string | undefined {
    switch (id.split(/[.:-]/)[0]) {
        case "burning":
            return colors.statusBurning;
        case "frozen":
            return colors.statusFrozen;
        case "poison":
        case "poisoned":
            return colors.statusPoison;
        default:
            return undefined;
    }
}

/** What the log player needs from the screen. */
export type LogPlayback = {
    /** Which side a combatant id is on, or null for one not drawn. */
    sideOf: (combatantId: string) => Side | null;
    nameOf: (combatantId: string) => string;
    cardName: (cardId: string) => string;
    foodName: (foodId: string) => string;
    perform: (move: Move) => Promise<void>;
    dropGuard: (side: Side) => void;
    /** The line over the arena: whose turn, what they did. */
    narrate: (text: string | null) => void;
    setOrder: (order: string[]) => void;
    setActor: (combatantId: string) => void;
    /** A status's stacks on a combatant as the log reaches it, or null once it ends. */
    setStatus: (combatantId: string, statusId: string, stacks: number | null) => void;
};

/** A beat before an enemy acts, so its turn reads as a turn and not a reflex. */
const ENEMY_THINK_MS = 650;
/** A short pause between turns. */
const TURN_GAP_MS = 250;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Plays a server battle log as animation, entry by entry. The server has
 * already decided everything; this only shows it in order, at a pace that
 * reads as a fight.
 */
export async function playBattleLog(log: GeoLogEntry[], playback: LogPlayback): Promise<void> {
    const { sideOf, nameOf, perform, narrate } = playback;

    for (const entry of log) {
        switch (entry.type) {
            case "roundStart":
                playback.setOrder(entry.order);
                break;

            case "turnStart": {
                const side = sideOf(entry.actor);
                if (side) playback.dropGuard(side);
                playback.setActor(entry.actor);
                if (side === "enemy") {
                    narrate(`${nameOf(entry.actor)}'s turn`);
                    await wait(ENEMY_THINK_MS);
                }
                break;
            }

            case "turnSkipped": {
                const side = sideOf(entry.actor);
                const why = entry.reason ? displayName(entry.reason) : "Skipped";
                narrate(`${nameOf(entry.actor)} can't move · ${why}`);
                if (side) {
                    await perform({
                        kind: "label",
                        target: side,
                        text: why,
                        tone: "status",
                        color: entry.reason ? statusColor(entry.reason) : undefined,
                    });
                }
                await wait(TURN_GAP_MS);
                break;
            }

            case "cardPlayed":
                narrate(`${nameOf(entry.actor)} · ${playback.cardName(entry.cardId)}`);
                break;

            // The heal and any status follow as their own entries.
            case "foodEaten":
                narrate(`${nameOf(entry.actor)} · ate ${playback.foodName(entry.foodId)}`);
                break;

            case "enemyMove":
                narrate(`${nameOf(entry.actor)} · ${displayName(entry.moveId)}`);
                break;

            case "damage": {
                const source = sideOf(entry.source);
                const target = sideOf(entry.target);
                if (!target) break;
                const color = elementColor(entry.element, entry.crit);
                if (entry.isAttack && source && source !== target) {
                    await perform({
                        kind: "attack",
                        attacker: source,
                        delivery: entry.delivery === "projectile" ? "projectile" : "lunge",
                        slash: entry.delivery !== "projectile" && "single",
                        dealt: entry.amount,
                        blocked: entry.blocked,
                        crit: entry.crit,
                        burstColor: color,
                    });
                } else {
                    await perform({ kind: "hit", target, dealt: entry.amount, blocked: entry.blocked, color });
                }
                break;
            }

            case "heal": {
                const target = sideOf(entry.target);
                if (target) await perform({ kind: "heal", target, amount: entry.amount });
                break;
            }

            case "guard": {
                const side = sideOf(entry.target);
                if (side) await perform({ kind: "block", side, amount: entry.amount });
                break;
            }

            case "statusApplied": {
                playback.setStatus(entry.target, entry.statusId, entry.stacks);
                const target = sideOf(entry.target);
                if (target) {
                    await perform({
                        kind: "label",
                        target,
                        text: displayName(entry.statusId),
                        tone: "status",
                        color: statusColor(entry.statusId),
                    });
                }
                break;
            }

            case "statusRemoved": {
                playback.setStatus(entry.target, entry.statusId, null);
                const target = sideOf(entry.target);
                if (target) {
                    await perform({
                        kind: "label",
                        target,
                        text: `${displayName(entry.statusId)} ends`,
                        tone: "status",
                        color: statusColor(entry.statusId),
                    });
                }
                break;
            }

            // A proc shows as the damage or status it causes, which follows.
            case "proc":
            case "defeated":
            case "battleEnd":
                break;
        }
    }

    narrate(null);
}
