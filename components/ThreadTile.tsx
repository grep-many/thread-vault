import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import withObservables from "@nozbe/with-observables";
import InboxModel from "@/model/inbox";

interface ChatItemProps {
  item: InboxModel;
  onPress: () => void;
  isSyncing?: boolean;
  onSyncPress?: () => void;
}

const ThreadTileComponent = ({ item, onPress, isSyncing, onSyncPress }: ChatItemProps) => {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3 px-2 active:bg-zinc-100 dark:active:bg-zinc-800 rounded-xl"
    >
      <View className="flex-row items-center flex-1">
        <View className="relative">
          <View className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center overflow-hidden">
            {item.pfpUrl ? (
              <Image source={{ uri: item.pfpUrl }} className="h-full w-full" />
            ) : (
              <FontAwesome6 name="user" size={20} color="#a1a1aa" />
            )}
          </View>
          {isSyncing && (
            <View className="absolute bottom-0 right-0 bg-white dark:bg-zinc-950 rounded-full p-0.5 shadow-sm">
              <FontAwesome6 name="rotate" size={10} color="#ec4899" className="animate-spin" />
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-base text-zinc-900 dark:text-white" numberOfLines={1}>{item.fullName || item.username}</Text>
          {!!item.fullName && <Text className="text-xs text-zinc-500" numberOfLines={1}>@{item.username}</Text>}
        </View>
      </View>
      <Pressable onPress={onSyncPress} className="ml-4 h-8 w-8 rounded-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 active:opacity-70">
        <FontAwesome6 name={isSyncing ? "pause" : "rotate"} size={12} color={isSyncing ? "#ec4899" : "#71717a"} />
      </Pressable>
    </Pressable>
  );
};

export const ThreadTile = withObservables(['item'], ({ item }: { item: InboxModel }) => ({
  item,
}))(ThreadTileComponent);
