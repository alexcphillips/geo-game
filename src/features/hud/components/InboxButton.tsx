import { useInboxStore } from "@/features/inbox/inboxStore";
import TopCornerButton from "./TopCornerButton";

type InboxButtonProps = {
    onPress: () => void;
};

/**
 * Top-right, left of friends: the inbox, with a badge counting unread mail
 * (from the presence heartbeat, so it updates every minute or so).
 */
export default function InboxButton({ onPress }: InboxButtonProps) {
    const unread = useInboxStore((state) => state.unread);

    return (
        <TopCornerButton
            icon="envelope"
            slot={2}
            badge={unread}
            accessibilityLabel={unread > 0 ? `Open inbox, ${unread} unread` : "Open inbox"}
            onPress={onPress}
        />
    );
}
