import React, { forwardRef, useState } from "react";
import { View, TextInput, TextInputProps } from "react-native";

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ className = "", icon, editable = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className="relative w-full">
        {/* Icon */}
        {icon && (
          <View
            className={`absolute top-1/2 left-4 z-10 -translate-y-1/2 ${
              isFocused ? "text-pink-500" : "text-zinc-500"
            }`}
          >
            {icon}
          </View>
        )}

        {/* Input */}
        <TextInput
          ref={ref}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#71717a"
          className={`w-full rounded-xl border bg-black/40 py-3 pr-4 text-sm text-white ${
            icon ? "pl-12" : "pl-4"
          } ${isFocused ? "border-pink-500" : "border-white/10"} ${
            !editable ? "opacity-50" : ""
          } ${className}`}
          {...props}
        />
      </View>
    );
  },
);

Input.displayName = "Input";

export { Input };
