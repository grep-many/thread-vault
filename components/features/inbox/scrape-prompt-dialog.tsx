import { memo, useCallback, useState, useEffect } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import InboxModel from "@/model/inbox";

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

const ThreadAvatar = memo(function ThreadAvatar({ item, isSelected, onToggle }: ThreadAvatarProps) {
  const handlePress = useCallback(() => onToggle(item.threadId), [onToggle, item.threadId]);

  return (
    <Pressable
      onPress={handlePress}
      className="flex-1 items-center justify-start p-2 active:opacity-70"
    >
      <View className="relative">
        <Image
          source={item.pfpUrl ? { uri: item.pfpUrl } : undefined}
          style={styles.avatar}
        />
        <View style={styles.checkOuter}>
          <View
            className={`h-full w-full items-center justify-center rounded-full border-2 ${
              isSelected ? "border-pink-500 bg-pink-500" : "border-zinc-300 bg-transparent dark:border-zinc-700"
            }`}
          >
            {isSelected && <FontAwesome6 name="check" size={8} color="white" />}
          </View>
        </View>
      </View>
      <Text
        className="text-center text-xs font-semibold text-zinc-900 dark:text-white"
        numberOfLines={1}
      >
        {item.username}
      </Text>
    </Pressable>
  );
});

const keyExtractor = (item: InboxModel) => item.threadId;

export const ScrapePromptDialog = memo(function ScrapePromptDialog({
  isOpen,
  onClose,
  chats,
  onConfirm,
}: ScrapePromptDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(chats.map((c) => c.threadId)));
    }
  }, [isOpen, chats]);

  const allSelected = selectedIds.size === chats.length;
  const selectedCount = selectedIds.size;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(chats.map((c) => c.threadId)));
    }
  }, [allSelected, chats]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selectedIds));
  }, [onConfirm, selectedIds]);

  const renderItem = useCallback(
    ({ item }: { item: InboxModel }) => (
      <ThreadAvatar
        item={item}
        isSelected={selectedIds.has(item.threadId)}
        onToggle={toggleSelect}
      />
    ),
    [selectedIds, toggleSelect],
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Select Threads to Sync">
      <View className="mb-4 flex-row items-center justify-between px-1">
        <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {selectedCount} selected
        </Text>
        <Pressable onPress={toggleSelectAll} className="p-2 active:opacity-70">
          <Text className="font-bold text-pink-500">
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.listContainer}>
        <FlashList
          data={chats}
          keyExtractor={keyExtractor}
          numColumns={3}
          renderItem={renderItem}
          estimatedItemSize={96}
          extraData={selectedIds}
          removeClippedSubviews
        />
      </View>
      <View className="mt-6 flex-row justify-end gap-3">
        <Button variant="secondary" onPress={onClose}>
          <Text className="font-bold dark:text-white">Cancel</Text>
        </Button>
        <Button variant="gradient" onPress={handleConfirm}>
          <Text className="font-bold text-white">Start Sync</Text>
        </Button>
      </View>
    </Dialog>
  );
});

const styles = StyleSheet.create({
  listContainer: {
    height: 400,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e4e4e7",
    marginBottom: 8,
  },
  checkOuter: {
    position: "absolute",
    right: 0,
    bottom: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
    backgroundColor: "white",
  },
});
