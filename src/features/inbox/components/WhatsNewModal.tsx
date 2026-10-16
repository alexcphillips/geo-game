import { ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import type { GeoAnnouncement } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { ANNOUNCEMENT_KINDS } from "../mail";

type WhatsNewModalProps = {
    changelog: GeoAnnouncement;
    onClose: () => void;
};

/** Shown once after an update: the changelog for it. It stays in the inbox too. */
export default function WhatsNewModal({ changelog, onClose }: WhatsNewModalProps) {
    const info = ANNOUNCEMENT_KINDS.changelog;

    return (
        <Modal title="What's new" size="large" closePlacement="footer" onClose={onClose}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
                <View style={styles.header}>
                    <Icon name={info.icon} size={32} color={info.color} />
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{changelog.title}</Text>
                        {changelog.version && <Text style={styles.version}>Version {changelog.version}</Text>}
                    </View>
                </View>
                {changelog.body ? <Text style={styles.body}>{changelog.body}</Text> : null}
                <Text style={styles.hint}>You can read this again in your inbox.</Text>
            </ScrollView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    page: {
        gap: 14,
        paddingBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerText: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: "700",
    },
    version: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    body: {
        color: colors.textPrimary,
        fontSize: 15,
        lineHeight: 22,
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
    },
});
