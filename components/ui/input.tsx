import {
  forwardRef,
  isValidElement,
  cloneElement,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { TextInput, type TextInputProps, Platform, View } from "react-native";

export interface InputProps extends TextInputProps {
  icon?: ReactNode;
  containerClassName?: string;
}

const ANDROID_PROPS = Platform.OS === "android" ? { includeFontPadding: false } : {};

const Input = forwardRef<TextInput, InputProps>(
  ({ className = "", containerClassName = "", icon, editable, style, ...props }, ref) => {
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => inputRef.current!);

    const iconWithColor = useMemo(() => {
      if (!icon) return null;
      return isValidElement(icon)
        ? cloneElement(icon as ReactElement<{ color?: string; size?: number }>, {
            color: "#71717a",
            size: 20,
          })
        : icon;
    }, [icon]);

    const containerClass =
      "w-full flex-row items-center rounded-[16px] border border-border/60 bg-muted/30 px-4 dark:border-dark-border/60 dark:bg-dark-muted/30" +
      ((editable ?? true) ? " opacity-100" : " opacity-50") +
      (containerClassName ? ` ${containerClassName}` : "");

    return (
      <View pointerEvents="box-none" className={containerClass}>
        {iconWithColor ? (
          <View pointerEvents="none" className="mr-3 items-center justify-center">
            {iconWithColor}
          </View>
        ) : null}

        <TextInput
          ref={inputRef}
          editable={editable ?? true}
          placeholderTextColor="#71717a"
          cursorColor="#ec4899"
          textAlignVertical="center"
          {...ANDROID_PROPS}
          className={
            "text-foreground dark:text-dark-foreground flex-1 text-[16px] font-medium" +
            (className ? ` ${className}` : "")
          }
          style={[{ flex: 1 }, style]}
          {...props}
        />
      </View>
    );
  },
);

Input.displayName = "Input";

export { Input };
