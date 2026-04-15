import React, { forwardRef } from "react";
import { Pressable, Text, ActivityIndicator, View } from "react-native";

const Button = forwardRef<any, ButtonProps>(
  (
    { variant = "primary", isLoading, children, disabled, className = "", onPress, ...props },
    ref,
  ) => {
    const isDisabled = isLoading || disabled;

    let variantStyles = "";
    let textStyles = "text-white";

    if (variant === "gradient") {
      variantStyles = "bg-pink-600 active:bg-pink-500"; // gradient workaround below
    } else if (variant === "primary") {
      variantStyles = "bg-blue-600 active:bg-blue-500";
    } else if (variant === "secondary") {
      variantStyles = "bg-white/10 active:bg-white/20 border border-white/5";
      textStyles = "text-white";
    }

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        onPress={onPress}
        className={`relative flex-row items-center justify-center gap-2 rounded-xl py-3 ${
          isDisabled ? "opacity-50" : ""
        } ${variantStyles} ${className}`}
        {...props}
      >
        {/* Gradient overlay (RN workaround) */}
        {variant === "gradient" && (
          <View className="absolute inset-0 rounded-xl bg-purple-600 opacity-70" />
        )}

        <View className="relative z-10 flex-row items-center gap-2">
          {isLoading && <ActivityIndicator size="small" color="white" />}

          <Text className={`text-sm font-medium ${textStyles}`}>{children}</Text>
        </View>
      </Pressable>
    );
  },
);

Button.displayName = "Button";

export { Button };
