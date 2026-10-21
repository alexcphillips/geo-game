import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Badge from "@/components/Badge/Badge";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";

export type TabOption<T extends string> = {
    id: T;
    label: string;
    /** A count of what's waiting on that tab; nothing shows at 0. */
    badge?: number;
    /** Shown instead of the label (which stays for screen readers), e.g. item categories. */
    icon?: GameIconName;
    /** Nothing on that tab: drawn fainter, still tappable. */
    dim?: boolean;
};

type TabsProps<T extends string> = {
    tabs: readonly TabOption<T>[];
    value: T;
    onChange: (id: T) => void;
    style?: StyleProp<ViewStyle>;
};

/**
 * A row of tabs, as one inked strip with the open tab filled in. Used for a
 * modal's pages (Browse / Sell / Listings) wherever there are a few.
 */
export default function Tabs<T extends string>({ tabs, value, onChange, style }: TabsProps<T>) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={[styles.strip, style]} accessibilityRole="tablist">
            {tabs.map((tab) => {
                const isActive = tab.id === value;
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onChange(tab.id)}
                        style={({ pressed }) => [styles.tab, isActive && styles.active, pressed && !isActive && styles.pressed]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} new` : tab.label}
                    >
                        {tab.icon ? (
                            <Icon
                                name={tab.icon}
                                size={20}
                                color={isActive ? palette.onPrimary : tab.dim ? palette.track : palette.textMuted}
                            />
                        ) : (
                            <Text style={[styles.label, isActive && styles.activeLabel, tab.dim && styles.dimLabel]} numberOfLines={1}>
                                {tab.label}
                            </Text>
                        )}
                        <Badge count={tab.badge ?? 0} />
                    </Pressable>
                );
            })}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    strip: {
        flexDirection: "row",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        backgroundColor: p.surfaceAlt,
        borderWidth: 2.5,
        borderColor: p.outline,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    active: {
        backgroundColor: p.primary,
        borderWidth: 2,
        borderColor: p.outline,
    },
    pressed: {
        backgroundColor: p.track,
    },
    label: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 13,
    },
    activeLabel: {
        color: p.onPrimary,
    },
    dimLabel: {
        opacity: 0.5,
    },
}));
