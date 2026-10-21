import { ScrollView, Text, View } from "react-native";
import Button from "@/components/Button/Button";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { Hint } from "@/components/Text/Text";
import type { GeoFarmAction, GeoFarmOrder, GeoItemView, GeoOrderBoard } from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { cropIcon, untilText } from "../farmText";

type OrderBoardModalProps = {
    board: GeoOrderBoard;
    items: Record<string, GeoItemView>;
    /** How many of each item the player holds. */
    held: Record<string, number>;
    busy: boolean;
    now: number;
    act: (action: GeoFarmAction) => Promise<void>;
    onClose: () => void;
};

/**
 * The week's Order Board: take an order on for a deposit, hand crops in as
 * they come, and collect the reward (and the deposit back) once it's full.
 * An order still unfinished when the week ends loses its deposit.
 */
export default function OrderBoardModal({ board, items, held, busy, now, act, onClose }: OrderBoardModalProps) {
    const styles = useStyles();
    return (
        <Modal title="Order Board" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                <Hint>
                    New orders every Monday. These end {untilText(board.endsAt, now)}; an order taken on and not finished by then loses its deposit.
                </Hint>
                {board.orders.map((order) => (
                    <OrderRow key={order.id} order={order} item={items[order.itemId]} have={held[order.itemId] ?? 0} busy={busy} act={act} />
                ))}
                {board.orders.length === 0 && <Hint>No orders this week.</Hint>}
            </ScrollView>
        </Modal>
    );
}

function OrderRow({ order, item, have, busy, act }: { order: GeoFarmOrder; item: GeoItemView | undefined; have: number; busy: boolean; act: OrderBoardModalProps["act"] }) {
    const palette = useTheme();
    const styles = useStyles();
    const name = item?.name ?? order.itemId;
    const left = order.quantity - order.delivered;
    const button =
        order.status === "offered"
            ? { label: `Take on · ${order.deposit} deposit`, action: { type: "accept-order", orderId: order.id } as const, enabled: true }
            : order.status === "accepted"
              ? { label: `Hand in (${Math.min(have, left)})`, action: { type: "deliver-order", orderId: order.id } as const, enabled: have > 0 }
              : null;
    const enabled = Boolean(button?.enabled) && !busy;
    return (
        <View style={[styles.row, order.status === "done" && styles.done]}>
            <Icon name={cropIcon(item?.icon ?? "")} size={28} color={palette.game.cropLeaf} />
            <View style={styles.text}>
                <Text style={styles.name}>
                    {order.quantity} {name}
                </Text>
                <Hint>
                    Pays {order.reward} coins
                    {order.status === "accepted" ? ` · ${order.delivered}/${order.quantity} handed in · you have ${have}` : ""}
                    {order.status === "done" ? " · done" : ""}
                </Hint>
            </View>
            {button && (
                <Button label={button.label} size="small" variant="primary" onPress={() => void act(button.action)} disabled={!enabled} />
            )}
        </View>
    );
}

const useStyles = createStyles((p) => ({
    list: {
        gap: 14,
        paddingBottom: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    done: {
        opacity: 0.5,
    },
    text: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyHeavy,
    },
}));
