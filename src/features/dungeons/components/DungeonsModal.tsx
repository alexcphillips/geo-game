import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Chip, ChipRow } from "@/components/Chips/Chips";
import Icon from "@/components/Icon/Icon";
import Modal from "@/components/Modal/Modal";
import { showToast } from "@/components/Toast/toastStore";
import { SPRITES, type SpriteName } from "@/features/spawns/sprites";
import { toErrorMessage } from "@/lib/api";
import type {
    GeoDungeon,
    GeoDungeonEntrance,
    GeoDungeonLobby,
    GeoRunResponse,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";
import { useDungeonStore } from "../dungeonStore";

type DungeonsModalProps = {
    /**
     * Where the player is and the POI they're at, when in reach of one. Null
     * opened from anywhere else: the list can be browsed, but creating and
     * joining need a POI.
     */
    entrance: GeoDungeonEntrance | null;
    /** The host started the lobby: open their Run. */
    onEntered: (opened: GeoRunResponse) => void;
    onClose: () => void;
};

type Page = "list" | "create" | "lobby";

/**
 * The dungeon menu, opened from a POI. One worldwide list of lobbies, so it
 * never says where anyone is: filters along the top, a row per open lobby,
 * and Create at the top right. Your own lobby has its own page with who's
 * in, and Start for the host, which takes everyone in at once. The screen opening it
 * keeps the menu fresh (`useDungeonPolling`).
 */
export default function DungeonsModal({ entrance, onEntered, onClose }: DungeonsModalProps) {
    const data = useDungeonStore((state) => state.data);
    const error = useDungeonStore((state) => state.error);
    const myLobby = data?.myLobby ?? null;
    const [page, setPage] = useState<Page>(() => (useDungeonStore.getState().data?.myLobby ? "lobby" : "list"));

    // Joining or creating lands on the lobby; the lobby closing sends you back.
    const hadLobby = useRef(myLobby !== null);
    useEffect(() => {
        if (myLobby && !hadLobby.current) setPage("lobby");
        if (!myLobby && hadLobby.current && page === "lobby") {
            setPage("list");
        }
        hadLobby.current = myLobby !== null;
    }, [myLobby, page]);

    const dungeonsById = useMemo(
        () => new Map((data?.dungeons ?? []).map((dungeon) => [dungeon.id, dungeon])),
        [data?.dungeons],
    );

    return (
        <Modal
            title={page === "create" ? "New lobby" : page === "lobby" ? "Your lobby" : "Dungeons"}
            size="fill"
            showBack
            onBack={page !== "list" ? () => setPage("list") : undefined}
            closePlacement="footer"
            headerAccessory={
                page === "list" &&
                !myLobby && (
                    <Pressable
                        onPress={() => setPage("create")}
                        style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Create a lobby"
                        hitSlop={8}
                    >
                        <Icon name="portal" size={14} color={colors.emberBright} />
                        <Text style={styles.headerButtonText}>Create</Text>
                    </Pressable>
                )
            }
            onClose={onClose}
        >
            {!data ? (
                <Text style={styles.empty}>{error ?? "Finding lobbies…"}</Text>
            ) : page === "create" ? (
                <CreatePage
                    dungeons={data.dungeons}
                    combatLevel={data.combatLevel}
                    entrance={entrance}
                />
            ) : page === "lobby" && myLobby ? (
                <LobbyPage
                    lobby={myLobby}
                    dungeon={dungeonsById.get(myLobby.dungeonId)}
                    onEntered={onEntered}
                />
            ) : (
                <ListPage
                    dungeons={data.dungeons}
                    dungeonsById={dungeonsById}
                    lobbies={data.lobbies}
                    myLobby={myLobby}
                    combatLevel={data.combatLevel}
                    entrance={entrance}
                    onOpenMine={() => setPage("lobby")}
                />
            )}
        </Modal>
    );
}

function spriteUri(name: string | undefined): string {
    return (SPRITES[name as SpriteName] ?? SPRITES["placeholder-red"]).uri;
}

/** Runs a lobby action, showing the server's reason if it's refused. */
function useAction() {
    const [isBusy, setIsBusy] = useState(false);
    const run = async (action: () => Promise<unknown>) => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            await action();
        } catch (failure) {
            showToast(toErrorMessage(failure), "error");
        } finally {
            setIsBusy(false);
        }
    };
    return { isBusy, run };
}

// ---------------------------------------------------------------------------
// List

/** Why the player can't join a lobby, or null if they can. */
function joinProblem(lobby: GeoDungeonLobby, combatLevel: number): string | null {
    if (lobby.playerCount >= lobby.maxPlayers) return "That lobby is full";
    if (combatLevel < lobby.requiredLevel) return `That lobby needs combat level ${lobby.requiredLevel}`;
    return null;
}

function ListPage({
    dungeons,
    dungeonsById,
    lobbies,
    myLobby,
    combatLevel,
    entrance,
    onOpenMine,
}: {
    dungeons: GeoDungeon[];
    dungeonsById: Map<string, GeoDungeon>;
    lobbies: GeoDungeonLobby[];
    myLobby: GeoDungeonLobby | null;
    combatLevel: number;
    entrance: GeoDungeonEntrance | null;
    onOpenMine: () => void;
}) {
    const join = useDungeonStore((state) => state.join);
    const { isBusy, run } = useAction();
    // Filters: dungeons (none on = all), a minimum required level, joinable only.
    const [dungeonIds, setDungeonIds] = useState<ReadonlySet<string>>(new Set());
    const [minLevel, setMinLevel] = useState(0);
    const [joinableOnly, setJoinableOnly] = useState(true);

    const shown = lobbies.filter(
        (lobby) =>
            (dungeonIds.size === 0 || dungeonIds.has(lobby.dungeonId)) &&
            lobby.requiredLevel >= minLevel &&
            (!joinableOnly || joinProblem(lobby, combatLevel) === null),
    );

    const toggleDungeon = (id: string) =>
        setDungeonIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const onPressLobby = (lobby: GeoDungeonLobby) => {
        const problem = myLobby
            ? "You're already in a lobby. Leave it first."
            : !entrance
              ? "Go to a POI to join a lobby"
              : joinProblem(lobby, combatLevel);
        if (problem) {
            showToast(problem, "error");
            return;
        }
        void run(() => join(lobby.id, entrance!));
    };

    return (
        <View style={styles.page}>
            {myLobby && (
                <MyLobbyBanner
                    lobby={myLobby}
                    dungeon={dungeonsById.get(myLobby.dungeonId)}
                    onPress={onOpenMine}
                />
            )}

            <View style={styles.filters}>
                <ChipRow label="Dungeon">
                    {dungeons.map((dungeon) => (
                        <Chip
                            key={dungeon.id}
                            label={dungeon.name}
                            selected={dungeonIds.has(dungeon.id)}
                            onPress={() => toggleDungeon(dungeon.id)}
                        />
                    ))}
                </ChipRow>
                <View style={styles.filterRow}>
                    <Stepper
                        label="Min level"
                        value={minLevel}
                        display={minLevel === 0 ? "Any" : `${minLevel}+`}
                        min={0}
                        max={50}
                        onChange={setMinLevel}
                    />
                    <Chip
                        label="Joinable"
                        selected={joinableOnly}
                        onPress={() => setJoinableOnly((on) => !on)}
                        accessibilityHint="Only lobbies with room that your combat level can join"
                    />
                </View>
            </View>

            {!entrance && !myLobby && (
                <Text style={styles.note}>Go to a POI to create or join a lobby.</Text>
            )}

            <ScrollView style={styles.scroll} contentContainerStyle={styles.rows}>
                {shown.length === 0 ? (
                    <Text style={styles.empty}>
                        {lobbies.length === 0
                            ? "No lobbies right now. Create one!"
                            : "No lobbies match your filters."}
                    </Text>
                ) : (
                    shown.map((lobby) => (
                        <LobbyRow
                            key={lobby.id}
                            lobby={lobby}
                            dungeon={dungeonsById.get(lobby.dungeonId)}
                            isLevelTooLow={combatLevel < lobby.requiredLevel}
                            isDisabled={isBusy}
                            onPress={() => onPressLobby(lobby)}
                        />
                    ))
                )}
            </ScrollView>
        </View>
    );
}

/** "Any level" for a lobby open to anyone, else "Lv 12+". */
function levelLabel(requiredLevel: number): string {
    return requiredLevel === 0 ? "Any level" : `Lv ${requiredLevel}+`;
}

/** A dungeon's own requirement, on the create page. */
function dungeonLevelLabel(requiredLevel: number): string {
    return requiredLevel === 0 ? "No level needed" : `Needs combat level ${requiredLevel}`;
}

function LobbyRow({
    lobby,
    dungeon,
    isLevelTooLow,
    isDisabled,
    onPress,
}: {
    lobby: GeoDungeonLobby;
    dungeon: GeoDungeon | undefined;
    isLevelTooLow: boolean;
    isDisabled: boolean;
    onPress: () => void;
}) {
    const isFull = lobby.playerCount >= lobby.maxPlayers;
    const name = dungeon?.name ?? "Dungeon";
    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [styles.row, (isFull || isLevelTooLow) && styles.rowDim, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${name}, hosted by ${lobby.hostName}, ${levelLabel(lobby.requiredLevel)}, ${lobby.playerCount} of ${lobby.maxPlayers} players`}
        >
            <Image source={{ uri: spriteUri(dungeon?.bossSprite) }} style={styles.rowSprite} resizeMode="contain" />
            <View style={styles.rowMain}>
                <Text style={styles.rowName} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={styles.rowHost} numberOfLines={1}>
                    {lobby.hostName}
                </Text>
            </View>
            <View style={styles.rowStats}>
                <Text style={[styles.rowLevel, isLevelTooLow && styles.tooLow]}>{levelLabel(lobby.requiredLevel)}</Text>
                <View style={styles.rowPlayers}>
                    <Icon name="two-shadows" size={12} color={isFull ? colors.damage : colors.textSecondary} />
                    <Text style={[styles.rowPlayersText, isFull && styles.tooLow]}>
                        {lobby.playerCount}/{lobby.maxPlayers}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

function MyLobbyBanner({
    lobby,
    dungeon,
    onPress,
}: {
    lobby: GeoDungeonLobby;
    dungeon: GeoDungeon | undefined;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Your lobby: ${dungeon?.name ?? "Dungeon"}`}
        >
            <Icon name="portal" size={18} color={colors.emberBright} />
            <Text style={styles.bannerText} numberOfLines={1}>
                {dungeon?.name ?? "Your lobby"}
            </Text>
            <Text style={styles.bannerTimer}>
                {lobby.playerCount}/{lobby.maxPlayers} · Waiting to start
            </Text>
        </Pressable>
    );
}

// ---------------------------------------------------------------------------
// Create

function CreatePage({
    dungeons,
    combatLevel,
    entrance,
}: {
    dungeons: GeoDungeon[];
    combatLevel: number;
    entrance: GeoDungeonEntrance | null;
}) {
    const create = useDungeonStore((state) => state.create);
    const { isBusy, run } = useAction();
    const firstOpen = dungeons.find((dungeon) => dungeon.requiredLevel <= combatLevel);
    const [dungeonId, setDungeonId] = useState<string | null>(firstOpen?.id ?? null);
    const dungeon = dungeons.find((candidate) => candidate.id === dungeonId);
    // Starts at the dungeon's own requirement; the host can raise it up to their level.
    const [requiredLevel, setRequiredLevel] = useState(firstOpen?.requiredLevel ?? 0);

    const pick = (picked: GeoDungeon) => {
        setDungeonId(picked.id);
        setRequiredLevel(picked.requiredLevel);
    };

    return (
        <View style={styles.page}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.rows}>
                {dungeons.map((candidate) => {
                    const isLocked = combatLevel < candidate.requiredLevel;
                    const isPicked = candidate.id === dungeonId;
                    return (
                        <Pressable
                            key={candidate.id}
                            onPress={() => pick(candidate)}
                            disabled={isLocked}
                            style={({ pressed }) => [
                                styles.dungeonCard,
                                isPicked && styles.dungeonCardPicked,
                                isLocked && styles.rowDim,
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isPicked, disabled: isLocked }}
                            accessibilityLabel={`${candidate.name}, boss ${candidate.bossName}, ${dungeonLevelLabel(candidate.requiredLevel)}`}
                        >
                            <Image
                                source={{ uri: spriteUri(candidate.bossSprite) }}
                                style={styles.cardSprite}
                                resizeMode="contain"
                            />
                            <View style={styles.rowMain}>
                                <Text style={styles.rowName}>{candidate.name}</Text>
                                <Text style={styles.cardBoss}>Boss: {candidate.bossName}</Text>
                                <Text style={styles.cardDescription}>{candidate.description}</Text>
                                <Text style={[styles.cardMeta, isLocked && styles.tooLow]}>
                                    {`${dungeonLevelLabel(candidate.requiredLevel)} · up to ${candidate.maxPlayers} players`}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {dungeon && (
                <View style={styles.createFooter}>
                    <Stepper
                        label="Required level"
                        value={requiredLevel}
                        display={requiredLevel === 0 ? "Any" : String(requiredLevel)}
                        min={dungeon.requiredLevel}
                        max={combatLevel}
                        onChange={setRequiredLevel}
                    />
                    {!entrance && <Text style={styles.note}>Go to a POI to create a lobby.</Text>}
                    <PrimaryButton
                        label="Create lobby"
                        disabled={!entrance || isBusy}
                        onPress={() =>
                            void run(() => create({ ...entrance!, dungeonId: dungeon.id, requiredLevel }))
                        }
                    />
                </View>
            )}
        </View>
    );
}

// ---------------------------------------------------------------------------
// Your lobby

function LobbyPage({
    lobby,
    dungeon,
    onEntered,
}: {
    lobby: GeoDungeonLobby;
    dungeon: GeoDungeon | undefined;
    onEntered: (opened: GeoRunResponse) => void;
}) {
    const { leave, start } = useDungeonStore.getState();
    const { isBusy, run } = useAction();
    const members = lobby.members ?? [];
    const amHost = members.some((member) => member.isHost && member.isYou);

    const startLobby = async () => {
        const { opened, leftOut } = await start(lobby.id);
        if (leftOut.length > 0) {
            showToast(`${leftOut.join(", ")} couldn't fight right now and stayed behind`);
        }
        onEntered(opened);
    };

    return (
        <View style={styles.page}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.lobbyBody}>
                <Image source={{ uri: spriteUri(dungeon?.bossSprite) }} style={styles.lobbySprite} resizeMode="contain" />
                <Text style={styles.lobbyName}>{dungeon?.name ?? "Dungeon"}</Text>
                {dungeon && <Text style={styles.cardBoss}>Boss: {dungeon.bossName}</Text>}
                <Text style={styles.lobbyWaiting}>
                    {amHost ? "Start when everyone's in" : `Waiting for ${lobby.hostName} to start`}
                </Text>
                <Text style={styles.cardMeta}>{levelLabel(lobby.requiredLevel)}</Text>

                <View style={styles.members}>
                    <Text style={styles.sectionTitle}>
                        Players {lobby.playerCount}/{lobby.maxPlayers}
                    </Text>
                    {members.map((member) => (
                        <View key={member.displayName} style={styles.member}>
                            <Icon
                                name={member.isHost ? "crown" : "hooded-figure"}
                                size={16}
                                color={member.isHost ? colors.effect : colors.textSecondary}
                            />
                            <Text style={styles.memberName}>{member.displayName}</Text>
                        </View>
                    ))}
                    {Array.from({ length: Math.max(0, lobby.maxPlayers - members.length) }, (_, index) => (
                        <View key={`empty-${index}`} style={styles.member}>
                            <Icon name="uncertainty" size={16} color={colors.border} />
                            <Text style={styles.memberWaiting}>Waiting…</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.note}>
                    Starting takes everyone in at once. For now each player fights the boss in their own Run;
                    fighting together is coming.
                </Text>
            </ScrollView>

            <View style={styles.createFooter}>
                {amHost && <PrimaryButton label="Start" disabled={isBusy} onPress={() => void run(startLobby)} />}
                <SecondaryButton
                    label={amHost ? "Close lobby" : "Leave"}
                    disabled={isBusy}
                    onPress={() => void run(() => leave(lobby.id))}
                />
            </View>
        </View>
    );
}

// ---------------------------------------------------------------------------
// Controls

function Stepper({
    label,
    value,
    display,
    min,
    max,
    onChange,
}: {
    label: string;
    value: number;
    display: string;
    min: number;
    max: number;
    onChange: (value: number) => void;
}) {
    const step = (by: number) => onChange(Math.min(max, Math.max(min, value + by)));
    return (
        <View
            style={styles.stepper}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityValue={{ text: display }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(event) => step(event.nativeEvent.actionName === "increment" ? 1 : -1)}
        >
            <Text style={styles.stepperLabel}>{label}</Text>
            <StepButton label="−" disabled={value <= min} onPress={() => step(-1)} />
            <Text style={styles.stepperValue}>{display}</Text>
            <StepButton label="+" disabled={value >= max} onPress={() => step(1)} />
        </View>
    );
}

function StepButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.stepButton, disabled && styles.rowDim, pressed && styles.pressed]}
            hitSlop={6}
            importantForAccessibility="no"
        >
            <Text style={styles.stepButtonText}>{label}</Text>
        </Pressable>
    );
}

function PrimaryButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.primary, disabled && styles.primaryDisabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            <Text style={[styles.primaryText, disabled && styles.primaryTextDisabled]}>{label}</Text>
        </Pressable>
    );
}

function SecondaryButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            <Text style={styles.secondaryText}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        gap: 10,
    },
    scroll: {
        flex: 1,
    },
    rows: {
        gap: 8,
        paddingBottom: 8,
    },
    empty: {
        marginTop: 24,
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: "center",
    },
    note: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: "center",
    },
    pressed: {
        transform: [{ scale: 0.98 }],
    },
    headerButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    headerButtonPressed: {
        transform: [{ scale: 0.95 }],
        backgroundColor: "rgba(201, 100, 30, 0.25)",
    },
    headerButtonText: {
        color: colors.emberBright,
        fontSize: 13,
        fontWeight: "700",
    },
    filters: {
        gap: 8,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    rowDim: {
        opacity: 0.45,
    },
    rowSprite: {
        width: 40,
        height: 40,
    },
    rowMain: {
        flex: 1,
        gap: 2,
    },
    rowName: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "700",
    },
    rowHost: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    rowStats: {
        alignItems: "flex-end",
        gap: 3,
    },
    rowLevel: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    tooLow: {
        color: colors.damage,
    },
    rowPlayers: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    rowPlayersText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
    },
    banner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.ember,
        backgroundColor: "rgba(201, 100, 30, 0.12)",
    },
    bannerText: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
    },
    bannerTimer: {
        color: colors.emberBright,
        fontSize: 13,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    dungeonCard: {
        flexDirection: "row",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    dungeonCardPicked: {
        borderColor: colors.ember,
    },
    cardSprite: {
        width: 56,
        height: 56,
    },
    cardBoss: {
        color: colors.emberBright,
        fontSize: 12,
        fontWeight: "600",
    },
    cardDescription: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    cardMeta: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "600",
    },
    createFooter: {
        gap: 10,
        alignItems: "stretch",
    },
    stepper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    stepperLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    stepButton: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepButtonText: {
        color: colors.emberBright,
        fontSize: 16,
        fontWeight: "700",
    },
    // Fixed width so the buttons don't shift as the number changes.
    stepperValue: {
        minWidth: 36,
        textAlign: "center",
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    lobbyBody: {
        alignItems: "center",
        gap: 4,
        paddingTop: 8,
        paddingBottom: 12,
    },
    lobbySprite: {
        width: 96,
        height: 96,
        marginBottom: 4,
    },
    lobbyName: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: "700",
    },
    lobbyWaiting: {
        marginTop: 16,
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    members: {
        alignSelf: "stretch",
        gap: 8,
        marginTop: 16,
        marginBottom: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.5,
        textTransform: "uppercase",
    },
    member: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    memberName: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: "600",
    },
    memberWaiting: {
        color: colors.textSecondary,
        fontSize: 13,
        fontStyle: "italic",
    },
    primary: {
        alignItems: "center",
        paddingVertical: 13,
        borderRadius: 999,
        backgroundColor: colors.ember,
        borderWidth: 1.5,
        borderColor: colors.ember,
    },
    primaryDisabled: {
        backgroundColor: "transparent",
        borderColor: colors.border,
    },
    primaryText: {
        color: colors.textOnEmber,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    primaryTextDisabled: {
        color: colors.textSecondary,
    },
    secondary: {
        alignItems: "center",
        paddingVertical: 11,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    secondaryText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "700",
    },
});
