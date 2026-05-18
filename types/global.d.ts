import type React from "react";
import type Media from "@/model/media";

declare global {
  type MediaType = "media" | "reel" | "link";
  type FilterMode = "all" | "sent" | "received";
  type ToastType = "success" | "error" | "info";
  type MediaStatsCounts = Record<MediaType, number> & { interactions: number };

  interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    disableClose?: boolean;
    fullScreen?: boolean;
  }

  interface ButtonProps {
    isLoading?: boolean;
    variant?: "primary" | "secondary" | "gradient";
    disabled?: boolean;
    onPress?: () => void;
    className?: string;
    children?: React.ReactNode;
  }

  interface ExtractedMedia {
    type: MediaType;
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

  type TabType = MediaType;

  type MediaGridItemProps = {
    item: Media;
    isSelected: boolean;
    isSelectMode: boolean;
    profileImageUrl?: string | null;
    onOpen: (item: Media) => void;
    onToggleSelection: (id: string) => void;
    onLongPress: (id: string) => void;
  };

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

  interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }
}
