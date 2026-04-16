import React, { forwardRef, useState } from "react";
import { View, TextInput, TextInputProps } from "react-native";

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  containerClassName?: string;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ className = "", containerClassName = "", icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={`relative w-full ${containerClassName}`}>
        {icon && (
          <View 
            className={`absolute left-4 z-10 top-3.5 transition-colors`}
            style={{ 
              // Using inline style or conditional Tailwind for the focus color
              opacity: props.editable === false ? 0.5 : 1 
            }}
          >
            {/* Clones the icon to inject the focus color if it's a Lucide icon */}
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  color: isFocused ? "#ec4899" : "#71717a", // pink-500 : zinc-500
                  size: 20
                })
              : icon}
          </View>
        )}
        <TextInput
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#52525b" // zinc-600
          cursorColor="#ec4899" // pink-500
          className={`
            w-full rounded-2xl border bg-zinc-950/40 py-3.5 pr-4 text-sm text-white
            ${icon ? "pl-12" : "pl-4"}
            ${isFocused ? "border-pink-500/50 shadow-sm shadow-pink-500/20" : "border-white/10"}
            ${props.editable === false ? "opacity-50" : "opacity-100"}
            ${className}
          `}
          {...props}
        />
      </View>
    );
  },
);

export { Input };