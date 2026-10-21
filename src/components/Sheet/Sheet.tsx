import type { ReactNode } from "react";
import Modal, { type ModalSize } from "@/components/Modal/Modal";

type SheetProps = {
    /** Called once the sheet has slid away. Render it conditionally, as with `Modal`. */
    onClose: () => void;
    children: ReactNode;
    /** A header with the title and a close button; without one, the grab handle closes it. */
    title?: string;
    /** The most height it may take; it hugs shorter content. */
    size?: ModalSize;
    showBack?: boolean;
    onBack?: () => void;
};

/**
 * A bottom sheet: what's on a tapped tile, a menu of a place's features.
 * Edge to edge along the bottom with a grab handle; it slides up, and a tap
 * on the backdrop or a swipe down on the handle sends it away.
 *
 * It is a `Modal` presented as a sheet, so it shares the backdrop, animation,
 * hardware back and accessibility rules. Reach for a sheet for something
 * about the screen behind it (that tile, this farm); a `Modal` for a place
 * of its own (the Order Board, the Research Lab).
 */
export default function Sheet({ onClose, children, title, size = "medium", showBack, onBack }: SheetProps) {
    return (
        <Modal presentation="sheet" onClose={onClose} title={title} size={size} showBack={showBack} onBack={onBack}>
            {children}
        </Modal>
    );
}
