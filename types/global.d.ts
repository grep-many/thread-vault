import { PressableProps, TextInputProps } from "react-native";

declare global {
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

  interface InboxPromise {
    thread: any;
    status: "fail" | string;
    message: string;
    inbox: {
      threads: any[];
      has_older: any;
      oldest_cursor: any;
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
  interface SessionState {
    sessionId: string | null;
    csrfToken: string | null;
    appId: string | null;
    isLoading?: boolean;
    init?: () => Promise<any>;
    // Actions
    setSession: (id: string, csrf?: string, app_id?: string) => void;
    logout: () => void;
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
}
