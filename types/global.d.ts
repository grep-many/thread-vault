import type { PressableProps } from "react-native";

declare global {
  // ─── UI Component Props ────────────────────────────────────────────────────

  interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    disableClose?: boolean;
    fullScreen?: boolean;
  }

  // Note: ButtonProps is also declared locally in button.tsx — global kept for
  // cross-file usage without re-importing.
  interface ButtonProps extends PressableProps {
    isLoading?: boolean;
    variant?: "primary" | "secondary" | "gradient";
    className?: string;
    children?: React.ReactNode;
  }

  // ─── Instagram API Types ───────────────────────────────────────────────────

  interface ExtractedMedia {
    type: "media" | "reel" | "link";
    item_type: string;
    content_type: "photo" | "video" | "audio" | "url";
    url: string;
    preview?: string;
    text?: string;
    id: string;
    sender_pk: string;
    is_video?: boolean;
    is_sent: boolean;
    timestamp: number;
  }

  interface IGThreadParameter {
    sessionId: string;
    csrfToken?: string;
    appId?: string;
    threadId: string;
    cursor: string;
    inboxId?: string;
    expiredAt?: number;
  }

  // ─── Media Grid ────────────────────────────────────────────────────────────

  type TabType = "media" | "reel" | "link";

  type MediaGridItemProps = {
    item: import("@/model/media").default;
    isSelected: boolean;
    isSelectMode: boolean;
    profileImageUrl?: string | null;
    onOpen: (item: import("@/model/media").default) => void;
    onToggleSelection: (id: string) => void;
    onLongPress: (id: string) => void;
  };

  // ─── Unsend Types ──────────────────────────────────────────────────────────

  interface UnsendJobInput {
    itemId: string;
    threadId: string;
  }

  interface UnsendJob extends UnsendJobInput {
    status: "pending" | "processing" | "success" | "failed";
    error?: string;
  }

  interface UnsendProgress {
    total: number;
    completed: number;
    successCount: number;
    failureCount: number;
    currentItemId: string | null;
  }

  // ─── Toast ────────────────────────────────────────────────────────────────

  type ToastType = "success" | "error" | "info";

  interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }
}
