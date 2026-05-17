import { memo, useCallback } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_BACKDROP =
  "flex-1 items-center justify-center bg-white/80 dark:bg-black/80";
const CLS_SHEET_FULL =
  "h-full w-full rounded-none bg-background dark:bg-dark-background";
const CLS_SHEET_DIALOG =
  "w-[92%] max-w-sm overflow-hidden rounded-4xl border border-border bg-card shadow-2xl dark:border-dark-border dark:bg-dark-card";
const CLS_HEADER =
  "relative w-full items-center justify-center border-b border-border bg-muted/50 p-5 dark:border-dark-border dark:bg-dark-muted/50";
const CLS_HEADER_TITLE =
  "text-lg font-semibold text-foreground dark:text-dark-foreground";
const CLS_CLOSE_ICON = "absolute right-4 p-1";
const CLS_BODY_FULL = "flex-1 p-6";
const CLS_BODY_DIALOG = "w-full p-6";
const CLS_BODY_INNER = "w-full";
const CLS_FS_CLOSE_BTN =
  "absolute top-12 right-6 z-50 rounded-full bg-black/10 p-3 dark:bg-white/10";

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
  const sheetClass = fullScreen ? CLS_SHEET_FULL : CLS_SHEET_DIALOG;
  const bodyClass = fullScreen ? CLS_BODY_FULL : CLS_BODY_DIALOG;

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable className={CLS_BACKDROP} onPress={handleClose}>
        <Pressable onPress={stopPropagation} className={sheetClass}>
          {showHeader && (
            <View className={CLS_HEADER}>
              {typeof title === "string" ? (
                <Text className={CLS_HEADER_TITLE}>{title}</Text>
              ) : (
                title
              )}

              {!disableClose && !fullScreen && (
                <Pressable
                  onPress={onClose}
                  className={CLS_CLOSE_ICON}
                  hitSlop={HIT_SLOP}
                >
                  <FontAwesome6 name="xmark" size={20} color="#71717a" />
                </Pressable>
              )}
            </View>
          )}

          <View className={bodyClass}>
            <View className={CLS_BODY_INNER}>{children}</View>
          </View>

          {fullScreen && !disableClose && (
            <Pressable
              onPress={onClose}
              className={CLS_FS_CLOSE_BTN}
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
