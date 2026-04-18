import { Modal, View, Text, TouchableOpacity } from "react-native";
import { X } from "lucide-react-native";

export const Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  disableClose,
  fullScreen,
}: DialogProps) => {
  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      statusBarTranslucent // Ensures backdrop covers the status bar on Android
      onRequestClose={() => {
        if (!disableClose) onClose();
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        className="flex-1 items-center justify-center bg-white/80 dark:bg-black/80"
        onPress={() => !disableClose && onClose()}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className={` ${
            fullScreen
              ? "h-full w-full rounded-none bg-zinc-50 dark:bg-zinc-950"
              : "w-[92%] max-w-sm overflow-hidden rounded-4xl border border-black/10 bg-zinc-50 shadow-2xl dark:border-white/10 dark:bg-zinc-950"
          } `}
        >
          {/* Header Section */}
          {(title || (!disableClose && !fullScreen)) && (
            <View className="relative w-full items-center justify-center border-b border-black/5 bg-zinc-50/50 p-5 dark:border-white/5 dark:bg-zinc-900/50">
              {typeof title === "string" ? (
                <Text className="text-lg font-semibold text-zinc-950 dark:text-zinc-200">
                  {title}
                </Text>
              ) : (
                title
              )}

              {!disableClose && !fullScreen && (
                <TouchableOpacity onPress={onClose} className="absolute right-4 p-1">
                  <X size={22} color="#71717a" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content Body */}
          <View className={` ${fullScreen ? "flex-1 p-6" : "w-full p-6"} `}>
            {/* Wrapping children in a View with w-full ensures 
               that buttons inside the Dialog use the full width available.
            */}
            <View className="w-full">{children}</View>
          </View>

          {/* FullScreen Close Button for Android placement */}
          {fullScreen && !disableClose && (
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-10 right-6 z-50 rounded-full bg-black/10 p-3 dark:bg-white/10"
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
