import {
  forwardRef,
  isValidElement,
  cloneElement,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Pressable, TextInput, TextInputProps, Platform, View } from "react-native";

export interface InputProps extends TextInputProps {
  icon?: ReactNode;
  containerClassName?: string;
}

const ANDROID_PROPS = Platform.OS === "android" ? { includeFontPadding: false } : {};
const WEB_STYLE = Platform.select({ web: { outlineStyle: "none" } as object });
const CONTAINER_STYLE = { minHeight: 52 } as const;
const INPUT_STYLE = { height: "100%" as const, ...WEB_STYLE };

const Input = forwardRef<TextInput, InputProps>(
  ({ className = "", containerClassName = "", icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => inputRef.current!);

    const handleContainerPress = useCallback(() => {
      inputRef.current?.focus();
    }, []);

    const handleFocus = useCallback(
      (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
        setIsFocused(true);
        props.onFocus?.(e);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.onFocus],
    );

    const handleBlur = useCallback(
      (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
        setIsFocused(false);
        props.onBlur?.(e);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.onBlur],
    );

    const iconWithColor = useMemo(() => {
      if (!icon) return null;
      return isValidElement(icon)
        ? cloneElement(icon as ReactElement<{ color?: string; size?: number }>, {
            color: isFocused ? "#ec4899" : "#71717a",
            size: 20,
          })
        : icon;
    }, [icon, isFocused]);

    return (
      <Pressable
        onPress={handleContainerPress}
        className={`w-full flex-row items-center rounded-2xl border bg-white px-4 dark:bg-zinc-950/40 ${
          isFocused
            ? "border-pink-500/50 shadow-sm shadow-pink-500/20"
            : "border-white/10"
        } ${props.editable === false ? "opacity-50" : "opacity-100"} ${containerClassName}`}
        style={CONTAINER_STYLE}
      >
        {iconWithColor && (
          <View className="mr-3 items-center justify-center">{iconWithColor}</View>
        )}
        <TextInput
          ref={inputRef}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="#52525b"
          cursorColor="#ec4899"
          {...ANDROID_PROPS}
          className={`flex-1 py-0 text-[16px] text-white ${className}`}
          style={[INPUT_STYLE, props.style]}
          {...props}
        />
      </Pressable>
    );
  },
);

Input.displayName = "Input";

export { Input };
