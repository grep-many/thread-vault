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
    status: "fail" | string;
    message: string;
    inbox: {
      threads: any[];
      has_older: any;
      oldest_cursor:any;
    };
  }

  interface ExtractedMedia  {
    type: "media" | "reel" | "url";
    content_type: "photo" | "video" | "audio" | "url";
    url: string;
    preview?: string;
    text?: string;
    id: string;
    sender_pk: string;
    is_video?: boolean;
    is_sent: boolean;
    timestamp: number;
  };
}