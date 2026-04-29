import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Image, Pressable, Text, View, BackHandler } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { FontAwesome6 } from "@expo/vector-icons";
import { Button, TabButton } from "@/components";

// --- Types ---
type TabType = "media" | "reels" | "urls";

interface MockMedia {
  id: string;
  type: TabType;
  uri: string;
  isSent: boolean;
  timestamp: string;
}

// --- Constants ---
const COLUMN_COUNT = 3;

const MOCK_THREADS: Record<string, { title: string; username: string; pfp: string }> = {
  "1": {
    title: "John Doe",
    username: "johndoe_official",
    pfp: "https://api.dicebear.com/7.x/avataaars/png?seed=John",
  },
  "2": {
    title: "Jane Smith",
    username: "janes_design",
    pfp: "https://api.dicebear.com/7.x/avataaars/png?seed=Jane",
  },
};

const MOCK_DATA: MockMedia[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `m${i}`,
  type: i % 3 === 0 ? "reels" : i % 3 === 1 ? "urls" : "media",
  isSent: true,
  uri: `https://picsum.photos/seed/${i}/400`,
  timestamp: "10:30 AM",
}));

export default function ThreadDetail() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("media");
  const [isScraping, setIsScraping] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const thread = MOCK_THREADS[threadId as string] || MOCK_THREADS["1"];

  const displayedMedia = useMemo(() => {
    return MOCK_DATA.filter((item) => item.type === activeTab);
  }, [activeTab]);

  // --- Handlers ---
  const toggleSelection = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        if (newSet.size === 0) setIsSelectMode(false);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleLongPress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSelectMode(true);
      toggleSelection(id);
    },
    [toggleSelection],
  );

  useEffect(() => {
    const backAction = () => {
      if (isSelectMode) {
        setIsSelectMode(false);
        setSelectedIds(new Set());
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [isSelectMode]);

  // --- Sub-components for FlashList ---
  const ListHeader = () => (
    <View className="bg-zinc-50 dark:bg-zinc-950">
      {/* Profile Section */}
      <View className="relative items-center py-16">
        <Pressable
          onPress={() => router.back()}
          className="absolute top-12 left-6 z-50 size-10 items-center justify-center rounded-full bg-white/80 shadow-xl backdrop-blur-md dark:bg-zinc-900/80"
        >
          <FontAwesome6 name="chevron-left" size={18} color="#71717a" />
        </Pressable>
        <View className="relative">
          <View className="h-32 w-32 overflow-hidden rounded-[40px] border-4 border-white shadow-2xl dark:border-zinc-800">
            <Image source={{ uri: thread.pfp }} className="h-full w-full" />
          </View>
          <Pressable
            onPress={() => {
              setIsScraping(true);
              setTimeout(() => setIsScraping(false), 2000);
            }}
            className="absolute -right-1 -bottom-1 size-8 items-center justify-center rounded-full bg-zinc-900 dark:bg-white"
          >
            <FontAwesome6
              name="rotate"
              size={14}
              color={isScraping ? "#ec4899" : "#71717a"}
              className={isScraping ? "animate-spin" : ""}
            />
          </Pressable>
        </View>
        <Text className="mt-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          {thread.title}
        </Text>
        <Text className="font-medium text-zinc-500">@{thread.username}</Text>
      </View>

      {/* Tabs - Now inside the header but sticky via ListHeaderComponent/stickyHeaderIndices */}
      <View className="bg-zinc-50/95 px-6 py-4 backdrop-blur-sm dark:bg-zinc-950/95">
        <View className="flex-row rounded-2xl border border-black/5 bg-zinc-200/50 p-1.5 dark:border-white/5 dark:bg-white/5">
          {(["media", "reels", "urls"] as TabType[]).map((tab) => (
            <TabButton
              key={tab}
              active={activeTab === tab}
              label={tab.charAt(0).toUpperCase() + tab.slice(1)}
              icon={tab === "media" ? "image" : tab === "reels" ? "clapperboard" : "link"}
              onPress={() => setActiveTab(tab)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: MockMedia }) => {
      const isSelected = selectedIds.has(item.id);

      return (
        <Pressable
          onLongPress={() => handleLongPress(item.id)}
          onPress={() =>
            isSelectMode ? toggleSelection(item.id) : router.push(`/inbox/${threadId}/${activeTab}`)
          }
          delayLongPress={250}
          className="aspect-square w-full p-1"
        >
          <View
            className={`flex-1 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-zinc-900 ${isSelected ? "border-2 border-pink-500" : ""}`}
          >
            {item.type === "urls" ? (
              <View className="flex-1 items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                <FontAwesome6 name="link" size={20} color="#3b82f6" />
              </View>
            ) : (
              <Image source={{ uri: item.uri }} className="flex-1" />
            )}

            {isSelectMode && (
              <View
                className={`absolute inset-0 items-center justify-center ${isSelected ? "bg-pink-500/20" : "bg-black/10"}`}
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border-2 border-white ${isSelected ? "bg-pink-500" : "bg-black/20"}`}
                >
                  {isSelected && <FontAwesome6 name="check" size={10} color="white" />}
                </View>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [isSelectMode, selectedIds, activeTab, threadId],
  );

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <FlashList
        data={displayedMedia}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 100 }}
        extraData={{ isSelectMode, selectedIds }} // Important for re-rendering items when selection changes
      />

      {/* Floating Action Bar */}
      {isSelectMode && selectedIds.size > 0 && (
        <View className="absolute right-6 bottom-8 left-6 shadow-2xl">
          <Button variant="gradient" onPress={() => console.log("Bulk Unsend")}>
            <FontAwesome6 name="trash-can" size={16} color="white" />
            <Text className="ml-2 font-black text-white uppercase">
              Unsend {selectedIds.size} Items
            </Text>
          </Button>
        </View>
      )}
    </View>
  );
}
