import TopCornerButton from "./TopCornerButton";

type SettingsButtonProps = {
    onPress: () => void;
};

/**
 * Top-right settings button.
 *
 * Settings is reached rarely, so it sits in a corner rather than the bottom
 * bar, which is for things used mid-walk. The map's compass is pushed down
 * below it — see COMPASS_TOP_OFFSET.
 */
export default function SettingsButton({ onPress }: SettingsButtonProps) {
    return <TopCornerButton icon="cog" slot={0} accessibilityLabel="Open settings" onPress={onPress} />;
}
