import Modal from "@/components/Modal/Modal";
import type { InventoryItem } from "../inventoryItems";
import ItemDetail from "./ItemDetail";

/**
 * An item's details as a modal of its own, over whatever screen is showing.
 *
 * What holding a tile opens when its screen doesn't say otherwise, so every
 * card and item tile in the game can be held for its details.
 */
export default function ItemDetailModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
    return (
        <Modal title={item.name} size="large" showBack closePlacement="footer" onClose={onClose}>
            <ItemDetail item={item} />
        </Modal>
    );
}
