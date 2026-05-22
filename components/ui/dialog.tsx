import { memo, useCallback } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// ─── Stable class strings ─────────────────────────────────────────────────────

export const Dialog = memo(function Dialog({
  isOpen,
  onClose,
  title,
  children,
  disableClose,
  fullScreen,
}: DialogProps) {
  const handleClose = useCallback(() => {
    if (!disableClose) onClose();
  }, [disableClose, onClose]);

  const stopPropagation = useCallback(
    (e: { stopPropagation: () => void }) => e.stopPropagation(),
    [],
  );

  const showHeader = !!(title || (!disableClose && !fullScreen));
  const sheetClass = fullScreen
    ? "h-full w-full rounded-none bg-background dark:bg-dark-background"
    : "w-[92%] max-w-sm overflow-hidden rounded-4xl border border-border bg-card shadow-2xl dark:border-dark-border dark:bg-dark-card";
  const bodyClass = fullScreen ? "flex-1 p-6" : "w-full p-6";

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-white/80 dark:bg-black/80"
        onPress={handleClose}
      >
        <Pressable onPress={stopPropagation} className={sheetClass}>
          {showHeader && (
            <View className="border-border bg-muted/50 dark:border-dark-border dark:bg-dark-muted/50 relative w-full items-center justify-center border-b p-5">
              {typeof title === "string" ? (
                <Text className="text-foreground dark:text-dark-foreground text-lg font-semibold">
                  {title}
                </Text>
              ) : (
                title
              )}

              {!disableClose && !fullScreen && (
                <Pressable onPress={onClose} className="absolute right-4 p-1" hitSlop={HIT_SLOP}>
                  <FontAwesome6 name="xmark" size={20} color="#71717a" />
                </Pressable>
              )}
            </View>
          )}

          <View className={bodyClass}>
            <View className="w-full">{children}</View>
          </View>

          {fullScreen && !disableClose && (
            <Pressable
              onPress={onClose}
              className="absolute top-12 right-6 z-50 rounded-full bg-black/10 p-3 dark:bg-white/10"
              hitSlop={HIT_SLOP}
            >
              <FontAwesome6 name="xmark" size={22} color="white" />
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});
