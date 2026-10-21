import type { ReactNode } from "react";
import { View } from "react-native";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import { Body, Hint } from "@/components/Text/Text";
import { createStyles, useTheme } from "@/theme/theme";

type EmptyStateProps = {
    title: string;
    /** What to do about it, e.g. "The Farmer sells seeds." */
    hint?: string;
    icon?: GameIconName;
    /** A button that fixes it, if there is one. */
    action?: ReactNode;
};

/** What a list shows when there's nothing in it: an icon, a line, and a way forward. */
export default function EmptyState({ title, hint, icon, action }: EmptyStateProps) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <View style={styles.empty}>
            {icon && <Icon name={icon} size={32} color={palette.textMuted} />}
            <Body center>{title}</Body>
            {hint && <Hint center>{hint}</Hint>}
            {action}
        </View>
    );
}

const useStyles = createStyles(() => ({
    empty: {
        alignItems: "center",
        gap: 6,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
}));
