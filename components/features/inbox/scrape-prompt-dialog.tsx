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


// ─── Sub-components ───────────────────────────────────────────────────────────

const ThreadAvatar = memo(function ThreadAvatar({ item, isSelected, onToggle }: ThreadAvatarProps) {
  const { threadId } = item;
  const handlePress = useCallback(() => onToggle(threadId), [onToggle, threadId]);
  const checkInnerClass = isSelected ? "h-full w-full items-center justify-center rounded-full border-2 border-primary bg-primary" : "h-full w-full items-center justify-center rounded-full border-2 border-border bg-transparent dark:border-dark-border";

  return (
    <Pressable onPress={handlePress} className="flex-1 items-center justify-start p-2 active:opacity-70">
      <View className="relative">
        <Image
          source={item.pfpUrl ? { uri: item.pfpUrl } : undefined}
          className="mb-2 h-16 w-16 rounded-full bg-muted dark:bg-dark-muted"
        />
        <View className="absolute bottom-2 right-0 h-6 w-6 items-center justify-center rounded-full border-[3px] border-card bg-card dark:border-dark-card dark:bg-dark-card">
          <View className={checkInnerClass}>
            {isSelected && <FontAwesome6 name="check" size={8} color="white" />}
          </View>
        </View>
      </View>
      <Text className="text-center text-xs font-semibold text-foreground dark:text-dark-foreground" numberOfLines={1}>
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
      <View className="mb-4 flex-row items-center justify-between px-1">
        <Text className="text-sm font-semibold text-muted-foreground dark:text-dark-muted-foreground">{selectedCount} selected</Text>
        <Pressable onPress={toggleSelectAll} className="p-2 active:opacity-70">
          <Text className="font-bold text-primary">
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
        </Pressable>
      </View>
      <View className="h-[400px]">
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
      <View className="mt-6 flex-row justify-end gap-3">
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
