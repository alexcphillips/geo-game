import Svg, { Path } from "react-native-svg";
import {
    GAME_ICON_VIEWBOX,
    GAME_ICONS,
    type GameIconName,
} from "./gameIcons.generated";

export type { GameIconName };

type IconProps = {
    name: GameIconName;
    size?: number;
    color: string;
};

/**
 * A Game Icons icon (https://game-icons.net), drawn with react-native-svg.
 *
 * Only icons listed in `scripts/generate-icons.mjs` exist here; `name` is typed
 * against that list, so a missing icon is a type error rather than a blank.
 *
 * Decorative by default: the button or tile around an icon carries the
 * accessibility label, so the icon itself is hidden from screen readers.
 */
export default function Icon({ name, size = 24, color }: IconProps) {
    return (
        <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${GAME_ICON_VIEWBOX} ${GAME_ICON_VIEWBOX}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            {GAME_ICONS[name].map((d, index) => (
                <Path key={index} d={d} fill={color} />
            ))}
        </Svg>
    );
}
