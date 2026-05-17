import React, { memo } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import withObservables from "@nozbe/with-observables";
import InboxModel from "@/model/inbox";

interface ThreadTileProps {
  item: InboxModel;
  onPress: () => void;
  isSyncing?: boolean;
  onSyncPress?: () => void;
}

const ThreadTileComponent = memo(function ThreadTileComponent({
  item,
  onPress,
  isSyncing,
  onSyncPress,
}: ThreadTileProps) {
  const displayName = item.fullName || item.username;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl px-2 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <View className="flex-1 flex-row items-center">
        <View className="relative">
          <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            {item.pfpUrl ? (
              <Image
                source={{ uri: item.pfpUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <FontAwesome6 name="user" size={20} color="#a1a1aa" />
            )}
          </View>
          {isSyncing && (
            <View className="absolute right-0 bottom-0 rounded-full bg-white p-0.5 shadow-sm dark:bg-zinc-950">
              <FontAwesome6 name="rotate" size={10} color="#ec4899" className="animate-spin" />
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text
            className="text-base font-semibold text-zinc-900 dark:text-white"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {!!item.fullName && (
            <Text className="text-xs text-zinc-500" numberOfLines={1}>
              @{item.username}
            </Text>
          )}
        </View>
      </View>
      <Pressable
        onPress={onSyncPress}
        className="ml-4 h-8 w-8 items-center justify-center rounded-full bg-zinc-100 active:opacity-70 dark:bg-zinc-800"
        hitSlop={SYNC_BUTTON_HIT_SLOP}
      >
        <FontAwesome6
          name={isSyncing ? "pause" : "rotate"}
          size={12}
          color={isSyncing ? "#ec4899" : "#71717a"}
        />
      </Pressable>
    </Pressable>
  );
});

const SYNC_BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

const styles = StyleSheet.create({
  avatar: {
    width: "100%",
    height: "100%",
  },
});

export const ThreadTile = withObservables(["item"], ({ item }: { item: InboxModel }) => ({
  item,
}))(ThreadTileComponent);
