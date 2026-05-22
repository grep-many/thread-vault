import Media from "@/model/media";
import { FontAwesome6 } from "@expo/vector-icons";
import { memo, useCallback } from "react";
import { Image, Pressable, Text, View } from "react-native";

function isAudioItem(item: Media): boolean {
  return (
    item.itemType === "voice_media" || !!item.url?.includes(".m4a") || !!item.url?.includes("audio")
  );
}

// ─── Stable class strings ─────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

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
    const isAudio = isAudioItem(item);
    const { itemId } = item;

    const handleLongPress = useCallback(() => onLongPress(itemId), [onLongPress, itemId]);

    const handlePress = useCallback(
      () => (isSelectMode ? onToggleSelection(itemId) : onOpen(item)),
      [isSelectMode, item, itemId, onOpen, onToggleSelection],
    );

    const cardClass = isSelected
      ? "flex-1 overflow-hidden rounded-2xl border-2 border-primary bg-card dark:bg-dark-card"
      : "flex-1 overflow-hidden rounded-2xl border border-border bg-card dark:bg-dark-card dark:border-dark-border";
    const overlayClass = isSelected
      ? "absolute inset-0 items-center justify-center bg-primary/20"
      : "absolute inset-0 items-center justify-center bg-black/10";
    const checkClass = isSelected
      ? "h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary"
      : "h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-black/20";

    return (
      <Pressable
        onLongPress={handleLongPress}
        onPress={handlePress}
        delayLongPress={250}
        className="aspect-square w-full p-1"
      >
        <View className={cardClass}>
          {item.type === "link" ? (
            <View className="bg-accent/20 dark:bg-accent/10 flex-1 items-center justify-center gap-1 p-1">
              <FontAwesome6 name="link" size={20} color="#3b82f6" />
              <Text className="text-center text-[10px] text-blue-500" numberOfLines={1}>
                {item.url}
              </Text>
            </View>
          ) : isAudio ? (
            <View className="bg-muted dark:bg-dark-muted flex-1 items-center justify-center">
              <FontAwesome6 name="file-audio" size={24} color="#ec4899" />
            </View>
          ) : (
            <Image
              source={{ uri: item.thumbnailUrl || item.url }}
              className="flex-1"
              resizeMode="cover"
            />
          )}

          <View className="absolute top-1.5 right-1.5 h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/60">
            {item.isSent ? (
              <FontAwesome6 name="user" size={10} color="white" />
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} className="h-full w-full" />
            ) : (
              <FontAwesome6 name="user" size={10} color="white" />
            )}
          </View>

          {isSelectMode && (
            <View className={overlayClass}>
              <View className={checkClass}>
                {isSelected && <FontAwesome6 name="check" size={10} color="white" />}
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item.itemId === next.item.itemId &&
    prev.item.type === next.item.type &&
    prev.item.itemType === next.item.itemType &&
    prev.item.url === next.item.url &&
    prev.item.thumbnailUrl === next.item.thumbnailUrl &&
    prev.item.isSent === next.item.isSent &&
    prev.isSelected === next.isSelected &&
    prev.isSelectMode === next.isSelectMode &&
    prev.profileImageUrl === next.profileImageUrl,
);
