import InboxModel from "@/model/inbox";
import { FontAwesome6 } from "@expo/vector-icons";
import withObservables from "@nozbe/with-observables";
import { memo } from "react";
import { Image, Pressable, Text, View } from "react-native";

const SYNC_BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

interface ThreadTileProps {
  item: InboxModel;
  onPress: () => void;
  isSyncing?: boolean;
  onSyncPress?: () => void;
}

// ─── Stable class strings ─────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

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
      className="active:bg-muted/50 dark:active:bg-dark-muted/50 flex-row items-center justify-between rounded-xl px-2 py-3"
    >
      <View className="flex-1 flex-row items-center">
        <View className="relative">
          <View className="bg-muted dark:bg-dark-muted h-12 w-12 items-center justify-center overflow-hidden rounded-full">
            {item.pfpUrl ? (
              <Image source={{ uri: item.pfpUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <FontAwesome6 name="user" size={20} color="#a1a1aa" />
            )}
          </View>
          {isSyncing && (
            <View className="bg-background dark:bg-dark-background absolute right-0 bottom-0 rounded-full p-0.5 shadow-sm">
              <FontAwesome6 name="rotate" size={10} color="#ec4899" className="animate-spin" />
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-dark text-base font-semibold dark:text-white" numberOfLines={1}>
            {displayName}
          </Text>
          {!!item.fullName && (
            <Text
              className="text-muted-foreground dark:text-dark-muted-foreground text-xs"
              numberOfLines={1}
            >
              @{item.username}
            </Text>
          )}
        </View>
      </View>
      <Pressable
        onPress={onSyncPress}
        className="bg-muted dark:bg-dark-muted ml-4 h-8 w-8 items-center justify-center rounded-full active:opacity-70"
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

export const ThreadTile = withObservables(["item"], ({ item }: { item: InboxModel }) => ({
  item,
}))(ThreadTileComponent);
