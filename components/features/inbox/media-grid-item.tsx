import Media from "@/model/media";
import { FontAwesome6 } from "@expo/vector-icons";
import { memo, useCallback } from "react";
import { Image, Pressable, Text, View } from "react-native";

interface MediaGridItemProps {
  item: Media;
  isSelected: boolean;
  isSelectMode: boolean;
  profileImageUrl: string | null;
  onOpen: (item: Media) => void;
  onToggleSelection: (id: string) => void;
  onLongPress: (id: string) => void;
}

function isAudioItem(item: Media): boolean {
  return (
    item.itemType === "voice_media" ||
    !!item.url?.includes(".m4a") ||
    !!item.url?.includes("audio")
  );
}

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_PRESSABLE = "aspect-square w-full p-1";

const CLS_CARD_SELECTED =
  "flex-1 overflow-hidden rounded-2xl border-2 border-primary bg-card dark:bg-dark-card";
const CLS_CARD_IDLE =
  "flex-1 overflow-hidden rounded-2xl border border-border bg-card dark:bg-dark-card dark:border-dark-border";

const CLS_LINK_CONTENT =
  "flex-1 items-center justify-center gap-1 bg-accent/20 p-1 dark:bg-accent/10";
const CLS_LINK_TEXT = "text-center text-[10px] text-blue-500";
const CLS_AUDIO_CONTENT = "flex-1 items-center justify-center bg-muted dark:bg-dark-muted";
const CLS_IMAGE = "flex-1";

const CLS_AVATAR_WRAP =
  "absolute right-1.5 top-1.5 h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/60";
const CLS_AVATAR_IMG = "h-full w-full";

const CLS_SELECT_OVERLAY_SELECTED =
  "absolute inset-0 items-center justify-center bg-primary/20";
const CLS_SELECT_OVERLAY_IDLE =
  "absolute inset-0 items-center justify-center bg-black/10";

const CLS_CHECK_SELECTED =
  "h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary";
const CLS_CHECK_IDLE =
  "h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-black/20";

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

    const handleLongPress = useCallback(
      () => onLongPress(itemId),
      [onLongPress, itemId],
    );

    const handlePress = useCallback(
      () => (isSelectMode ? onToggleSelection(itemId) : onOpen(item)),
      [isSelectMode, item, itemId, onOpen, onToggleSelection],
    );

    const cardClass = isSelected ? CLS_CARD_SELECTED : CLS_CARD_IDLE;
    const overlayClass = isSelected
      ? CLS_SELECT_OVERLAY_SELECTED
      : CLS_SELECT_OVERLAY_IDLE;
    const checkClass = isSelected ? CLS_CHECK_SELECTED : CLS_CHECK_IDLE;

    return (
      <Pressable
        onLongPress={handleLongPress}
        onPress={handlePress}
        delayLongPress={250}
        className={CLS_PRESSABLE}
      >
        <View className={cardClass}>
          {item.type === "link" ? (
            <View className={CLS_LINK_CONTENT}>
              <FontAwesome6 name="link" size={20} color="#3b82f6" />
              <Text className={CLS_LINK_TEXT} numberOfLines={1}>
                {item.url}
              </Text>
            </View>
          ) : isAudio ? (
            <View className={CLS_AUDIO_CONTENT}>
              <FontAwesome6 name="file-audio" size={24} color="#ec4899" />
            </View>
          ) : (
            <Image
              source={{ uri: item.thumbnailUrl || item.url }}
              className={CLS_IMAGE}
              resizeMode="cover"
            />
          )}

          <View className={CLS_AVATAR_WRAP}>
            {item.isSent ? (
              <FontAwesome6 name="user" size={10} color="white" />
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} className={CLS_AVATAR_IMG} />
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
