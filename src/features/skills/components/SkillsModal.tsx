import { StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { colors } from "@/theme/colors";
import { useSkillXp } from "@/features/player/usePlayer";
import { combatDamageBonus, skillProgress, SKILLS, type SkillInfo } from "../skills";

const GRID_COLUMNS = 3;
const GRID_GAP = 8;

type SkillsModalProps = {
    onClose: () => void;
};

/**
 * Skills: every skill, its level, and a meter for progress to the next level,
 * split into world skills (trained at real places) and menu skills. XP comes
 * from the server (combat XP from kills, so far). The tiles are inert for
 * now; each will open its own page — XP, unlocks, perks —
 * once there is something to show.
 */
export default function SkillsModal({ onClose }: SkillsModalProps) {
    return (
        <Modal title="Skills" size="fill" showBack closePlacement="footer" onClose={onClose}>
            <View style={styles.body}>
                <Section title="World" skills={SKILLS.filter((skill) => skill.kind === "world")} />
                <Section title="Menu" skills={SKILLS.filter((skill) => skill.kind === "menu")} />
            </View>
        </Modal>
    );
}

function Section({ title, skills }: { title: string; skills: SkillInfo[] }) {
    const xp = useSkillXp();

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.grid}>
                {skills.map((skill) => {
                    const { level, progress, isMax } = skillProgress(xp[skill.id] ?? 0);
                    const percent = Math.floor(progress * 100);
                    const bonus = skill.id === "combat" ? `+${combatDamageBonus(level)}% damage` : null;
                    return (
                        <View key={skill.id} style={styles.cell}>
                            <View
                                style={styles.tile}
                                accessible
                                accessibilityLabel={[
                                    `${skill.label}, level ${level}`,
                                    isMax ? "max level" : `${percent}% to level ${level + 1}`,
                                    bonus,
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            >
                                <Icon name={skill.icon} size={28} color={skill.color} />
                                <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
                                    {skill.label}
                                </Text>
                                <Text style={styles.level}>Lv {level}</Text>
                                {bonus && <Text style={styles.bonus}>{bonus}</Text>}
                                <View style={styles.meter}>
                                    <View style={styles.track}>
                                        <View
                                            style={[
                                                styles.fill,
                                                {
                                                    width: `${percent}%`,
                                                    backgroundColor: skill.color,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.percent}>{isMax ? "Max" : `${percent}%`}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    body: {
        gap: 18,
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    // Negative margin cancels the cells' outer padding, so tiles line up with
    // the section titles.
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        margin: -GRID_GAP / 2,
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
    tile: {
        alignItems: "center",
        gap: 4,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 12,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "600",
    },
    level: {
        color: colors.effect,
        fontSize: 11,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    // Combat's damage bonus from its level, in effect-yellow like other bonuses.
    bonus: {
        color: colors.effect,
        fontSize: 9,
        fontWeight: "600",
    },
    meter: {
        alignSelf: "stretch",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 4,
    },
    track: {
        flex: 1,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.void,
        overflow: "hidden",
    },
    fill: {
        height: "100%",
        borderRadius: 3,
    },
    // Fixed width so every tile's bar is the same length, 0% to 100%.
    percent: {
        width: 28,
        textAlign: "right",
        color: colors.textSecondary,
        fontSize: 10,
        fontVariant: ["tabular-nums"],
    },
});
