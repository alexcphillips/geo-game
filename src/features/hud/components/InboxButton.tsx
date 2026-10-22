import { useInboxStore } from "@/features/inbox/inboxStore";
import TopCornerButton from "./TopCornerButton";

type InboxButtonProps = {
    onPress: () => void;
};

/**
 * Top-right, left of friends: the inbox, with a badge counting unread mail
 * and unopened chests (pushed over the geo socket as they change).
 */
export default function InboxButton({ onPress }: InboxButtonProps) {
    const unread = useInboxStore((state) => state.unread);
    const chests = useInboxStore((state) => state.pendingChests);
    const waiting = unread + chests;

    return (
        <TopCornerButton
            icon="envelope"
            slot={2}
            badge={waiting}
            accessibilityLabel={
                waiting > 0 ? `Open inbox, ${unread} unread, ${chests} chests to open` : "Open inbox"
            }
            onPress={onPress}
        />
    );
}
