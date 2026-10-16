import { useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import { usePlayerStore } from "@/features/player/playerStore";
import type { GeoAnnouncement } from "@/lib/geo/contracts";
import { inboxApi } from "./inboxApi";
import { useInboxStore, useWhatsNewStore } from "./inboxStore";
import { pickWhatsNew } from "./mail";

/** The app's own version, from app.json; what a changelog's version is compared with. */
export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/** Waits for the device's record of what was shown, so nothing shows twice on a cold start. */
function hydrated(): Promise<void> {
    if (useWhatsNewStore.persist.hasHydrated()) return Promise.resolve();
    return new Promise((resolve) => {
        const unsubscribe = useWhatsNewStore.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
        });
    });
}

/**
 * The changelog to show as "What's new" once the player is loaded, if any
 * (see `pickWhatsNew`), and how to put it away for good. Checked once per
 * app start; a failure just means no popup this time.
 */
export function useWhatsNew(): { changelog: GeoAnnouncement | null; dismiss: () => void } {
    const isReady = usePlayerStore((state) => state.status === "ready");
    const [changelog, setChangelog] = useState<GeoAnnouncement | null>(null);
    const isChecked = useRef(false);

    useEffect(() => {
        if (!isReady || isChecked.current) return;
        isChecked.current = true;
        void Promise.all([inboxApi.get(), hydrated()])
            .then(([inbox]) => {
                useInboxStore.getState().setUnread(inbox.unread);
                const lastShown = useWhatsNewStore.getState().lastShownChangelogId;
                setChangelog(pickWhatsNew(inbox.announcements, APP_VERSION, lastShown));
            })
            .catch(() => {});
    }, [isReady]);

    return {
        changelog,
        dismiss: () => {
            if (changelog) useWhatsNewStore.getState().setLastShown(changelog.id);
            setChangelog(null);
        },
    };
}
