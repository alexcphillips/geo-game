import { ScrollView, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { Hint } from "@/components/Text/Text";
import type { GeoAnnouncement } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";
import { ANNOUNCEMENT_KINDS } from "../mail";

type WhatsNewModalProps = {
    changelog: GeoAnnouncement;
    onClose: () => void;
};

/** Shown once after an update: the changelog for it. It stays in the inbox too. */
export default function WhatsNewModal({ changelog, onClose }: WhatsNewModalProps) {
    const styles = useStyles();
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
                <Hint>You can read this again in your inbox.</Hint>
            </ScrollView>
        </Modal>
    );
}

const useStyles = createStyles((p) => ({
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
        color: p.text,
        fontSize: 18,
        fontFamily: FONTS.bodyHeavy,
    },
    version: {
        color: p.textMuted,
        fontSize: 12,
    },
    body: {
        color: p.text,
        fontSize: 15,
        lineHeight: 22,
    },
}));
