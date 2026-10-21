import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import Icon, { type GameIconName } from "@/components/Icon/Icon";
import Tabs from "@/components/Tabs/Tabs";
import { GAME_ICONS } from "@/components/Icon/gameIcons.generated";
import MenuTile from "@/components/MenuTile/MenuTile";
import Modal from "@/components/Modal/Modal";
import { Hint } from "@/components/Text/Text";
import ItemDetail from "@/features/inventory/components/ItemDetail";
import ItemTile from "@/features/inventory/components/ItemTile";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { rarityInfo, type Rarity } from "@/features/inventory/rarity";
import { Field, QuantityInput } from "@/features/market/components/FormFields";
import { formatCoins } from "@/features/market/market";
import { usePlayerStore } from "@/features/player/playerStore";
import { catalogueItem } from "@/features/player/toInventoryItem";
import { useActivePetId, useCoins, useEquipment, useInUseIds, useInventory, usePetUpgrade } from "@/features/player/usePlayer";
import { api, toErrorMessage } from "@/lib/api";
import {
    GEO_API_PATHS,
    GEO_VENDOR_MAX_QUANTITY,
    type GeoItemStat,
    type GeoItemView,
    type GeoVendor,
    type GeoVendorsResponse,
} from "@/lib/geo/contracts";
import { FONTS } from "@/theme/palette";
import { createStyles, useTheme } from "@/theme/theme";
import { vendorActions } from "../vendorActions";
import { useReportActivity } from "@/features/friends/presenceStore";

const GRID_COLUMNS = 3;
const GRID_GAP = 12;

/** A buy tab is `buy:<name>`, one per offer `tab` ("Weapons"); then Sell, then Reforge or Pets for a vendor that does those. */
type VendorTab = `buy:${string}` | "sell" | "reforge" | "pets";

type ShopPage = { page: "shop"; vendorId: string; tab: VendorTab };
type TradePage = { page: "trade"; vendorId: string; tab: VendorTab; itemId: string; inventoryId?: string };
type ReforgePage = { page: "reforge"; vendorId: string; inventoryId: string };
type PetUpgradePage = { page: "petUpgrade"; vendorId: string; inventoryId: string };

/**
 * Where the modal is: the merchant list, a merchant's shop, one trade, one
 * reforge, or an item's details (opened from a shop, trade or reforge, which
 * back returns to).
 */
type Page =
    | { page: "list" }
    | ShopPage
    | TradePage
    | ReforgePage
    | PetUpgradePage
    | { page: "detail"; vendorId: string; item: InventoryItem; from: ShopPage | TradePage | ReforgePage | PetUpgradePage };

const UNTABBED = "Buy";

/** The vendor's tabs in order: its buy tabs as its offers name them, Sell, and Reforge if it reforges. */
function tabsOf(vendor: GeoVendor): { id: VendorTab; label: string }[] {
    const buyTabs = [...new Set(vendor.sells.map((offer) => offer.tab ?? UNTABBED))];
    return [
        ...(buyTabs.length > 0 ? buyTabs : [UNTABBED]).map((name) => ({ id: `buy:${name}` as const, label: name })),
        { id: "sell", label: "Sell" },
        ...(vendor.reforgeCost ? [{ id: "reforge" as const, label: "Reforge" }] : []),
        ...(vendor.petUpgrades ? [{ id: "pets" as const, label: "Pets" }] : []),
    ];
}

const isBuyTab = (tab: VendorTab): tab is `buy:${string}` => tab.startsWith("buy:");

/** "Defense +2 · Speed -1". */
const statLine = (stats: GeoItemStat[]) => stats.map((stat) => `${stat.label} ${stat.value}`).join(" · ");

type VendorsModalProps = {
    onClose: () => void;
};

function iconOf(name: string): GameIconName {
    return name in GAME_ICONS ? (name as GameIconName) : "shop";
}

/**
 * Vendors: the NPC merchants. A grid of merchants, each opening its shop with
 * tabs: what it sells (one tab, or several like Weapons and Armor), Sell
 * (what of yours it buys), and Reforge for a vendor that rerolls gear. A trade
 * opens its own page with a quantity and the total, and goes to the server,
 * which takes the coins and hands over the item together, or neither.
 */
export default function VendorsModal({ onClose }: VendorsModalProps) {
    const styles = useStyles();
    const palette = useTheme();
    useReportActivity("trading");
    const [vendors, setVendors] = useState<GeoVendor[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<Page>({ page: "list" });

    useEffect(() => {
        api.get<GeoVendorsResponse>(GEO_API_PATHS.vendors.list)
            .then((response) => setVendors(response.vendors))
            .catch((failure) => setError(toErrorMessage(failure)));
    }, []);

    const vendor = page.page === "list" ? undefined : vendors?.find((candidate) => candidate.id === page.vendorId);

    const back = () => {
        if (page.page === "detail") setPage(page.from);
        else if (page.page === "trade") setPage({ page: "shop", vendorId: page.vendorId, tab: page.tab });
        else if (page.page === "reforge") setPage({ page: "shop", vendorId: page.vendorId, tab: "reforge" });
        else if (page.page === "petUpgrade") setPage({ page: "shop", vendorId: page.vendorId, tab: "pets" });
        else setPage({ page: "list" });
    };

    return (
        <Modal
            title={vendor?.name ?? "Vendors"}
            size="fill"
            showBack
            onBack={page.page === "list" ? undefined : back}
            closePlacement="footer"
            onClose={onClose}
        >
            {!vendors ? (
                <View style={styles.center}>
                    {error ? (
                        <Hint>{error}</Hint>
                    ) : (
                        <ActivityIndicator color={palette.textMuted} />
                    )}
                </View>
            ) : page.page === "list" || !vendor ? (
                vendors.length === 0 ? (
                    <View style={styles.center}>
                        <Icon name="shop" size={44} color={palette.outline} />
                        <Hint>No merchants have set up shop yet.</Hint>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {vendors.map((candidate) => (
                            <View key={candidate.id} style={styles.cell}>
                                <MenuTile
                                    label={candidate.name}
                                    icon={iconOf(candidate.icon)}
                                    onPress={() => setPage({ page: "shop", vendorId: candidate.id, tab: tabsOf(candidate)[0]!.id })}
                                />
                            </View>
                        ))}
                    </View>
                )
            ) : page.page === "shop" ? (
                <Shop
                    vendor={vendor}
                    tab={page.tab}
                    onTab={(tab) => setPage({ ...page, tab })}
                    onPick={(itemId, inventoryId) =>
                        setPage({ page: "trade", vendorId: vendor.id, tab: page.tab, itemId, inventoryId })
                    }
                    onReforge={(inventoryId) => setPage({ page: "reforge", vendorId: vendor.id, inventoryId })}
                    onUpgradePet={(inventoryId) => setPage({ page: "petUpgrade", vendorId: vendor.id, inventoryId })}
                    onInspect={(item) => setPage({ page: "detail", vendorId: vendor.id, item, from: page })}
                />
            ) : page.page === "petUpgrade" ? (
                <PetUpgrade
                    vendor={vendor}
                    inventoryId={page.inventoryId}
                    onInspect={(item) => setPage({ page: "detail", vendorId: vendor.id, item, from: page })}
                    onDone={back}
                />
            ) : page.page === "reforge" ? (
                <Reforge
                    vendor={vendor}
                    inventoryId={page.inventoryId}
                    onInspect={(item) => setPage({ page: "detail", vendorId: vendor.id, item, from: page })}
                />
            ) : page.page === "trade" ? (
                <Trade
                    vendor={vendor}
                    tab={page.tab}
                    itemId={page.itemId}
                    inventoryId={page.inventoryId}
                    onInspect={(item) => setPage({ page: "detail", vendorId: vendor.id, item, from: page })}
                    onDone={back}
                />
            ) : (
                <ItemDetail
                    item={page.item}
                    action={
                        <BuyAction
                            vendor={vendor}
                            from={page.from}
                            itemId={page.item.itemId}
                            onBuy={(tab) => setPage({ page: "trade", vendorId: vendor.id, tab, itemId: page.item.itemId })}
                        />
                    }
                />
            )}
        </Modal>
    );
}

/** What vendors pay for one, or undefined if they don't buy it: any vendor buys anything with a sell value that isn't Soulbound. */
function npcPrice(def: GeoItemView | undefined): number | undefined {
    return def && !def.soulbound && def.sellValue > 0 ? def.sellValue : undefined;
}

/** What of the player's vendors buy, and isn't in use. */
function useSellable(): { item: InventoryItem; price: number }[] {
    const inventory = useInventory();
    const inUse = useInUseIds();
    const items = usePlayerStore((state) => state.items);
    return inventory.flatMap((item) => {
        const price = npcPrice(items[item.itemId]);
        return price !== undefined && !inUse.has(item.id) ? [{ item, price }] : [];
    });
}

/** The player's weapons and armor, worn ones included: reforging leaves them where they are. */
function useReforgeable(): { item: InventoryItem; isWorn: boolean }[] {
    const inventory = useInventory();
    const items = usePlayerStore((state) => state.items);
    const worn = new Set(Object.values(useEquipment()));
    return inventory.flatMap((item) =>
        items[item.itemId]?.reforgeTarget ? [{ item, isWorn: worn.has(item.id) }] : [],
    );
}

function Shop({
    vendor,
    tab,
    onTab,
    onPick,
    onReforge,
    onUpgradePet,
    onInspect,
}: {
    vendor: GeoVendor;
    tab: VendorTab;
    onTab: (tab: VendorTab) => void;
    onPick: (itemId: string, inventoryId?: string) => void;
    onReforge: (inventoryId: string) => void;
    onUpgradePet: (inventoryId: string) => void;
    onInspect: (item: InventoryItem) => void;
}) {
    const styles = useStyles();
    const items = usePlayerStore((state) => state.items);
    const reforges = usePlayerStore((state) => state.reforges);
    const sellable = useSellable();
    const reforgeable = useReforgeable();
    const offers = isBuyTab(tab) ? vendor.sells.filter((offer) => `buy:${offer.tab ?? UNTABBED}` === tab) : [];

    return (
        <View style={styles.shop}>
            <Text style={styles.description}>{vendor.description}</Text>

            <Tabs tabs={tabsOf(vendor)} value={tab} onChange={onTab} style={styles.tabs} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.rows} alwaysBounceHorizontal={false}>
                {isBuyTab(tab) &&
                    offers.flatMap((offer) => {
                        const def = items[offer.itemId];
                        if (!def) return [];
                        return [
                            <TradeRow
                                key={offer.itemId}
                                item={catalogueItem(def, `vendor-${offer.itemId}`)}
                                price={offer.price}
                                detail={offer.stock === null ? "Unlimited" : `${formatCoins(offer.stock)} left`}
                                onPress={() => onPick(offer.itemId)}
                                onInspect={onInspect}
                            />,
                        ];
                    })}
                {isBuyTab(tab) && offers.length === 0 && (
                    <Hint>Nothing for sale here.</Hint>
                )}

                {tab === "sell" &&
                    sellable.map(({ item, price }) => (
                        <TradeRow
                            key={item.id}
                            item={item}
                            price={price}
                            detail={`You have ${formatCoins(item.quantity ?? 1)}`}
                            onPress={() => onPick(item.itemId, item.id)}
                            onInspect={onInspect}
                        />
                    ))}
                {tab === "sell" && sellable.length === 0 && (
                    <Hint>
                        You have nothing to sell. Vendors buy anything with a sell value that isn&apos;t Soulbound.
                    </Hint>
                )}

                {tab === "reforge" &&
                    reforgeable.map(({ item, isWorn }) => {
                        const current = item.reforge ? reforges[item.reforge]?.name : undefined;
                        return (
                            <TradeRow
                                key={item.id}
                                item={item}
                                price={vendor.reforgeCost?.[item.rarity] ?? 0}
                                priceNote="a roll"
                                detail={[current ? `Reforge: ${current}` : "Not reforged", isWorn && "Worn"]
                                    .filter(Boolean)
                                    .join(" · ")}
                                onPress={() => onReforge(item.id)}
                                onInspect={onInspect}
                            />
                        );
                    })}
                {tab === "reforge" && reforgeable.length === 0 && (
                    <Hint>You have no weapons or armor to reforge.</Hint>
                )}

                {tab === "pets" && <PetsTab vendor={vendor} onUpgrade={onUpgradePet} onInspect={onInspect} />}
            </ScrollView>
        </View>
    );
}

function TradeRow({
    item,
    price,
    priceNote = "each",
    detail,
    onPress,
    onInspect,
}: {
    item: InventoryItem;
    price: number;
    /** Under the price: "each", or "a roll" for a reforge. */
    priceNote?: string;
    detail: string;
    onPress: () => void;
    onInspect: (item: InventoryItem) => void;
}) {
    const styles = useStyles();
    const palette = useTheme();
    return (
        <Panel compact
            onPress={onPress}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${price} coins ${priceNote}, ${detail}`}
        >
            {/* The tile opens the item's details; the rest of the row opens the trade. */}
            <View style={styles.rowTile}>
                <ItemTile
                    item={{ ...item, quantity: undefined }}
                    compact
                    onPress={() => onInspect(item)}
                    onLongPress={() => onInspect(item)}
                />
            </View>
            <View style={styles.rowText}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowDetail}>{detail}</Text>
            </View>
            <View style={styles.price}>
                <Icon name="two-coins" size={14} color={palette.reward} />
                <Text style={styles.priceText}>{formatCoins(price)}</Text>
                <Text style={styles.rowDetail}>{priceNote}</Text>
            </View>
        </Panel>
    );
}

/**
 * The Buy button on a vendor item's details, when they were opened from a
 * buy tab: it opens that item's trade. Nothing for an item being sold,
 * reforged or raised.
 */
function BuyAction({
    vendor,
    from,
    itemId,
    onBuy,
}: {
    vendor: GeoVendor;
    from: ShopPage | TradePage | ReforgePage | PetUpgradePage;
    itemId: string;
    onBuy: (tab: `buy:${string}`) => void;
}) {
    const offer = vendor.sells.find((candidate) => candidate.itemId === itemId);
    if (!offer || from.page === "reforge" || from.page === "petUpgrade" || !isBuyTab(from.tab)) return null;
    const tab = from.tab;

    return (
        <Button label={`Buy for ${formatCoins(offer.price)}`} variant="primary" size="small" icon="two-coins" onPress={() => onBuy(tab)} accessibilityLabel={`Buy, ${offer.price} coins each`} />
    );
}

/** One buy or sell: how many, the total, and the button. */
function Trade({
    vendor,
    tab,
    itemId,
    inventoryId,
    onInspect,
    onDone,
}: {
    vendor: GeoVendor;
    tab: VendorTab;
    itemId: string;
    inventoryId?: string;
    onInspect: (item: InventoryItem) => void;
    onDone: () => void;
}) {
    const styles = useStyles();
    const items = usePlayerStore((state) => state.items);
    const coins = useCoins();
    const owned = useInventory().find((item) => item.id === inventoryId);
    const [text, setText] = useState("1");
    const [isBusy, setIsBusy] = useState(false);

    const def = items[itemId];
    const isBuy = isBuyTab(tab);
    const price = isBuy
        ? vendor.sells.find((offer) => offer.itemId === itemId)?.price
        : npcPrice(def);
    // Sold out from under the page (e.g. sold the whole stack): back to the shop.
    if (!def || price === undefined || (!isBuy && !owned)) {
        return <Hint>That&apos;s no longer here.</Hint>;
    }

    const item = owned ?? catalogueItem(def, `trade-${itemId}`);
    const have = owned?.quantity ?? 1;
    const max = isBuy ? GEO_VENDOR_MAX_QUANTITY : Math.min(have, GEO_VENDOR_MAX_QUANTITY);
    const quantity = Number(text) || 0;
    const total = quantity * price;
    const problem =
        quantity < 1
            ? "Choose how many."
            : quantity > max
              ? isBuy
                  ? `At most ${formatCoins(max)} at once.`
                  : `You have ${formatCoins(have)}.`
              : isBuy && total > coins
                ? `That costs ${formatCoins(total)}. You have ${formatCoins(coins)}.`
                : null;

    // The steppers stop at what the coins cover, when buying.
    const stepMax = isBuy && price > 0 ? Math.min(max, Math.floor(coins / price)) : max;

    const submit = async () => {
        if (problem || isBusy) return;
        setIsBusy(true);
        const ok = isBuy
            ? await vendorActions.buy(vendor.id, itemId, quantity, def.name)
            : await vendorActions.sell(vendor.id, inventoryId ?? "", quantity, def.name);
        setIsBusy(false);
        if (ok) onDone();
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trade} keyboardShouldPersistTaps="handled">
            <Panel compact style={styles.row}>
                <View style={styles.rowTile}>
                    <ItemTile
                        item={{ ...item, quantity: undefined }}
                        compact
                        onPress={() => onInspect(item)}
                        onLongPress={() => onInspect(item)}
                    />
                </View>
                <View style={styles.rowText}>
                    <Text style={styles.rowName}>{def.name}</Text>
                    <Text style={styles.rowDetail}>
                        {isBuy ? `${formatCoins(price)} each` : `The ${vendor.name} pays ${formatCoins(price)} each`}
                    </Text>
                </View>
            </Panel>

            <Field label="How many" hint={isBuy ? `You have ${formatCoins(coins)} coins` : `You have ${formatCoins(have)}`}>
                <QuantityInput value={text} onChange={setText} max={stepMax} accessibilityLabel="How many" />
            </Field>
            {!isBuy && have > 1 && (
                <Button label={`Sell all ${formatCoins(max)}`} variant="quiet" size="small" onPress={() => setText(String(max))} style={styles.all} />
            )}

            <Button label={`${isBuy ? "Buy" : "Sell"} ${formatCoins(quantity)} for ${formatCoins(total)}`} variant="primary" size="large" icon="two-coins" onPress={() => void submit()} disabled={problem !== null} busy={isBusy} stretch />
            {problem && <Text style={styles.problem}>{problem}</Text>}
        </ScrollView>
    );
}

/**
 * One reforge: the copy, what it has now, everything it could become, and
 * the button. The server picks at random among the others, so the page stays
 * open after a roll to show the result and roll again.
 */
function Reforge({
    vendor,
    inventoryId,
    onInspect,
}: {
    vendor: GeoVendor;
    inventoryId: string;
    onInspect: (item: InventoryItem) => void;
}) {
    const styles = useStyles();
    const items = usePlayerStore((state) => state.items);
    const reforges = usePlayerStore((state) => state.reforges);
    const coins = useCoins();
    const item = useInventory().find((candidate) => candidate.id === inventoryId);
    const [isBusy, setIsBusy] = useState(false);

    const def = item ? items[item.itemId] : undefined;
    const target = def?.reforgeTarget;
    const cost = vendor.reforgeCost?.[def?.rarity ?? "common"];
    if (!item || !def || !target || cost === undefined) {
        return <Hint>That&apos;s no longer here.</Hint>;
    }

    const current = item.reforge ? reforges[item.reforge] : undefined;
    const outcomes = Object.values(reforges).filter(
        (reforge) => reforge.appliesTo.includes(target) && reforge.id !== current?.id,
    );
    const problem = cost > coins ? `A roll costs ${formatCoins(cost)}. You have ${formatCoins(coins)}.` : null;

    const submit = async () => {
        if (problem || isBusy) return;
        setIsBusy(true);
        await vendorActions.reforge(vendor.id, inventoryId, def.name);
        setIsBusy(false);
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trade}>
            <Panel compact style={styles.row}>
                <View style={styles.rowTile}>
                    <ItemTile
                        item={{ ...item, quantity: undefined }}
                        compact
                        onPress={() => onInspect(item)}
                        onLongPress={() => onInspect(item)}
                    />
                </View>
                <View style={styles.rowText}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowDetail}>
                        {current ? statLine(current.stats[def.rarity]) : "Not reforged yet"}
                    </Text>
                </View>
            </Panel>

            <View style={styles.outcomes}>
                <Text style={styles.sectionLabel}>Could become</Text>
                {outcomes.map((reforge) => (
                    <View key={reforge.id} style={styles.outcome}>
                        <Text style={styles.outcomeName}>{reforge.name}</Text>
                        <Text style={styles.rowDetail}>{statLine(reforge.stats[def.rarity])}</Text>
                    </View>
                ))}
            </View>

            <Button label={`${current ? "Reroll" : "Reforge"} for ${formatCoins(cost)}`} variant="primary" size="large" icon="two-coins" onPress={() => void submit()} disabled={problem !== null} busy={isBusy} stretch />
            {problem && <Text style={styles.problem}>{problem}</Text>}
        </ScrollView>
    );
}

/** "Rare", or "the next rarity" for one this build doesn't know. */
const rarityLabel = (rarity: Rarity | undefined) => (rarity ? rarityInfo(rarity).label : "the next rarity");

/** The pet with this vendor, if any, then every pet it could raise and its price. */
function PetsTab({
    vendor,
    onUpgrade,
    onInspect,
}: {
    vendor: GeoVendor;
    onUpgrade: (inventoryId: string) => void;
    onInspect: (item: InventoryItem) => void;
}) {
    const styles = useStyles();
    const items = usePlayerStore((state) => state.items);
    const waiting = usePetUpgrade();
    const activePet = useActivePetId();
    const pets = useInventory().filter((item) => item.pet?.upgrade);
    // When the tab opened: enough to say whether the pet is ready.
    const [now] = useState(() => Date.now());
    const [isBusy, setIsBusy] = useState(false);

    const waitingDef = waiting ? items[waiting.itemId] : undefined;
    const isReady = waiting ? new Date(waiting.readyAt).getTime() <= now : false;

    return (
        <>
            {waiting && (
                <View style={styles.outcomes}>
                    <Text style={styles.sectionLabel}>With {vendor.name}</Text>
                    <Text style={styles.rowName}>
                        {waitingDef?.name ?? "Your pet"}, becoming {rarityLabel(items[waiting.toItemId]?.rarity)}
                    </Text>
                    <Text style={styles.rowDetail}>
                        {isReady
                            ? "Ready to collect."
                            : `Ready ${new Date(waiting.readyAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.`}
                    </Text>
                    <Button
                        label="Collect"
                        variant="primary"
                        size="small"
                        onPress={async () => {
                            setIsBusy(true);
                            await vendorActions.collectPetUpgrade(vendor.id, waitingDef?.name ?? "pet");
                            setIsBusy(false);
                        }}
                        disabled={!isReady}
                        busy={isBusy}
                    />
                </View>
            )}
            {pets.map((item) => {
                const quote = item.pet!.upgrade!;
                return (
                    <TradeRow
                        key={item.id}
                        item={item}
                        price={quote.coins}
                        priceNote="to raise"
                        detail={[
                            `Lv ${item.pet!.level} → ${rarityLabel(items[quote.toItemId]?.rarity)}`,
                            `${quote.hours} h`,
                            item.id === activePet && "Active",
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                        onPress={() => onUpgrade(item.id)}
                        onInspect={onInspect}
                    />
                );
            })}
            {pets.length === 0 && !waiting && <Hint>You have no pets {vendor.name} can raise.</Hint>}
        </>
    );
}

/** Leaving one pet with Kat: what it becomes, the full price, and the button. */
function PetUpgrade({
    vendor,
    inventoryId,
    onInspect,
    onDone,
}: {
    vendor: GeoVendor;
    inventoryId: string;
    onInspect: (item: InventoryItem) => void;
    onDone: () => void;
}) {
    const styles = useStyles();
    const items = usePlayerStore((state) => state.items);
    const inventory = useInventory();
    const coins = useCoins();
    const activePet = useActivePetId();
    const waiting = usePetUpgrade();
    const [isBusy, setIsBusy] = useState(false);
    const item = inventory.find((candidate) => candidate.id === inventoryId);
    const quote = item?.pet?.upgrade;
    if (!item || !quote) return <Hint>That&apos;s no longer here.</Hint>;

    const have = (itemId: string) =>
        inventory.filter((candidate) => candidate.itemId === itemId).reduce((sum, candidate) => sum + (candidate.quantity ?? 1), 0);
    const next = items[quote.toItemId];
    const problem = waiting
        ? `${vendor.name} is already looking after a pet.`
        : item.id === activePet
          ? "Put it away first."
          : quote.coins > coins
            ? `It costs ${formatCoins(quote.coins)}. You have ${formatCoins(coins)}.`
            : quote.items.some((cost) => have(cost.itemId) < cost.quantity)
              ? "You're short of materials."
              : null;

    const submit = async () => {
        if (problem || isBusy) return;
        setIsBusy(true);
        const ok = await vendorActions.upgradePet(vendor.id, inventoryId, item.name);
        setIsBusy(false);
        if (ok) onDone();
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trade}>
            <Panel compact style={styles.row}>
                <View style={styles.rowTile}>
                    <ItemTile item={item} compact onPress={() => onInspect(item)} onLongPress={() => onInspect(item)} />
                </View>
                <View style={styles.rowText}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowDetail}>
                        Lv {item.pet!.level} {rarityLabel(item.rarity)} → {rarityLabel(next?.rarity)}
                    </Text>
                </View>
            </Panel>

            <View style={styles.outcomes}>
                <Text style={styles.sectionLabel}>Price</Text>
                <Text style={styles.rowDetail}>{formatCoins(quote.coins)} coins</Text>
                {quote.items.map((cost) => (
                    <Text key={cost.itemId} style={styles.rowDetail}>
                        {cost.quantity} {items[cost.itemId]?.name ?? cost.itemId} (you have {formatCoins(have(cost.itemId))})
                    </Text>
                ))}
                <Text style={styles.rowDetail}>
                    {vendor.name} keeps it for {quote.hours} h. It keeps its XP, but a rarer pet needs more per level, so its level may drop.
                </Text>
            </View>

            <Button label={`Leave it with ${vendor.name}`} variant="primary" size="large" onPress={() => void submit()} disabled={problem !== null} busy={isBusy} stretch />
            {problem && <Text style={styles.problem}>{problem}</Text>}
        </ScrollView>
    );
}

const useStyles = createStyles((p) => ({
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        margin: -GRID_GAP / 2,
    },
    cell: {
        width: `${100 / GRID_COLUMNS}%`,
        padding: GRID_GAP / 2,
    },
    shop: {
        flex: 1,
        gap: 12,
    },
    description: {
        color: p.textMuted,
        fontSize: 13,
        lineHeight: 18,
    },
    tabs: {
        marginBottom: 12,
    },
    rows: {
        gap: 8,
        paddingBottom: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 10,
    },
    rowTile: {
        width: 48,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    rowName: {
        color: p.text,
        fontSize: 15,
        fontFamily: FONTS.bodyBold,
    },
    rowDetail: {
        color: p.textMuted,
        fontSize: 12,
    },
    price: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    priceText: {
        color: p.reward,
        fontSize: 15,
        fontFamily: FONTS.bodyHeavy,
        fontVariant: ["tabular-nums"],
    },
    trade: {
        gap: 14,
    },
    outcomes: {
        gap: 6,
    },
    sectionLabel: {
        color: p.textMuted,
        fontSize: 12,
        fontFamily: FONTS.bodyHeavy,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    outcome: {
        gap: 2,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: p.surfaceAlt,
    },
    outcomeName: {
        color: p.text,
        fontSize: 14,
        fontFamily: FONTS.bodyBold,
    },
    all: {
        alignSelf: "flex-start",
    },
    problem: {
        color: p.textMuted,
        fontSize: 12,
        textAlign: "center",
    },
}));
