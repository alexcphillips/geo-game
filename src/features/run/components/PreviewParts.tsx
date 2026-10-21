import { Fragment } from "react";
import { Text, View } from "react-native";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { displayName, statusColor } from "@/features/run/combat/playBattleLog";
import type { GeoIntentPart } from "@/lib/geo/contracts";
import { FONTS, type GameColors } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

/**
 * What a move or card will do, as icon-and-number parts: "⚔ 4 ×3", "🛡 5",
 * "Paralyzed". Shared by the enemy's intent badge and the hand's cards so
 * the two read as one language. `compact` is the card size.
 */
export default function PreviewParts({ parts, compact = false }: { parts: GeoIntentPart[]; compact?: boolean }) {
    const styles = useStyles();
    return (
        <View style={[styles.row, compact && styles.rowCompact]}>
            {parts.map((part, i) => (
                <Fragment key={i}>
                    {i > 0 && <View style={[styles.divider, compact && styles.dividerCompact]} />}
                    <Part part={part} compact={compact} />
                </Fragment>
            ))}
        </View>
    );
}

function Part({ part, compact }: { part: GeoIntentPart; compact: boolean }) {
    const styles = useStyles();
    const palette = useTheme();
    const { icon, color } = look(part, palette.game);
    return (
        <View style={styles.part}>
            <Icon name={icon} size={compact ? 11 : 15} color={color} />
            {part.kind === "attack" && (
                <>
                    <Text style={[styles.value, compact && styles.valueCompact]}>{part.damage}</Text>
                    {part.hits > 1 && <Text style={[styles.hits, compact && styles.hitsCompact]}>×{part.hits}</Text>}
                </>
            )}
            {(part.kind === "guard" || part.kind === "barrier" || part.kind === "heal") && (
                <Text style={[styles.value, compact && styles.valueCompact]}>
                    {part.kind === "heal" ? "+" : ""}
                    {part.amount}
                </Text>
            )}
            {part.kind === "status" && !compact && (
                <Text style={[styles.status, { color }]} numberOfLines={1}>
                    {displayName(part.statusId)}
                </Text>
            )}
        </View>
    );
}

function look(part: GeoIntentPart, game: GameColors): { icon: GameIconName; color: string } {
    switch (part.kind) {
        case "attack":
            return { icon: "sword-slice", color: game.damage };
        case "guard":
            return { icon: "checked-shield", color: game.guard };
        case "barrier":
            return { icon: "magic-shield", color: game.barrierGradient[1] };
        case "heal":
            return { icon: "heart-plus", color: game.heal };
        case "status":
            return {
                icon: part.self ? "upgrade" : "poison-bottle",
                color: statusColor(part.statusId) ?? game.effect,
            };
    }
}

/**
 * For screen readers: "3 hits of 4 damage, makes you Paralyzed". `actor` is
 * who does it: an enemy's intent, or the player's own card.
 */
export function describeParts(parts: GeoIntentPart[], actor: "enemy" | "player"): string {
    return parts
        .map((part) => {
            switch (part.kind) {
                case "attack":
                    return part.hits > 1 ? `${part.hits} hits of ${part.damage} damage` : `${part.damage} damage`;
                case "guard":
                    return `guard ${part.amount}`;
                case "barrier":
                    return `a barrier of ${part.amount}`;
                case "heal":
                    return `heals ${part.amount}`;
                case "status": {
                    const onYou = part.self === (actor === "player");
                    return `${onYou ? "makes you" : actor === "enemy" ? "becomes" : "makes it"} ${displayName(part.statusId)}`;
                }
            }
        })
        .join(", ");
}

const useStyles = createStyles((p) => ({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
    },
    rowCompact: {
        gap: 5,
    },
    part: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    divider: {
        width: 1,
        height: 14,
        backgroundColor: p.outline,
    },
    dividerCompact: {
        height: 10,
    },
    value: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    valueCompact: {
        fontSize: 12,
    },
    hits: {
        marginLeft: -1,
        color: p.textMuted,
        fontSize: 11,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    hitsCompact: {
        fontSize: 9,
    },
    status: {
        maxWidth: 90,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
    },
}));
