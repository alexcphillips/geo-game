import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import { Hint } from "@/components/Text/Text";
import { CARD_SKILLS, type CardSkill } from "@/features/cards/cardSkills";
import { placeTitle, placeTypeInfo } from "@/features/places/places";
import { useCurrentHand } from "@/features/player/usePlayer";
import RunHand from "@/features/run/components/RunHand";
import RunScreen from "@/features/run/components/RunScreen";
import { SKILL_COLORS, type Skill } from "@/theme/mapStyle";
import { FONTS } from "@/theme/palette";
import { createStyles, MoodProvider } from "@/theme/theme";
import { useReportActivity } from "@/features/friends/presenceStore";

const isSkill = (value: string | undefined): value is Skill =>
    value !== undefined && value in SKILL_COLORS;

const isCardSkill = (value: Skill): value is Skill & CardSkill =>
    CARD_SKILLS.some((info) => info.id === value);

/**
 * A Run at a place — placeholder. Start on a place's modal lands here with its
 * name and skill; each skill's Run (a rock face, a fishing spot…) gets built
 * into this shell later. The hand is real, so it already shows the cards
 * you'd bring. Fishing has its own Run (`run/fishing`).
 */
export default function PlaceRunScreen() {
    // Gathering happens out in the day.
    return (
        <MoodProvider mood="day">
            <PlaceRunScreenContent />
        </MoodProvider>
    );
}

function PlaceRunScreenContent() {
    const styles = useStyles();
    const { name, skill: skillParam } = useLocalSearchParams<{ name?: string; skill?: string }>();
    const skill = isSkill(skillParam) ? skillParam : null;
    // A place Run is training its skill; one with no skill is just a visit.
    useReportActivity(skill ? "skilling" : "exploring", skill);
    const type = placeTypeInfo(skill);
    const title = placeTitle(name, skill);

    return (
        <RunScreen
            kind={type.label}
            leaveLabel="Leave"
            onLeave={() => router.back()}
            arena={
                <View style={styles.arena}>
                    <View style={[styles.badge, { borderColor: type.color }]}>
                        <Icon name={type.icon} size={40} color={type.color} />
                    </View>
                    <Text style={styles.name}>{title}</Text>
                    <Hint>This Run is coming soon.</Hint>
                </View>
            }
            hand={skill && isCardSkill(skill) ? <SkillHand skill={skill} /> : <View />}
        />
    );
}

/** The skill's current hand from the Deck, shown but not playable yet. */
function SkillHand({ skill }: { skill: CardSkill }) {
    return <RunHand cards={useCurrentHand(skill)} />;
}

const useStyles = createStyles((p) => ({
    arena: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 24,
    },
    badge: {
        width: 84,
        height: 84,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 42,
        borderWidth: 2,
        backgroundColor: p.surfaceAlt,
    },
    name: {
        color: p.text,
        fontSize: 20,
        fontFamily: FONTS.bodyHeavy,
        textAlign: "center",
    },
}));
