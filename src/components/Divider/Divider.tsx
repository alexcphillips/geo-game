import { View } from "react-native";
import { createStyles } from "@/theme/theme";

/** A quiet rule between groups in a modal. */
export default function Divider() {
    const styles = useStyles();
    return <View style={styles.divider} accessible={false} />;
}

const useStyles = createStyles((p) => ({
    divider: {
        height: 2,
        borderRadius: 1,
        backgroundColor: p.track,
    },
}));
