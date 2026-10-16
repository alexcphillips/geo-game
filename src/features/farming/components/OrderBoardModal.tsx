import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import type { GeoFarmAction, GeoFarmOrder, GeoItemView, GeoOrderBoard } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
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
    return (
        <Modal title="Order Board" size="fill" showBack onClose={onClose}>
            <ScrollView contentContainerStyle={styles.list}>
                <Text style={styles.hint}>
                    New orders every Monday. These end {untilText(board.endsAt, now)}; an order taken on and not finished by then loses its deposit.
                </Text>
                {board.orders.map((order) => (
                    <OrderRow key={order.id} order={order} item={items[order.itemId]} have={held[order.itemId] ?? 0} busy={busy} act={act} />
                ))}
                {board.orders.length === 0 && <Text style={styles.hint}>No orders this week.</Text>}
            </ScrollView>
        </Modal>
    );
}

function OrderRow({ order, item, have, busy, act }: { order: GeoFarmOrder; item: GeoItemView | undefined; have: number; busy: boolean; act: OrderBoardModalProps["act"] }) {
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
            <Icon name={cropIcon(item?.icon ?? "")} size={28} color={colors.cropLeaf} />
            <View style={styles.text}>
                <Text style={styles.name}>
                    {order.quantity} {name}
                </Text>
                <Text style={styles.hint}>
                    Pays {order.reward} coins
                    {order.status === "accepted" ? ` · ${order.delivered}/${order.quantity} handed in · you have ${have}` : ""}
                    {order.status === "done" ? " · done" : ""}
                </Text>
            </View>
            {button && (
                <Pressable
                    onPress={() => void act(button.action)}
                    disabled={!enabled}
                    style={({ pressed }) => [styles.button, !enabled && styles.buttonDisabled, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !enabled }}
                >
                    <Text style={[styles.buttonText, !enabled && styles.buttonTextDisabled]}>{button.label}</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    button: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: colors.ember,
        maxWidth: 140,
    },
    buttonDisabled: {
        backgroundColor: colors.tileLocked,
    },
    buttonText: {
        color: colors.textOnEmber,
        fontWeight: "700",
        fontSize: 12,
        textAlign: "center",
    },
    buttonTextDisabled: {
        color: colors.textSecondary,
    },
    pressed: {
        opacity: 0.75,
    },
});
