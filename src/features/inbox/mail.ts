import type { GameIconName } from "@/components/Icon/Icon";
import type { GeoAnnouncement, GeoAnnouncementKind, GeoInboxMessage, GeoInboxResponse } from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

/** One inbox entry, whichever table it came from. */
export type Mail =
    | { type: "message"; id: string; item: GeoInboxMessage }
    | { type: "announcement"; id: string; item: GeoAnnouncement };

export const ANNOUNCEMENT_KINDS: Record<GeoAnnouncementKind, { label: string; icon: GameIconName; color: string }> = {
    news: { label: "News", icon: "newspaper", color: colors.emberBright },
    changelog: { label: "Update", icon: "tied-scroll", color: colors.rarityRare },
    event: { label: "Event", icon: "megaphone", color: colors.rarityEpic },
    mayor: { label: "Mayor", icon: "crown", color: colors.coins },
};

export const MESSAGE_KINDS: Record<GeoInboxMessage["kind"], { label: string; icon: GameIconName; color: string }> = {
    feedbackReply: { label: "Reply", icon: "scroll-quill", color: colors.toastSuccess },
    contest: { label: "Contest", icon: "trophy", color: colors.coins },
};

export function mailInfo(mail: Mail): { label: string; icon: GameIconName; color: string } {
    return mail.type === "message" ? MESSAGE_KINDS[mail.item.kind] : ANNOUNCEMENT_KINDS[mail.item.kind];
}

/** Messages and announcements in one list, newest first. */
export function toMail(inbox: GeoInboxResponse): Mail[] {
    return [
        ...inbox.messages.map((item): Mail => ({ type: "message", id: `m:${item.id}`, item })),
        ...inbox.announcements.map((item): Mail => ({ type: "announcement", id: `a:${item.id}`, item })),
    ].sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt));
}

/** -1, 0 or 1, comparing "1.2" and "1.10.0" as numbers, part by part. */
export function compareVersions(a: string, b: string): number {
    const left = a.split(".").map(Number);
    const right = b.split(".").map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const difference = (left[i] || 0) - (right[i] || 0);
        if (difference !== 0) return Math.sign(difference);
    }
    return 0;
}

/**
 * The changelog to show as "What's new": the newest the player hasn't read
 * in the inbox, for this version of the app or older (one for a version
 * they haven't installed waits until they have), and not shown here before.
 */
export function pickWhatsNew(
    announcements: GeoAnnouncement[],
    appVersion: string,
    lastShownId: string | null,
): GeoAnnouncement | null {
    const newest = announcements.find(
        (item) => item.kind === "changelog" && item.version !== null && compareVersions(item.version, appVersion) <= 0,
    );
    return newest && !newest.read && newest.id !== lastShownId ? newest : null;
}
