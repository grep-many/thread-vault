import { memo } from "react";
import { Image, Pressable, StyleSheet, View, Text } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

/**
 * A single cell in the media grid. Memoized aggressively to avoid
 * re-renders when selection state changes on sibling items.
 */
export const MediaGridItem = memo(
  function MediaGridItem({
    item,
    isSelected,
    isSelectMode,
    profileImageUrl,
    onOpen,
    onToggleSelection,
    onLongPress,
  }: MediaGridItemProps) {
    return (
      <Pressable
        onLongPress={() => onLongPress(item.itemId)}
        onPress={() => (isSelectMode ? onToggleSelection(item.itemId) : onOpen(item))}
        delayLongPress={250}
        className="p-1"
        style={styles.gridItem}
      >
        <View
          className={`flex-1 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-zinc-900 ${isSelected ? "border-2 border-pink-500" : ""}`}
        >
          {item.type === "link" ? (
            <View className="flex-1 items-center justify-center bg-blue-50 dark:bg-blue-900/20">
              <FontAwesome6 name="link" size={20} color="#3b82f6" />
              <Text className="mt-1 px-1 text-center text-[10px] text-[#3b82f6]" numberOfLines={1}>
                {item.url}
              </Text>
            </View>
          ) : item.itemType === "voice_media" ||
            item.url?.includes(".m4a") ||
            item.url?.includes("audio") ? (
            <View className="flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <FontAwesome6 name="file-audio" size={24} color="#ec4899" />
            </View>
          ) : (
            <Image source={{ uri: item.thumbnailUrl || item.url }} className="flex-1" />
          )}

          {/* Sender/Receiver avatar badge */}
          <View className="absolute top-1.5 right-1.5 h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/60">
            {item.isSent ? (
              <FontAwesome6 name="user" size={10} color="white" />
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} className="h-full w-full" />
            ) : (
              <FontAwesome6 name="user" size={10} color="white" />
            )}
          </View>

          {/* Selection overlay */}
          {isSelectMode && (
            <View
              className={`absolute inset-0 items-center justify-center ${isSelected ? "bg-pink-500/20" : "bg-black/10"}`}
            >
              <View
                className={`h-6 w-6 items-center justify-center rounded-full border-2 border-white ${isSelected ? "bg-pink-500" : "bg-black/20"}`}
              >
                {isSelected && <FontAwesome6 name="check" size={10} color="white" />}
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  },
  // Custom equality check — only re-render when something visually relevant changes
  (prev, next) =>
    prev.item.itemId === next.item.itemId &&
    prev.item.type === next.item.type &&
    prev.item.itemType === next.item.itemType &&
    prev.item.url === next.item.url &&
    prev.item.thumbnailUrl === next.item.thumbnailUrl &&
    prev.item.isSent === next.item.isSent &&
    prev.isSelected === next.isSelected &&
    prev.isSelectMode === next.isSelectMode &&
    prev.profileImageUrl === next.profileImageUrl &&
    prev.onOpen === next.onOpen &&
    prev.onToggleSelection === next.onToggleSelection &&
    prev.onLongPress === next.onLongPress,
);

const styles = StyleSheet.create({
  gridItem: {
    aspectRatio: 1,
    width: "100%",
  },
});
