import React, { forwardRef, useState } from "react";
import { View, TextInput, TextInputProps, Platform, Pressable } from "react-native";

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  containerClassName?: string;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ className = "", containerClassName = "", icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = React.useRef<TextInput>(null);

    // Merge internal ref with forwarded ref
    React.useImperativeHandle(ref, () => inputRef.current!);

    return (
      <Pressable
        onPress={() => inputRef.current?.focus()}
        className={`w-full flex-row items-center rounded-2xl border bg-white px-4 dark:bg-zinc-950/40 ${isFocused ? "border-pink-500/50 shadow-sm shadow-pink-500/20" : "border-white/10"} ${props.editable === false ? "opacity-50" : "opacity-100"} ${containerClassName} `}
        style={{ minHeight: 52 }}
      >
        {/* ICON - Now just a standard flex item */}
        {icon && (
          <View className="mr-3 items-center justify-center">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  color: isFocused ? "#ec4899" : "#71717a",
                  size: 20,
                })
              : icon}
          </View>
        )}

        {/* TEXT INPUT - flex-1 takes up the remaining space */}
        <TextInput
          ref={inputRef}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor="#52525b"
          cursorColor="#ec4899"
          // Remove default paddings that cause misalignments
          {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
          className={`flex-1 py-0 text-[16px] text-white ${className}`}
          style={[
            {
              height: "100%", // Fill the Pressable height
              ...Platform.select({
                web: { outlineStyle: "none" } as any,
              }),
            },
            props.style,
          ]}
          {...props}
        />
      </Pressable>
    );
  },
);

Input.displayName = "Input";

export { Input };
