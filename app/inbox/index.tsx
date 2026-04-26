import { useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons"; // Swapped to FontAwesome6
import { Input } from "@/components";
import { router } from "expo-router";

const MOCK_CHATS = [
  {
    id: "1",
    name: "johndoe",
    lastMsg: "Sent a reel",
    time: "2m",
    avatar: "https://i.pravatar.cc/150?u=1",
    unread: true,
  },
  {
    id: "2",
    name: "react_dev",
    lastMsg: "The API is ready.",
    time: "1h",
    avatar: "https://i.pravatar.cc/150?u=2",
    unread: false,
  },
];

export default function Inbox() {
  const [search, setSearch] = useState("");

  const openThread = (id: string) => {
    router.push({
      pathname: "/inbox/[threadId]",
      params: { threadId: id },
    });
  };

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Header Area */}
      <View className="px-5 pt-10 pb-4">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-zinc-900 dark:text-white">Thread Vault</Text>
        </View>

        {/* Search Bar */}
        <Input
          placeholder="Search thread"
          value={search}
          onChangeText={setSearch}
          /* Replaced Search with magnifying-glass */
          icon={<FontAwesome6 name="magnifying-glass" size={16} color="#71717a" />}
        />
      </View>

      {/* Chat List */}
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40 }}
        renderItem={({ item }) => <ThreadTile item={item} onPress={() => openThread(item.id)} />}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        ItemSeparatorComponent={() => <View className="h-1.5" />}
      />
    </View>
  );
}

interface ChatItemProps {
  item: (typeof MOCK_CHATS)[0];
  onPress: () => void;
}

function ThreadTile({ item, onPress }: ChatItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-3xl border border-black/5 bg-white p-4 shadow-sm active:scale-[0.97] dark:border-white/10 dark:bg-white/5"
    >
      {/* Avatar with Status Ring */}
      <View className={`rounded-full p-0.5 ${item.unread ? "border-2 border-pink-500" : ""}`}>
        <Image source={{ uri: item.avatar }} className="h-14 w-14 rounded-full bg-zinc-200" />
      </View>

      {/* Text Info */}
      <View className="ml-4 flex-1 justify-center">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-zinc-900 dark:text-white" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-zinc-400">{item.time}</Text>
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          <Text
            className={`mr-2 flex-1 text-sm ${item.unread ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
            numberOfLines={1}
          >
            {item.lastMsg}
          </Text>
          {item.unread && <View className="h-2 w-2 rounded-full bg-pink-500" />}
        </View>
      </View>
    </Pressable>
  );
}
