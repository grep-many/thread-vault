import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

const GRADIENT_PINK = ["#db2777", "#9333ea"] as const;
const GRADIENT_BLUE = ["#2563eb", "#3b82f6"] as const;
const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 0 } as const;

// Stable hoisted class strings
const CLS_BASE =
  "relative overflow-hidden rounded-[16px] px-6 py-4 shadow-sm active:opacity-90";
const CLS_SECONDARY =
  "relative overflow-hidden rounded-[16px] px-6 py-4 border border-border/50 bg-card/80 shadow-sm dark:bg-dark-card/80 active:opacity-90";
const CLS_DISABLED = " opacity-50 active:opacity-50";
const CLS_ROW = "flex-row items-center justify-center gap-3 z-10";

export interface ButtonProps {
  variant?: "gradient" | "primary" | "secondary";
  isLoading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const Button = memo(function Button({
  variant = "primary",
  isLoading,
  children,
  disabled,
  onPress,
  className = "",
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const isSecondary = variant === "secondary";
  const gradientColors = variant === "primary" ? GRADIENT_BLUE : GRADIENT_PINK;

  const handlePress = useCallback(() => {
    if (!isDisabled) onPress?.();
  }, [isDisabled, onPress]);

  const rootClass =
    (isSecondary ? CLS_SECONDARY : CLS_BASE) +
    (isDisabled ? CLS_DISABLED : "") +
    (className ? ` ${className}` : "");

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      className={rootClass}
    >
      {!isSecondary && (
        <LinearGradient
          colors={gradientColors}
          start={GRADIENT_START}
          end={GRADIENT_END}
          className="absolute bottom-0 left-0 right-0 top-0"
        />
      )}
      <View className={CLS_ROW}>
        {isLoading ? (
          <ActivityIndicator size="small" color={isSecondary ? "#71717a" : "white"} />
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
});
