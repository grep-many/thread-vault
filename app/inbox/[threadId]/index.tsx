import { Button, TabButton } from "@/components";
import { FontAwesome6 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState, useEffect } from "react";
import { Image, Pressable, ScrollView, Text, View, BackHandler } from "react-native";

// --- 1. Types & Interfaces ---
type TabType = "media" | "reels" | "urls";

interface MockMedia {
  id: string;
  type: TabType;
  uri: string;
  isSent: boolean;
  timestamp: string;
}

// --- 2. Mock Data (Fixes the ReferenceErrors) ---
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

const MOCK_DATA: MockMedia[] = [
  {
    id: "m1",
    type: "media",
    isSent: true,
    uri: "https://picsum.photos/seed/1/400",
    timestamp: "10:30 AM",
  },
  {
    id: "m2",
    type: "media",
    isSent: false,
    uri: "https://picsum.photos/seed/2/400",
    timestamp: "10:32 AM",
  },
  {
    id: "r1",
    type: "reels",
    isSent: true,
    uri: "https://picsum.photos/seed/3/400",
    timestamp: "Yesterday",
  },
  { id: "u1", type: "urls", isSent: false, uri: "https://google.com", timestamp: "Monday" },
  {
    id: "m3",
    type: "media",
    isSent: true,
    uri: "https://picsum.photos/seed/4/400",
    timestamp: "Just now",
  },
];

export default function ThreadDetail() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("media");
  const [isScraping, setIsScraping] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Get active thread info (Fixes MOCK_THREADS error)
  const thread = MOCK_THREADS[threadId as string] || MOCK_THREADS["1"];

  // Filtered Media Logic (Fixes MOCK_DATA error)
  const displayedMedia = useMemo(() => {
    return MOCK_DATA.filter((item: MockMedia) => item.type === activeTab);
  }, [activeTab]);

  // Handle Android Back Button to exit Select Mode
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

  const handleSync = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsScraping(true);
    setTimeout(() => setIsScraping(false), 2000);
  };

  const toggleSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      if (newSet.size === 0) setIsSelectMode(false);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleLongPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSelectMode(true);
    toggleSelection(id);
  };

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false} className="flex-1">
        {/* 4. Profile Section */}
        <View className="relative items-center py-16">
          <Pressable
            onPress={() => router.navigate("/inbox")}
            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.9 : 1 }] }]}
            className="absolute top-12 left-6 z-50 size-10 items-center justify-center rounded-full shadow-xl backdrop-blur-md dark:bg-zinc-900/80"
          >
            <FontAwesome6 name="chevron-left" size={18} color="#71717a" />
          </Pressable>
          <View className="relative">
            <View className="h-32 w-32 overflow-hidden rounded-[40px] border-4 border-white shadow-2xl dark:border-zinc-800">
              <Image source={{ uri: thread.pfp }} className="h-full w-full" />
            </View>

            {/* Sync Button with Fixed Style Scale */}
            <Pressable
              onPress={handleSync}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  elevation: 10,
                  shadowColor: "#ec4899",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                },
              ]}
              className="absolute -right-1 -bottom-1 size-8 items-center justify-center rounded-full bg-zinc-900/20 dark:bg-white/20"
            >
              <FontAwesome6
                name="rotate"
                size={18}
                color={isScraping ? "#ec4899" : "#71717a"}
                className={isScraping ? "animate-spin" : ""}
              />
            </Pressable>
          </View>

          <Text className="mt-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            {thread.title}
          </Text>
          <Text className="font-medium text-zinc-500">@{thread.username}</Text>

          {isSelectMode && (
            <View className="mt-4 flex-row items-center gap-2 rounded-full bg-pink-500 px-4 py-1.5 shadow-lg shadow-pink-500/40">
              <FontAwesome6 name="check-double" size={12} color="white" />
              <Text className="text-[10px] font-bold tracking-widest text-white uppercase">
                {selectedIds.size} Selected
              </Text>
            </View>
          )}
        </View>

        {/* 6. Tabs */}
        <View className="bg-zinc-50/95 px-6 py-4 backdrop-blur-sm dark:bg-zinc-950/95">
          <View className="flex-row rounded-2xl border border-black/5 bg-zinc-200/50 p-1.5 dark:border-white/5 dark:bg-white/5">
            <TabButton
              active={activeTab === "media"}
              label="Media"
              icon="image"
              onPress={() => setActiveTab("media")}
            />
            <TabButton
              active={activeTab === "reels"}
              label="Reels"
              icon="clapperboard"
              onPress={() => setActiveTab("reels")}
            />
            <TabButton
              active={activeTab === "urls"}
              label="Links"
              icon="link"
              onPress={() => setActiveTab("urls")}
            />
          </View>
        </View>

        {/* 7. Grid Content */}
        <View className="px-3 pt-2 pb-32">
          {isScraping ? (
            <View className="items-center justify-center py-24">
              <FontAwesome6
                name="circle-notch"
                size={32}
                color="#ec4899"
                className="animate-spin"
              />
              <Text className="mt-4 font-bold text-zinc-500">Scanning Vault...</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap">
              {displayedMedia.map((item) => (
                <Pressable
                  key={item.id}
                  onLongPress={() => handleLongPress(item.id)}
                  onPress={() => (isSelectMode ? toggleSelection(item.id) : null)}
                  delayLongPress={250}
                  style={({ pressed }) => [
                    {
                      transform: [
                        { scale: pressed || (isSelectMode && selectedIds.has(item.id)) ? 0.96 : 1 },
                      ],
                    },
                  ]}
                  className="aspect-square w-1/3 p-1.5"
                >
                  <View
                    className={`flex-1 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900 ${selectedIds.has(item.id) ? "border-2 border-pink-500" : ""}`}
                  >
                    {item.type === "urls" ? (
                      <View className="flex-1 items-center justify-center p-3">
                        <FontAwesome6 name="link" size={16} color="#3b82f6" />
                      </View>
                    ) : (
                      <Image source={{ uri: item.uri }} className="flex-1" />
                    )}

                    {isSelectMode && (
                      <View
                        className={`absolute inset-0 items-center justify-center ${selectedIds.has(item.id) ? "bg-pink-500/20" : "bg-black/10"}`}
                      >
                        <View
                          className={`h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg ${selectedIds.has(item.id) ? "bg-pink-500" : "bg-black/20"}`}
                        >
                          <FontAwesome6
                            name={selectedIds.has(item.id) ? "check" : "circle"}
                            size={12}
                            color="white"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 8. Floating Action Bar */}
      {isSelectMode && selectedIds.size > 0 && (
        <View className="absolute right-6 bottom-8 left-6">
          <Button variant="gradient" onPress={() => console.log("Bulk Unsend Initiated")}>
            <FontAwesome6 name="trash-can" size={16} color="white" />
            <Text className="ml-2 font-black tracking-tight text-white uppercase">
              Unsend {selectedIds.size} Items
            </Text>
          </Button>
        </View>
      )}
    </View>
  );
}
