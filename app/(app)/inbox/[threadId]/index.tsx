import { useState, useEffect, useCallback } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View, BackHandler } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { FontAwesome6 } from "@expo/vector-icons";
import { Button, TabButton } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { MediaGridItem } from "@/components/features/inbox/media-grid-item";
import { UnsendProgressModal } from "@/components/modals/unsend-progress-modal";
import { useSync } from "@/hooks/sync/use-sync";
import { useUnsendQueue } from "@/hooks/unsend/use-unsend-queue";
import { database } from "@/model";
import Media from "@/model/media";
import Inbox from "@/model/inbox";
import { Q } from "@nozbe/watermelondb";
import { COLUMN_COUNT } from "@/constants";

export default function ThreadDetail() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();

  // Keep screen on while browsing the thread media grid
  useKeepAwake();

  const [activeTab, setActiveTab] = useState<TabType>("media");
  const [filterMode, setFilterMode] = useState<"all" | "sent" | "received">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unsendModalVisible, setUnsendModalVisible] = useState(false);

  const isSelectMode = selectedIds.size > 0;

  const {
    currentSyncingThreadId,
    syncSingleThread,
    pauseSync,
    totalItemsScanned,
    mediaCount,
    reelCount,
    linkCount,
  } = useSync();
  const { startUnsend } = useUnsendQueue();
  const { showToast } = useToast();

  const isScraping = currentSyncingThreadId === threadId;

  const [thread, setThread] = useState<Inbox | null>(null);
  const [displayedMedia, setDisplayedMedia] = useState<Media[]>([]);
  const [allMediaCounts, setAllMediaCounts] = useState({
    media: 0,
    reel: 0,
    link: 0,
    interactions: 0,
  });

  const profileImageUrl = thread?.pfpUrl;
  const threadUsername = thread?.username;

  // ── DB subscriptions ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!threadId) return;
    const sub = database
      .get<Inbox>("inbox")
      .query(Q.where("thread_id", threadId))
      .observe()
      .subscribe((data) => {
        if (data.length > 0) setThread(data[0]);
      });
    return () => sub.unsubscribe();
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !activeTab) return;
    const queryParts = [
      Q.where("thread_id", threadId),
      Q.where("type", activeTab),
      ...(filterMode === "sent" ? [Q.where("is_sent", true)] : []),
      ...(filterMode === "received" ? [Q.where("is_sent", false)] : []),
    ];
    const sub = database
      .get<Media>("media")
      .query(...queryParts)
      .observe()
      .subscribe((data) => setDisplayedMedia(data));
    return () => sub.unsubscribe();
  }, [threadId, activeTab, filterMode]);

  useEffect(() => {
    if (!threadId) return;
    const sub = database
      .get<Media>("media")
      .query(Q.where("thread_id", threadId))
      .observe()
      .subscribe((data) => {
        setAllMediaCounts({
          media: data.filter((d) => d.type === "media").length,
          reel: data.filter((d) => d.type === "reel").length,
          link: data.filter((d) => d.type === "link").length,
          interactions: data.length,
        });
      });
    return () => sub.unsubscribe();
  }, [threadId]);

  // ── Hardware back — exit select mode first ──────────────────────────────────

  useEffect(() => {
    const backAction = () => {
      if (isSelectMode) {
        setSelectedIds(new Set());
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [isSelectMode]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const allSelected = displayedMedia.length > 0 && selectedIds.size === displayedMedia.length;

  const handleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedMedia.map(m => m.itemId)));
    }
  }, [allSelected, displayedMedia]);

  const toggleSelection = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleOpenItem = useCallback(
    (item: Media) => {
      router.push(`/${threadId}/${item.itemId}/${item.type}`);
    },
    [router, threadId],
  );

  const handleUnsend = useCallback(() => {
    const inputs: UnsendJobInput[] = Array.from(selectedIds).map((id) => ({
      itemId: id,
      threadId,
    }));
    startUnsend(inputs);
    setUnsendModalVisible(true);
    setSelectedIds(new Set()); // Clear selection immediately
  }, [selectedIds, threadId, startUnsend]);

  const handleUnsendComplete = useCallback(
    (successCount: number, failureCount: number) => {
      const message =
        failureCount > 0
          ? `✓ ${successCount} unsent · ✗ ${failureCount} failed`
          : `✓ ${successCount} message${successCount !== 1 ? "s" : ""} unsent`;
      showToast(message, failureCount > 0 ? "error" : "success");
    },
    [showToast],
  );

  const keyExtractor = useCallback((item: Media) => item.itemId, []);

  const getItemType = useCallback((item: Media) => {
    if (item.type === "link") return "link";
    if (
      item.itemType === "voice_media" ||
      item.url?.includes(".m4a") ||
      item.url?.includes("audio")
    ) {
      return "audio";
    }
    return item.type;
  }, []);

  // ── Sub-components ──────────────────────────────────────────────────────────

  const ListHeader = useCallback(
    () => (
      <View className="bg-zinc-50 dark:bg-zinc-950">
        {/* Profile Section */}
        <View className="relative items-center py-16">
          <Pressable
            onPress={() => router.replace("/inbox")}
            className="absolute top-12 left-6 z-50 size-10 items-center justify-center rounded-full bg-white/80 shadow-xl backdrop-blur-md dark:bg-zinc-900/80"
          >
            <FontAwesome6 name="chevron-left" size={18} color="#71717a" />
          </Pressable>

          <View className="relative">
            <View className="h-32 w-32 items-center justify-center overflow-hidden rounded-[40px] border-4 border-white bg-zinc-200 shadow-2xl dark:border-zinc-800 dark:bg-zinc-800">
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <FontAwesome6 name="user" size={48} color="#a1a1aa" />
              )}
            </View>

            <Pressable
              onPress={() => {
                if (isScraping) pauseSync();
                else if (thread) syncSingleThread(threadId, thread.username);
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
            {threadUsername || "Loading..."}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Interactions: {allMediaCounts.interactions}
          </Text>

          {isScraping && totalItemsScanned > 0 && (
            <View className="mt-3 flex-row items-center gap-3 rounded-full bg-zinc-200/50 px-3 py-1.5 dark:bg-zinc-800/50">
              {[
                ["SCANNED", totalItemsScanned],
                ["MEDIA", mediaCount],
                ["REELS", reelCount],
                ["LINKS", linkCount],
              ].map(([label, value]) => (
                <Text
                  key={label}
                  className="text-[10px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  {label}: {value}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Tab + filter row */}
        <View className="bg-zinc-50/95 px-6 py-4 backdrop-blur-sm dark:bg-zinc-950/95">
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row rounded-2xl border border-black/5 bg-zinc-200/50 p-1.5 dark:border-white/5 dark:bg-white/5">
              {(["media", "reel", "link"] as TabType[]).map((tab) => (
                <TabButton
                  key={tab}
                  active={activeTab === tab}
                  label={
                    tab === "link" && activeTab === "link"
                      ? "Links"
                      : tab === "reel" && activeTab === "reel"
                        ? "Reels"
                        : tab === "media" && activeTab === "media" ? "Media" : ""
                  }
                  icon={
                    tab === "media" ? "image" : tab === "reel" ? "clapperboard" : "link"
                  }
                  badge={allMediaCounts[tab]}
                  onPress={() => setActiveTab(tab)}
                />
              ))}
            </View>

            {/* Select All button */}
            <Pressable
              onPress={handleSelectAll}
              className={`h-10 w-10 items-center justify-center rounded-xl border ${allSelected
                  ? "border-pink-500/40 bg-pink-500/10"
                  : "border-black/5 bg-zinc-200/50 dark:border-white/5 dark:bg-white/5"
                }`}
            >
              <FontAwesome6
                name={allSelected ? "check-double" : "check-square"}
                size={14}
                color={allSelected ? "#ec4899" : "#71717a"}
              />
            </Pressable>

            {/* Filter button */}
            <Pressable
              onPress={() => setFilterOpen(true)}
              className={`h-10 w-10 items-center justify-center rounded-xl border ${filterMode !== "all"
                  ? "border-pink-500/40 bg-pink-500/10"
                  : "border-black/5 bg-zinc-200/50 dark:border-white/5 dark:bg-white/5"
                }`}
            >
              <FontAwesome6
                name="filter"
                size={14}
                color={filterMode !== "all" ? "#ec4899" : "#71717a"}
              />
            </Pressable>
          </View>
        </View>

        {/* Filter dropdown modal */}
        <Modal
          visible={filterOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterOpen(false)}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setFilterOpen(false)}>
            <View
              className="absolute right-6 w-44 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
              style={{ top: 220 }}
            >
              {(
                [
                  { key: "all", label: "All", icon: "border-all" },
                  { key: "sent", label: "Sent", icon: "paper-plane" },
                  { key: "received", label: "Received", icon: "inbox" },
                ] as { key: "all" | "sent" | "received"; label: string; icon: string }[]
              ).map(({ key, label, icon }) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    setFilterMode(key);
                    setFilterOpen(false);
                  }}
                  className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
                >
                  <FontAwesome6
                    name={icon}
                    size={13}
                    color={filterMode === key ? "#ec4899" : "#71717a"}
                  />
                  <Text
                    className={`flex-1 text-sm font-semibold ${filterMode === key
                        ? "text-pink-500"
                        : "text-zinc-800 dark:text-zinc-200"
                      }`}
                  >
                    {label}
                  </Text>
                  {filterMode === key && (
                    <FontAwesome6 name="check" size={11} color="#ec4899" />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </View>
    ),
    [
      activeTab,
      allMediaCounts,
      filterMode,
      filterOpen,
      isScraping,
      linkCount,
      mediaCount,
      pauseSync,
      reelCount,
      router,
      syncSingleThread,
      profileImageUrl,
      thread,
      threadUsername,
      threadId,
      totalItemsScanned,
      allSelected,
      handleSelectAll,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: Media }) => (
      <MediaGridItem
        item={item}
        isSelected={selectedIds.has(item.itemId)}
        isSelectMode={isSelectMode}
        profileImageUrl={profileImageUrl}
        onOpen={handleOpenItem}
        onToggleSelection={toggleSelection}
        onLongPress={handleLongPress}
      />
    ),
    [
      handleLongPress,
      handleOpenItem,
      isSelectMode,
      profileImageUrl,
      selectedIds,
      toggleSelection,
    ],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <FlashList
        data={displayedMedia}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        numColumns={COLUMN_COUNT}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        extraData={selectedIds}
      />

      {/* Floating multi-select action bar */}
      {isSelectMode && selectedIds.size > 0 && (
        <View className="absolute right-6 bottom-8 left-6 shadow-2xl">
          <Button variant="gradient" onPress={handleUnsend}>
            <FontAwesome6 name="trash-can" size={16} color="white" />
            <Text className="ml-2 font-black text-white uppercase">
              Unsend {selectedIds.size} {selectedIds.size === 1 ? "Item" : "Items"}
            </Text>
          </Button>
        </View>
      )}

      {/* Unsend progress modal */}
      <UnsendProgressModal
        isVisible={unsendModalVisible}
        onDismiss={() => setUnsendModalVisible(false)}
        onComplete={handleUnsendComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
});
