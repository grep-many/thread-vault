interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  disableClose?: boolean;
  fullScreen?: boolean;
}

interface ButtonProps {
  onPress?: () => void;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "gradient";
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}
