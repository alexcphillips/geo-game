import { ScrollView, View } from "react-native";
import EmptyState from "@/components/EmptyState/EmptyState";
import Sheet from "@/components/Sheet/Sheet";
import { Body, Hint } from "@/components/Text/Text";
import { createStyles } from "@/theme/theme";

/** One look or action's log lines, as the journal keeps them. */
export type JournalEntry = { id: number; at: number; lines: string[] };

/** What the farm did while you've been here, newest first. */
export default function JournalSheet({ entries, onClose }: { entries: JournalEntry[]; onClose: () => void }) {
    const styles = useStyles();
    return (
        <Sheet title="Farm journal" size="large" onClose={onClose}>
            {entries.length === 0 ? (
                <EmptyState icon="quill-ink" title="Nothing yet" hint="What the farm does turns up here." />
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {entries.map((entry) => (
                        <View key={entry.id} style={styles.entry}>
                            <Hint>{new Date(entry.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Hint>
                            {entry.lines.map((line, i) => (
                                <Body key={i}>{line}</Body>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            )}
        </Sheet>
    );
}

const useStyles = createStyles(() => ({
    list: {
        gap: 14,
        paddingBottom: 12,
    },
    entry: {
        gap: 2,
    },
}));
