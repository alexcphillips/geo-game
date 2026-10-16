import { StyleSheet, Text, View } from "react-native";
import { NOTIFICATION_CATEGORIES } from "@/features/notifications/notificationCategories";
import {
    isCategoryEnabled,
    useNotificationSettingsStore,
} from "@/features/notifications/notificationSettingsStore";
import { setCategoryEnabled } from "@/features/notifications/setCategoryEnabled";
import { colors } from "@/theme/colors";
import SettingsToggle from "./SettingsToggle";

/**
 * Settings → Notifications: one switch per kind of notification, straight
 * from the category list, so a new kind shows up here without touching this
 * page. Switching one off also cancels anything already scheduled for it.
 */
export default function NotificationsPage() {
    const overrides = useNotificationSettingsStore((state) => state.overrides);

    return (
        <View style={styles.page}>
            {NOTIFICATION_CATEGORIES.map((category) => {
                const enabled = isCategoryEnabled(overrides, category.id);
                return (
                    <SettingsToggle
                        key={category.id}
                        label={category.label}
                        hint={category.description}
                        value={enabled}
                        onToggle={() => void setCategoryEnabled(category.id, !enabled)}
                    />
                );
            })}
            <Text style={styles.note}>
                These choose what geo-game sends. Your phone&apos;s own settings can
                still turn notifications off entirely.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 12,
    },
    note: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        textAlign: "center",
    },
});
