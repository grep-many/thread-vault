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
import { Pressable, TextInput, type TextInputProps, Platform, View } from "react-native";

export interface InputProps extends TextInputProps {
  icon?: ReactNode;
  containerClassName?: string;
}

// ─── Static platform constants ────────────────────────────────────────────────

const ANDROID_PROPS = Platform.OS === "android" ? { includeFontPadding: false } : {};
const WEB_STYLE = Platform.select({ web: { outlineStyle: "none" } as object });

// ─── Static style objects (non-StyleSheet, non-inline) ────────────────────────

const CONTAINER_STYLE = { minHeight: 56 } as const;
const INPUT_STYLE = { height: "100%" as const, ...WEB_STYLE };

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_CONTAINER_FOCUSED =
  "w-full flex-row items-center rounded-[16px] border border-primary bg-background px-4 shadow-sm shadow-primary/20 dark:bg-[#1c2a33]";
const CLS_CONTAINER_IDLE =
  "w-full flex-row items-center rounded-[16px] border border-border/60 bg-muted/30 px-4 dark:border-dark-border/60 dark:bg-dark-muted/30";
const CLS_CONTAINER_DISABLED = " opacity-50";
const CLS_CONTAINER_ENABLED = " opacity-100";
const CLS_ICON_WRAP = "mr-3 items-center justify-center";
const CLS_INPUT_BASE = "flex-1 py-0 text-[16px] font-medium text-foreground dark:text-dark-foreground tracking-wide";

// ─── Component ────────────────────────────────────────────────────────────────

const Input = forwardRef<TextInput, InputProps>(
  ({
    className = "",
    containerClassName = "",
    icon,
    onBlur,
    onFocus,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => inputRef.current!);

    const handleContainerPress = useCallback(() => {
      inputRef.current?.focus();
    }, []);

    const handleFocus = useCallback(
      (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur],
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

    const containerClass =
      (isFocused ? CLS_CONTAINER_FOCUSED : CLS_CONTAINER_IDLE) +
      (props.editable === false ? CLS_CONTAINER_DISABLED : CLS_CONTAINER_ENABLED) +
      (containerClassName ? ` ${containerClassName}` : "");

    const inputClass = CLS_INPUT_BASE + (className ? ` ${className}` : "");

    return (
      <Pressable
        onPress={handleContainerPress}
        className={containerClass}
        style={CONTAINER_STYLE}
      >
        {iconWithColor && (
          <View className={CLS_ICON_WRAP}>{iconWithColor}</View>
        )}
        <TextInput
          ref={inputRef}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="#71717a"
          cursorColor="#ec4899"
          {...ANDROID_PROPS}
          className={inputClass}
          style={[INPUT_STYLE, props.style]}
          {...props}
        />
      </Pressable>
    );
  },
);

Input.displayName = "Input";

export { Input };
