import Button from "@/components/Button/Button";

/** A pill button on an end-of-Run card or a Run's action row: Leave, Fight again. */
export default function OutcomeButton({
    label,
    onPress,
    primary = false,
}: {
    label: string;
    onPress: () => void;
    primary?: boolean;
}) {
    return <Button label={label} onPress={onPress} variant={primary ? "primary" : "secondary"} />;
}
