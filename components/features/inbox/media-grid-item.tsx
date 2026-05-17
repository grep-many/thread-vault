import { memo, useCallback } from "react";
import { Image, Pressable, StyleSheet, View, Text } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import Media from "@/model/media";

function isAudioItem(item: Media): boolean {
  return (
    item.itemType === "voice_media" ||
    !!item.url?.includes(".m4a") ||
    !!item.url?.includes("audio")
  );
}

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

    const handleLongPress = useCallback(
      () => onLongPress(item.itemId),
      [onLongPress, item.itemId],
    );

    const handlePress = useCallback(
      () => (isSelectMode ? onToggleSelection(item.itemId) : onOpen(item)),
      [isSelectMode, item, onOpen, onToggleSelection],
    );

    const cardStyle = isSelected ? styles.cardSelected : styles.cardDefault;

    return (
      <Pressable
        onLongPress={handleLongPress}
        onPress={handlePress}
        delayLongPress={250}
        style={styles.gridItem}
      >
        <View style={[styles.card, cardStyle]}>
          {item.type === "link" ? (
            <View style={styles.linkContainer}>
              <FontAwesome6 name="link" size={20} color="#3b82f6" />
              <Text style={styles.linkText} numberOfLines={1}>
                {item.url}
              </Text>
            </View>
          ) : isAudio ? (
            <View style={styles.audioContainer}>
              <FontAwesome6 name="file-audio" size={24} color="#ec4899" />
            </View>
          ) : (
            <Image
              source={{ uri: item.thumbnailUrl || item.url }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.senderBadge}>
            {item.isSent ? (
              <FontAwesome6 name="user" size={10} color="white" />
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.senderImage} />
            ) : (
              <FontAwesome6 name="user" size={10} color="white" />
            )}
          </View>

          {isSelectMode && (
            <View
              style={[
                styles.selectOverlay,
                isSelected ? styles.selectOverlayActive : styles.selectOverlayInactive,
              ]}
            >
              <View
                style={[
                  styles.checkCircle,
                  isSelected ? styles.checkCircleSelected : styles.checkCircleUnselected,
                ]}
              >
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

const styles = StyleSheet.create({
  gridItem: {
    aspectRatio: 1,
    width: "100%",
    padding: 4,
  },
  card: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
  },
  cardDefault: {
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "#ffffff",
  },
  cardSelected: {
    borderColor: "#ec4899",
    borderWidth: 2,
    backgroundColor: "#ffffff",
  },
  linkContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    gap: 4,
    padding: 4,
  },
  linkText: {
    fontSize: 10,
    color: "#3b82f6",
    textAlign: "center",
  },
  audioContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f5",
  },
  mediaImage: {
    flex: 1,
  },
  senderBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  senderImage: {
    width: "100%",
    height: "100%",
  },
  selectOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  selectOverlayActive: {
    backgroundColor: "rgba(236,72,153,0.2)",
  },
  selectOverlayInactive: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  checkCircle: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "white",
  },
  checkCircleSelected: {
    backgroundColor: "#ec4899",
  },
  checkCircleUnselected: {
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
