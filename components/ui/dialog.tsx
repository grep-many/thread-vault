import React from "react";
import { Modal, View, Text, Pressable, TouchableWithoutFeedback } from "react-native";
import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  disableClose,
  fullScreen,
}: DialogProps) {
  if (!isOpen) return null;

  return (
    <Modal transparent animationType="fade">
      {/* Overlay with Blur */}
      <TouchableWithoutFeedback onPress={() => !disableClose && onClose()}>
        <View className="absolute inset-0">
          {/* Blur Layer */}
          <BlurView intensity={50} tint="dark" className="absolute inset-0" />

          {/* Dark overlay (for contrast like your bg-black/80) */}
          <View className="absolute inset-0 bg-black/40" />
        </View>
      </TouchableWithoutFeedback>

      {/* Container */}
      <View className={`flex-1 items-center justify-center ${fullScreen ? "p-0" : "p-4"}`}>
        <View
          className={`relative overflow-hidden ${
            fullScreen
              ? "h-full w-full rounded-none bg-transparent"
              : "w-full max-w-sm rounded-4xl border border-white/10 bg-zinc-950/90"
          }`}
        >
          {/* Header */}
          {(title || (!disableClose && !fullScreen)) && (
            <View className="relative w-full items-center justify-center border-b border-white/5 bg-zinc-900/60 p-5">
              {title && <Text className="font-semibold text-zinc-200">{title}</Text>}

              {!disableClose && !fullScreen && (
                <Pressable
                  onPress={onClose}
                  className="absolute top-1/2 right-5 -translate-y-1/2 rounded-full p-1.5"
                >
                  <X size={20} color="#a1a1aa" />
                </Pressable>
              )}
            </View>
          )}

          {/* Fullscreen Close */}
          {fullScreen && !disableClose && (
            <Pressable
              onPress={onClose}
              className="absolute top-10 right-4 z-50 rounded-full bg-black/30 p-3"
            >
              <X size={24} color="white" />
            </Pressable>
          )}

          {/* Content */}
          <View
            className={`${fullScreen ? "flex-1 items-center justify-center" : "items-center p-8"}`}
          >
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}
