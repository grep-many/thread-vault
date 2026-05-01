import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Button, Dialog } from "@/components";
import InboxModel from "@/model/inbox";

interface ScrapePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chats: InboxModel[];
  onConfirm: (ids: string[]) => void;
}

export function ScrapePromptDialog({ isOpen, onClose, chats, onConfirm }: ScrapePromptDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(chats.map(c => c.threadId)));
    }
  }, [isOpen, chats]);

  const toggleSelectAll = () => {
    if (selectedIds.size === chats.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(chats.map(c => c.threadId)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Select Threads to Sync">
      <View className="flex-row justify-between items-center mb-4 px-1">
        <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {selectedIds.size} selected
        </Text>
        <Pressable onPress={toggleSelectAll} className="p-2 active:opacity-70">
          <Text className="text-pink-500 font-bold">{selectedIds.size === chats.length ? "Deselect All" : "Select All"}</Text>
        </Pressable>
      </View>
      <View className="h-[400px]">
        <FlashList
          data={chats}
          keyExtractor={(item) => item.threadId}
          estimatedItemSize={100}
          numColumns={3}
          renderItem={({ item }) => (
            <Pressable onPress={() => toggleSelect(item.threadId)} className="flex-1 items-center justify-start p-2 active:opacity-70">
              <View className="relative">
                <Image source={{ uri: item.pfpUrl || "https://i.pravatar.cc/150" }} className="h-16 w-16 rounded-full bg-zinc-200 mb-2" />
                <View className="absolute bottom-2 right-0 h-6 w-6 rounded-full border-[3px] items-center justify-center border-white dark:border-zinc-900 bg-white dark:bg-zinc-900">
                  <View className={`h-full w-full rounded-full border-2 items-center justify-center ${selectedIds.has(item.threadId) ? 'border-pink-500 bg-pink-500' : 'border-zinc-300 dark:border-zinc-700 bg-transparent'}`}>
                    {selectedIds.has(item.threadId) && <FontAwesome6 name="check" size={8} color="white" />}
                  </View>
                </View>
              </View>
              <Text className="font-semibold text-xs text-center text-zinc-900 dark:text-white" numberOfLines={1}>{item.username}</Text>
            </Pressable>
          )}
        />
      </View>
      <View className="mt-6 flex-row justify-end gap-3">
        <Button variant="secondary" onPress={onClose}>
          <Text className="font-bold dark:text-white">Cancel</Text>
        </Button>
        <Button variant="gradient" onPress={() => onConfirm(Array.from(selectedIds))}>
          <Text className="font-bold text-white">Start Sync</Text>
        </Button>
      </View>
    </Dialog>
  );
}
