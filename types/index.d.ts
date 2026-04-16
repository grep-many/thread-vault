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
}