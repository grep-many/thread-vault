import { PressableProps, TextInputProps } from "react-native";

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

  interface ButtonProps extends PressableProps {
    isLoading?: boolean;
    variant?: "primary" | "secondary" | "gradient";
    className?: string;
    children: React.ReactNode;
  }

  interface InputProps extends TextInputProps {
    icon?: React.ReactNode;
  }

  // ─── Instagram API Types ───────────────────────────────────────────────────

  interface InboxPromise {
    thread: unknown;
    status: "fail" | string;
    message: string;
    inbox: {
      threads: unknown[];
      has_older: boolean;
      oldest_cursor: string;
    };
  }

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

  /**
   * Minimal input needed to queue an unsend job.
   * The queue hook derives all state from this.
   */
  interface UnsendJobInput {
    itemId: string;
    threadId: string;
  }

  /**
   * A single job in the unsend processing queue.
   * Carries its current processing status and optional error message.
   */
  interface UnsendJob extends UnsendJobInput {
    status: "pending" | "processing" | "success" | "failed";
    error?: string;
  }

  /** Snapshot of overall unsend progress for the progress modal. */
  interface UnsendProgress {
    total: number;
    completed: number;
    successCount: number;
    failureCount: number;
    currentItemId: string | null;
  }
  // ─── Toast ────────────────────────────────────────────────────────────────

  /**
   * Severity level for a toast notification.
   * Mirrors the ToastType exported from components/ui/toast.tsx.
   */
  type ToastType = "success" | "error" | "info";

  /**
   * A single toast notification entry managed by ToastProvider.
   * Mirrors the ToastMessage exported from components/ui/toast.tsx.
   */
  interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    /** Display duration in ms. Defaults to 3000. */
    duration?: number;
  }
}
