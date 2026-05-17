import { memo, useCallback } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const GRADIENT_PINK = ["#db2777", "#9333ea"] as const;
const GRADIENT_BLUE = ["#2563eb", "#3b82f6"] as const;
const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 0 } as const;

export interface ButtonProps {
  variant?: "gradient" | "primary" | "secondary";
  isLoading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: object;
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

  const handlePress = useCallback(() => {
    if (!isDisabled) onPress?.();
  }, [isDisabled, onPress]);

  const gradientColors =
    variant === "primary" ? GRADIENT_BLUE : GRADIENT_PINK;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      className={`relative overflow-hidden rounded-2xl py-4 px-6 active:scale-[0.97] ${
        isDisabled ? "opacity-50" : ""
      } ${
        variant === "secondary"
          ? "bg-black/10 border border-black/10 dark:bg-white/10 dark:border-white/10"
          : ""
      } ${className}`}
    >
      {variant !== "secondary" && (
        <LinearGradient
          colors={gradientColors}
          start={GRADIENT_START}
          end={GRADIENT_END}
          className="absolute inset-0"
        />
      )}
      <View className="flex-row items-center justify-center gap-2">
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
});
