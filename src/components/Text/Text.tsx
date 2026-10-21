import type { ReactNode } from "react";
import { Text as NativeText, type StyleProp, type TextProps as NativeTextProps, type TextStyle } from "react-native";
import { FONTS } from "@/theme/palette";
import { createStyles } from "@/theme/theme";

type TextProps = {
    children: ReactNode;
    /** Centre it, for hints and empty states under a hero. */
    center?: boolean;
    style?: StyleProp<TextStyle>;
} & Pick<NativeTextProps, "numberOfLines" | "accessibilityLabel" | "onPress">;

/**
 * The type scale. Five kinds of text cover every modal, so a heading in the
 * market reads the same as one at camp:
 *
 * - `Title`: the big one at the top of a page, in Fredoka.
 * - `SectionTitle`: small caps over a group ("Pack", "Bank").
 * - `Body`: ordinary text.
 * - `Hint`: quieter explaining text, a size down.
 * - `Label`: the bold name on a row or tile.
 */
export function Title({ children, center, style, ...rest }: TextProps) {
    const styles = useStyles();
    return (
        <NativeText style={[styles.title, center && styles.center, style]} {...rest}>
            {children}
        </NativeText>
    );
}

export function SectionTitle({ children, center, style, ...rest }: TextProps) {
    const styles = useStyles();
    return (
        <NativeText style={[styles.section, center && styles.center, style]} accessibilityRole="header" {...rest}>
            {children}
        </NativeText>
    );
}

export function Body({ children, center, style, ...rest }: TextProps) {
    const styles = useStyles();
    return (
        <NativeText style={[styles.body, center && styles.center, style]} {...rest}>
            {children}
        </NativeText>
    );
}

export function Hint({ children, center, style, ...rest }: TextProps) {
    const styles = useStyles();
    return (
        <NativeText style={[styles.hint, center && styles.center, style]} {...rest}>
            {children}
        </NativeText>
    );
}

export function Label({ children, center, style, ...rest }: TextProps) {
    const styles = useStyles();
    return (
        <NativeText style={[styles.label, center && styles.center, style]} {...rest}>
            {children}
        </NativeText>
    );
}

const useStyles = createStyles((p) => ({
    title: {
        color: p.text,
        fontFamily: FONTS.display,
        fontSize: 22,
        lineHeight: 27,
    },
    section: {
        color: p.textMuted,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 12,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    body: {
        color: p.text,
        fontFamily: FONTS.body,
        fontSize: 14,
        lineHeight: 20,
    },
    hint: {
        color: p.textMuted,
        fontFamily: FONTS.body,
        fontSize: 12,
        lineHeight: 17,
    },
    label: {
        color: p.text,
        fontFamily: FONTS.bodyHeavy,
        fontSize: 14,
    },
    center: {
        textAlign: "center",
    },
}));
