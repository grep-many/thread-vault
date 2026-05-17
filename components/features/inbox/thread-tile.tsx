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

const CLS_ROW =
  "flex-row items-center justify-between rounded-xl px-2 py-3 active:bg-muted/50 dark:active:bg-dark-muted/50";
const CLS_LEFT = "flex-1 flex-row items-center";
const CLS_AVATAR_WRAP =
  "h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted dark:bg-dark-muted";
const CLS_AVATAR_IMG = "h-full w-full";
const CLS_SYNC_BADGE =
  "absolute right-0 bottom-0 rounded-full bg-background p-0.5 shadow-sm dark:bg-dark-background";
const CLS_TEXT_WRAP = "ml-3 flex-1";
const CLS_PRIMARY_TEXT = "text-base font-semibold text-primary";
const CLS_SECONDARY_TEXT = "text-xs text-muted-foreground dark:text-dark-muted-foreground";
const CLS_SYNC_BTN =
  "ml-4 h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70 dark:bg-dark-muted";

// ─── Component ────────────────────────────────────────────────────────────────

const ThreadTileComponent = memo(function ThreadTileComponent({
  item,
  onPress,
  isSyncing,
  onSyncPress,
}: ThreadTileProps) {
  const displayName = item.fullName || item.username;

  return (
    <Pressable onPress={onPress} className={CLS_ROW}>
      <View className={CLS_LEFT}>
        <View className="relative">
          <View className={CLS_AVATAR_WRAP}>
            {item.pfpUrl ? (
              <Image
                source={{ uri: item.pfpUrl }}
                className={CLS_AVATAR_IMG}
                resizeMode="cover"
              />
            ) : (
              <FontAwesome6 name="user" size={20} color="#a1a1aa" />
            )}
          </View>
          {isSyncing && (
            <View className={CLS_SYNC_BADGE}>
              <FontAwesome6 name="rotate" size={10} color="#ec4899" className="animate-spin" />
            </View>
          )}
        </View>
        <View className={CLS_TEXT_WRAP}>
          <Text className={CLS_PRIMARY_TEXT} numberOfLines={1}>
            {displayName}
          </Text>
          {!!item.fullName && (
            <Text className={CLS_SECONDARY_TEXT} numberOfLines={1}>
              @{item.username}
            </Text>
          )}
        </View>
      </View>
      <Pressable
        onPress={onSyncPress}
        className={CLS_SYNC_BTN}
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
