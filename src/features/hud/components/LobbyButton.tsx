import { useDungeonStore } from "@/features/dungeons/dungeonStore";
import TopCornerButton from "./TopCornerButton";

type LobbyButtonProps = {
    onPress: () => void;
};

/**
 * Top-right, left of the inbox, only while the player is in a dungeon lobby:
 * back to it from anywhere, so walking off from the POI doesn't strand them.
 */
export default function LobbyButton({ onPress }: LobbyButtonProps) {
    const lobby = useDungeonStore((state) => state.data?.myLobby ?? null);
    if (!lobby) return null;

    return (
        <TopCornerButton
            icon="portal"
            slot={3}
            accessibilityLabel="Open your dungeon lobby"
            onPress={onPress}
        />
    );
}
