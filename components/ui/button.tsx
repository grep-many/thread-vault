import { ActivityIndicator, Pressable, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export const Button = ({
  className = "",
  variant = "primary",
  isLoading,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) => {
  // 1. Define color constants as Tuples to satisfy LinearGradient's strict types
  const gradientColors = {
    gradient: ["#db2777", "#9333ea"] as const, // pink-600 to purple-600
    primary: ["#2563eb", "#3b82f6"] as const, // blue-600 to blue-500
  };

  const isGradientVariant = variant === "gradient" || variant === "primary";

  // 2. Base container styles
  const containerClasses = `
    relative flex-row items-center justify-center overflow-hidden rounded-2xl py-4 px-6
    ${variant === "secondary" ? "bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10" : ""}
    ${disabled || isLoading ? "opacity-50" : "opacity-100"}
    ${className}
  `;

  return (
    <Pressable
      disabled={disabled || isLoading}
      style={(state) => [
        {
          // Instead of { pressed }, use state.pressed
          transform: [{ scale: state.pressed && !disabled ? 0.97 : 1 }],
        },
        // Spread the state to the parent style prop if it's a function
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <View className={containerClasses}>
        {/* Background Gradient */}
        {isGradientVariant && (
          <LinearGradient
            colors={gradientColors[variant as "gradient" | "primary"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill} // Clean way to do absolute inset-0
          />
        )}

        {/* Button Content Wrapper */}
        <View className="flex-row items-center justify-center gap-2">
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            // Ensure children are correctly rendered
            // Note: If passing raw text, wrap it in <Text> in the parent
            children
          )}
        </View>
      </View>
    </Pressable>
  );
};
