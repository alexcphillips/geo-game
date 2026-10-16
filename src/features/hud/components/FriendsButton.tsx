import { usePresenceStore } from "@/features/friends/presenceStore";
import TopCornerButton from "./TopCornerButton";

type FriendsButtonProps = {
    onPress: () => void;
};

/**
 * Top-right, beside settings: friends, with a badge counting incoming
 * requests (from the presence heartbeat, so it updates every minute or so).
 */
export default function FriendsButton({ onPress }: FriendsButtonProps) {
    const incoming = usePresenceStore((state) => state.incomingRequests);

    return (
        <TopCornerButton
            icon="two-shadows"
            slot={1}
            badge={incoming}
            accessibilityLabel={
                incoming > 0 ? `Open friends, ${incoming} friend request${incoming === 1 ? "" : "s"}` : "Open friends"
            }
            onPress={onPress}
        />
    );
}
