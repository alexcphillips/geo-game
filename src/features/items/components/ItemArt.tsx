import { Image, type ImageSourcePropType } from "react-native";
import Icon from "@/components/Icon/Icon";
import type { InventoryItem } from "../inventoryItems";
import { ITEM_ART } from "../itemArt.generated";

type ArtItem = Pick<InventoryItem, "itemId" | "icon" | "petInfo">;

/**
 * An item's bundled art: `art/<folder>/<name>.png`, named for the item's id or,
 * for a pet, its content `image` (a pet item's id carries its rarity, the art
 * doesn't). Undefined for art this build doesn't have yet.
 */
export function itemArt(item: ArtItem): ImageSourcePropType | undefined {
    const name = item.petInfo?.image ?? item.itemId;
    return name in ITEM_ART ? ITEM_ART[name as keyof typeof ITEM_ART] : undefined;
}

type ItemArtProps = {
    item: ArtItem;
    size: number;
    /** The fallback icon's colour. Art keeps its own colours. */
    color: string;
};

/**
 * An item's picture, `size` square: its art when the build has some,
 * otherwise its Game Icons icon. Every screen that draws an item goes
 * through this, so new art shows up everywhere at once.
 */
export default function ItemArt({ item, size, color }: ItemArtProps) {
    const art = itemArt(item);
    if (!art) return <Icon name={item.icon} size={size} color={color} />;
    return (
        <Image
            source={art}
            style={{ width: size, height: size }}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        />
    );
}
