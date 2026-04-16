import { Modal, View, Text, TouchableOpacity, SafeAreaView } from "react-native";
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
        className="flex-1 bg-black/80 items-center justify-center"
        onPress={() => !disableClose && onClose()}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className={`
            ${fullScreen 
              ? "h-full w-full rounded-none bg-zinc-950" 
              : "w-[92%] max-w-sm rounded-4xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl"}
          `}
        >
          {/* Header Section */}
          {(title || (!disableClose && !fullScreen)) && (
            <View className="relative w-full border-b border-white/5 bg-zinc-900/50 p-5 items-center justify-center">
              {typeof title === "string" ? (
                <Text className="font-semibold text-zinc-200 text-lg">{title}</Text>
              ) : (
                title
              )}
              
              {!disableClose && !fullScreen && (
                <TouchableOpacity
                  onPress={onClose}
                  className="absolute right-4 p-1"
                >
                  <X size={22} color="#71717a" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content Body */}
          <View
            className={`
              ${fullScreen 
                ? "flex-1 p-6" 
                : "p-6 w-full"} 
            `}
          >
            {/* Wrapping children in a View with w-full ensures 
               that buttons inside the Dialog use the full width available.
            */}
            <View className="w-full">
              {children}
            </View>
          </View>

          {/* FullScreen Close Button for Android placement */}
          {fullScreen && !disableClose && (
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-10 right-6 z-50 rounded-full bg-white/10 p-3"
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};