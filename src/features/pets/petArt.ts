import type { ImageSourcePropType } from "react-native";
import { PET_ICONS } from "./petIcons.generated";

/** A pet's bundled art by its content `image` name, or undefined for art this build doesn't have yet. */
export function petArt(image: string | undefined): ImageSourcePropType | undefined {
    return image && image in PET_ICONS ? PET_ICONS[image as keyof typeof PET_ICONS] : undefined;
}
