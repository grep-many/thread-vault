import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import InboxModel from "@/model/inbox";
import { FontAwesome6 } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

interface ScrapePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chats: InboxModel[];
  onConfirm: (ids: string[]) => void;
}

interface ThreadAvatarProps {
  item: InboxModel;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_AVATAR_BTN = "flex-1 items-center justify-start p-2 active:opacity-70";
const CLS_AVATAR_IMG = "mb-2 h-16 w-16 rounded-full bg-muted dark:bg-dark-muted";
const CLS_CHECK_OUTER =
  "absolute bottom-2 right-0 h-6 w-6 items-center justify-center rounded-full border-[3px] border-card bg-card dark:border-dark-card dark:bg-dark-card";
const CLS_CHECK_INNER_SELECTED =
  "h-full w-full items-center justify-center rounded-full border-2 border-primary bg-primary";
const CLS_CHECK_INNER_IDLE =
  "h-full w-full items-center justify-center rounded-full border-2 border-border bg-transparent dark:border-dark-border";
const CLS_AVATAR_NAME =
  "text-center text-xs font-semibold text-foreground dark:text-dark-foreground";
const CLS_HEADER_ROW = "mb-4 flex-row items-center justify-between px-1";
const CLS_SELECTED_COUNT = "text-sm font-semibold text-muted-foreground dark:text-dark-muted-foreground";
const CLS_SELECT_ALL_BTN = "p-2 active:opacity-70";
const CLS_SELECT_ALL_TEXT = "font-bold text-primary";
const CLS_LIST_WRAP = "h-[400px]";
const CLS_FOOTER_ROW = "mt-6 flex-row justify-end gap-3";

// ─── Sub-components ───────────────────────────────────────────────────────────

const ThreadAvatar = memo(function ThreadAvatar({ item, isSelected, onToggle }: ThreadAvatarProps) {
  const { threadId } = item;
  const handlePress = useCallback(() => onToggle(threadId), [onToggle, threadId]);
  const checkInnerClass = isSelected ? CLS_CHECK_INNER_SELECTED : CLS_CHECK_INNER_IDLE;

  return (
    <Pressable onPress={handlePress} className={CLS_AVATAR_BTN}>
      <View className="relative">
        <Image
          source={item.pfpUrl ? { uri: item.pfpUrl } : undefined}
          className={CLS_AVATAR_IMG}
        />
        <View className={CLS_CHECK_OUTER}>
          <View className={checkInnerClass}>
            {isSelected && <FontAwesome6 name="check" size={8} color="white" />}
          </View>
        </View>
      </View>
      <Text className={CLS_AVATAR_NAME} numberOfLines={1}>
        {item.username}
      </Text>
    </Pressable>
  );
});

const keyExtractor = (item: InboxModel) => item.threadId;

// ─── Main component ───────────────────────────────────────────────────────────

export const ScrapePromptDialog = memo(function ScrapePromptDialog({
  isOpen,
  onClose,
  chats,
  onConfirm,
}: ScrapePromptDialogProps) {
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedThreadIds([]);
    }
  }, [isOpen]);

  const allSelected = chats.length > 0 && selectedThreadIds.length === chats.length;
  const selectedCount = selectedThreadIds.length;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedThreadIds([]);
    } else {
      setSelectedThreadIds(chats.map((c) => c.threadId));
    }
  }, [allSelected, chats]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedThreadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedThreadIds);
  }, [onConfirm, selectedThreadIds]);

  const renderItem = useCallback(
    ({ item, extraData }: { item: InboxModel; extraData?: string[] }) => (
      <ThreadAvatar
        item={item}
        isSelected={!!extraData?.includes(item.threadId)}
        onToggle={toggleSelect}
      />
    ),
    [toggleSelect],
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Select Threads to Sync">
      <View className={CLS_HEADER_ROW}>
        <Text className={CLS_SELECTED_COUNT}>{selectedCount} selected</Text>
        <Pressable onPress={toggleSelectAll} className={CLS_SELECT_ALL_BTN}>
          <Text className={CLS_SELECT_ALL_TEXT}>
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
        </Pressable>
      </View>
      <View className={CLS_LIST_WRAP}>
        <FlashList
          data={chats}
          keyExtractor={keyExtractor}
          numColumns={3}
          renderItem={renderItem}
          extraData={selectedThreadIds}
          removeClippedSubviews
          estimatedItemSize={96}
          windowSize={5}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
        />
      </View>
      <View className={CLS_FOOTER_ROW}>
        <Button variant="secondary" onPress={onClose}>
          <Text className="font-bold text-foreground dark:text-dark-foreground">Cancel</Text>
        </Button>
        <Button variant="gradient" onPress={handleConfirm} disabled={selectedThreadIds.length === 0}>
          <Text className="font-bold text-white">Start Sync</Text>
        </Button>
      </View>
    </Dialog>
  );
});
