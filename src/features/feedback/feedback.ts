import { Platform } from "react-native";
import type { GameIconName } from "@/components/Icon/Icon";
import { APP_VERSION } from "@/features/inbox/useWhatsNew";
import { api } from "@/lib/api";
import {
    GEO_API_PATHS,
    type GeoFeedbackKind,
    type GeoFeedbackRequest,
    type GeoFeedbackStatus,
    type GeoMyFeedbackResponse,
} from "@/lib/geo/contracts";
import { colors } from "@/theme/colors";

export const FEEDBACK_KINDS: { id: GeoFeedbackKind; label: string; icon: GameIconName; color: string }[] = [
    { id: "bug", label: "Bug", icon: "spotted-bug", color: colors.damage },
    { id: "suggestion", label: "Suggestion", icon: "quill-ink", color: colors.emberBright },
    { id: "other", label: "Other", icon: "chat-bubble", color: colors.textSecondary },
];

export function feedbackKindInfo(kind: GeoFeedbackKind) {
    return FEEDBACK_KINDS.find((info) => info.id === kind) ?? FEEDBACK_KINDS[2]!;
}

export const FEEDBACK_STATUSES: { id: GeoFeedbackStatus; label: string; color: string }[] = [
    { id: "new", label: "New", color: colors.emberBright },
    { id: "seen", label: "Seen", color: colors.textSecondary },
    { id: "planned", label: "Planned", color: colors.rarityRare },
    { id: "done", label: "Done", color: colors.toastSuccess },
    { id: "wontfix", label: "Won't do", color: colors.textSecondary },
];

export function feedbackStatusInfo(status: GeoFeedbackStatus) {
    return FEEDBACK_STATUSES.find((info) => info.id === status) ?? FEEDBACK_STATUSES[0]!;
}

export const feedbackApi = {
    mine: () => api.get<GeoMyFeedbackResponse>(GEO_API_PATHS.feedback),
    /** Sends it with the app's version and platform, which a bug report needs and players can't be asked for. */
    send: (kind: GeoFeedbackKind, title: string, body: string) => {
        const request: GeoFeedbackRequest = {
            kind,
            title,
            body,
            appVersion: APP_VERSION,
            platform: `${Platform.OS} ${Platform.Version}`,
        };
        return api.post<GeoMyFeedbackResponse>(GEO_API_PATHS.feedback, request);
    },
};
