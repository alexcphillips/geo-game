import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button/Button";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";

type FarmHeaderProps = {
    title: string;
    /** "Farming Lv 4 · Fortune ×1.5". */
    subtitle: string;
    leaveLabel: string;
    onLeave: () => void;
    onOpenJournal: () => void;
};

/** Leave on the left, the farm's name and level in the middle, the journal on the right. */
export default function FarmHeader({ title, subtitle, leaveLabel, onLeave, onOpenJournal }: FarmHeaderProps) {
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Button label={`‹ ${leaveLabel}`} size="small" onPress={onLeave} accessibilityLabel={leaveLabel} style={styles.side} />
            <View style={styles.middle}>
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                </Text>
            </View>
            <Button label="Log" icon="quill-ink" size="small" onPress={onOpenJournal} accessibilityLabel="Farm journal" style={styles.side} />
        </View>
    );
}

const useStyles = createStyles((p) => ({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    side: {
        minWidth: 76,
    },
    middle: {
        flex: 1,
        alignItems: "center",
    },
    title: {
        color: p.text,
        fontFamily: FONTS.display,
        fontSize: 21,
    },
    subtitle: {
        color: p.textMuted,
        fontFamily: FONTS.bodyBold,
        fontSize: 12,
    },
}));
