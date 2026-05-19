import { MediaGridItem } from "@/components/features/inbox/media-grid-item";
import { UnsendProgressModal } from "@/components/modals/unsend-progress-modal";
import { Button, TabButton } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { COLUMN_COUNT } from "@/constants";
import { useSync } from "@/hooks/sync/use-sync";
import { useUnsendQueue } from "@/hooks/unsend/use-unsend-queue";
import { database } from "@/model";
import Inbox from "@/model/inbox";
import Media from "@/model/media";
import { FontAwesome6 } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Image, Pressable, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

// ─── Static constants ─────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: FilterMode; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "border-all" },
  { key: "sent", label: "Sent", icon: "paper-plane" },
  { key: "received", label: "Received", icon: "inbox" },
];

const TABS: TabType[] = ["media", "reel", "link"];
const TAB_ICONS: Record<TabType, string> = { media: "image", reel: "clapperboard", link: "link" };
const TAB_LABEL_MAP: Record<TabType, string> = { media: "Media", reel: "Reels", link: "Links" };
const STATS_LABELS = ["SCANNED", "MEDIA", "REELS", "LINKS"] as const;
const EMPTY_COUNTS = { media: 0, reel: 0, link: 0, interactions: 0 } as const;
const LIST_CONTENT_STYLE = { paddingHorizontal: 8, paddingBottom: 100 } as const;

function getItemType(item: Media): string {
  if (item.type === "link") return "link";
  if (
    item.itemType === "voice_media" ||
    item.url?.includes(".m4a") ||
    item.url?.includes("audio")
  ) {
    return "audio";
  }
  return item.type;
}

const mediaKeyExtractor = (item: Media) => item.itemId;

// ─── TabButtonItem ─────────────────────────────────────────────────────────────

interface TabButtonItemProps {
  tab: TabType;
  activeTab: TabType;
  badge: number;
  setActiveTab: (tab: TabType) => void;
}

const TabButtonItem = memo(function TabButtonItem({
  tab,
  activeTab,
  badge,
  setActiveTab,
}: TabButtonItemProps) {
  const handlePress = useCallback(() => setActiveTab(tab), [setActiveTab, tab]);
  return (
    <TabButton
      active={activeTab === tab}
      label={activeTab === tab ? TAB_LABEL_MAP[tab] : ""}
      icon={TAB_ICONS[tab]}
      badge={badge}
      onPress={handlePress}
    />
  );
});

// ─── FilterOption ─────────────────────────────────────────────────────────────

interface FilterOptionProps {
  optionKey: FilterMode;
  label: string;
  icon: string;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  setFilterOpen: (open: boolean) => void;
}

const FilterOption = memo(function FilterOption({
  optionKey,
  label,
  icon,
  filterMode,
  setFilterMode,
  setFilterOpen,
}: FilterOptionProps) {
  const isActive = filterMode === optionKey;
  const labelClass = isActive
    ? "flex-1 text-sm font-semibold text-primary"
    : "flex-1 text-sm font-semibold text-foreground dark:text-dark-foreground";

  const handlePress = useCallback(() => {
    setFilterMode(optionKey);
    setFilterOpen(false);
  }, [optionKey, setFilterMode, setFilterOpen]);

  return (
    <Pressable
      onPress={handlePress}
      className="active:bg-muted/50 dark:active:bg-dark-muted/50 flex-row items-center gap-3 px-4 py-3"
    >
      <FontAwesome6 name={icon} size={13} color={isActive ? "#ec4899" : "#71717a"} />
      <Text className={labelClass}>{label}</Text>
      {isActive && <FontAwesome6 name="check" size={11} color="#ec4899" />}
    </Pressable>
  );
});

// ─── ListHeader ───────────────────────────────────────────────────────────────

interface ListHeaderProps {
  profileImageUrl: string | null;
  threadUsername: string | null;
  isScraping: boolean;
  totalItemsScanned: number;
  statsValues: readonly [number, number, number, number];
  activeTab: TabType;
  allMediaCounts: MediaStatsCounts;
  allSelected: boolean;
  filterMode: FilterMode;
  filterOpen: boolean;
  handleBack: () => void;
  handleSyncPress: () => void;
  handleSelectAll: () => void;
  handleOpenFilter: () => void;
  handleCloseFilter: () => void;
  setActiveTab: (tab: TabType) => void;
  setFilterMode: (mode: FilterMode) => void;
  setFilterOpen: (open: boolean) => void;
}

const ListHeader = memo(function ListHeader({
  profileImageUrl,
  threadUsername,
  isScraping,
  totalItemsScanned,
  statsValues,
  activeTab,
  allMediaCounts,
  allSelected,
  filterMode,
  filterOpen,
  handleBack,
  handleSyncPress,
  handleSelectAll,
  handleOpenFilter,
  handleCloseFilter,
  setActiveTab,
  setFilterMode,
  setFilterOpen,
}: ListHeaderProps) {
  const selAllClass = allSelected
    ? "h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10"
    : "h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/50 dark:border-dark-border dark:bg-dark-muted/50";
  const filterBtnClass =
    filterMode !== "all"
      ? "h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10"
      : "h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/50 dark:border-dark-border dark:bg-dark-muted/50";
  const syncBtnColor = isScraping ? "#ec4899" : "#71717a";
  const syncAnimClass = isScraping ? "animate-spin" : "";

  return (
    <View className="bg-background dark:bg-dark-background">
      <View className="relative items-center py-16">
        <Pressable
          onPress={handleBack}
          className="bg-card/80 dark:bg-dark-card/80 absolute top-12 left-6 z-50 size-10 items-center justify-center rounded-full shadow-xl backdrop-blur-md"
        >
          <FontAwesome6 name="chevron-left" size={18} color="#71717a" />
        </Pressable>

        <View className="relative">
          <View className="border-background bg-muted dark:border-dark-background dark:bg-dark-muted h-32 w-32 items-center justify-center overflow-hidden rounded-[40px] border-4 shadow-2xl">
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
            onPress={handleSyncPress}
            className="bg-foreground dark:bg-dark-foreground absolute -right-1 -bottom-1 size-8 items-center justify-center rounded-full"
          >
            <FontAwesome6 name="rotate" size={14} color={syncBtnColor} className={syncAnimClass} />
          </Pressable>
        </View>

        <Text className="text-foreground dark:text-dark-foreground mt-5 text-2xl font-black tracking-tight">
          {threadUsername ?? "Loading..."}
        </Text>
        <Text className="text-muted-foreground dark:text-dark-muted-foreground mt-1 text-sm font-semibold">
          Interactions: {allMediaCounts.interactions}
        </Text>

        {isScraping && totalItemsScanned > 0 && (
          <View className="bg-muted/50 dark:bg-dark-muted/50 mt-3 flex-row items-center gap-3 rounded-full px-3 py-1.5">
            {STATS_LABELS.map((label, i) => (
              <Text
                key={label}
                className="text-muted-foreground dark:text-dark-muted-foreground text-[10px] font-bold tracking-wider"
              >
                {label}: {statsValues[i]}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View className="bg-background/95 dark:bg-dark-background/95 px-6 py-4 backdrop-blur-sm">
        <View className="flex-row items-center gap-2">
          <View className="border-border bg-muted/50 dark:border-dark-border dark:bg-dark-muted/50 flex-1 flex-row rounded-2xl border p-1.5">
            {TABS.map((tab) => (
              <TabButtonItem
                key={tab}
                tab={tab}
                activeTab={activeTab}
                badge={allMediaCounts[tab]}
                setActiveTab={setActiveTab}
              />
            ))}
          </View>

          <Pressable onPress={handleSelectAll} className={selAllClass}>
            <FontAwesome6
              name={allSelected ? "check-double" : "check-square"}
              size={14}
              color={allSelected ? "#ec4899" : "#71717a"}
            />
          </Pressable>

          <Pressable onPress={handleOpenFilter} className={filterBtnClass}>
            <FontAwesome6
              name="filter"
              size={14}
              color={filterMode !== "all" ? "#ec4899" : "#71717a"}
            />
          </Pressable>
        </View>
      </View>

      {filterOpen && (
        <View
          className="border-border bg-card dark:border-dark-border dark:bg-dark-card absolute top-55 right-6 w-44 overflow-hidden rounded-2xl border shadow-xl"
          style={{ zIndex: 50, elevation: 50 }}
        >
          {FILTER_OPTIONS.map(({ key, label, icon }) => (
            <FilterOption
              key={key}
              optionKey={key}
              label={label}
              icon={icon}
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              setFilterOpen={setFilterOpen}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ThreadDetail() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();

  useKeepAwake();

  const [activeTab, setActiveTabRaw] = useState<TabType>("media");
  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabRaw(tab);
    setFilterOpen(false);
  }, []);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unsendModalVisible, setUnsendModalVisible] = useState(false);
  const [thread, setThread] = useState<Inbox | null>(null);
  const [displayedMedia, setDisplayedMedia] = useState<Media[]>([]);
  const [allMediaCounts, setAllMediaCounts] = useState<MediaStatsCounts>(EMPTY_COUNTS);

  const {
    currentSyncingThreadId,
    syncSingleThread,
    pauseSync,
    totalItemsScanned,
    mediaCount,
    reelCount,
    linkCount,
  } = useSync(
    useShallow((s) => ({
      currentSyncingThreadId: s.currentSyncingThreadId,
      syncSingleThread: s.syncSingleThread,
      pauseSync: s.pauseSync,
      totalItemsScanned: s.totalItemsScanned,
      mediaCount: s.mediaCount,
      reelCount: s.reelCount,
      linkCount: s.linkCount,
    })),
  );

  const { startUnsend } = useUnsendQueue();
  const { showToast } = useToast();

  const isScraping = currentSyncingThreadId === threadId;
  const isSelectMode = selectedIds.size > 0;

  // ─── DB subscriptions ───────────────────────────────────────────────────────

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
    if (!threadId) return;
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
        let media = 0,
          reel = 0,
          link = 0;
        for (const d of data) {
          if (d.type === "media") media++;
          else if (d.type === "reel") reel++;
          else if (d.type === "link") link++;
        }
        setAllMediaCounts({ media, reel, link, interactions: data.length });
      });
    return () => sub.unsubscribe();
  }, [threadId]);

  // ─── Back handler ──────────────────────────────────────────────────────────

  const isSelectModeRef = useRef(isSelectMode);
  isSelectModeRef.current = isSelectMode;

  useEffect(() => {
    const backAction = () => {
      if (isSelectModeRef.current) {
        setSelectedIds(new Set());
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const selectableDisplayedMedia = useMemo(
    () => displayedMedia.filter((m) => m.isSent),
    [displayedMedia],
  );
  const allSelected =
    selectableDisplayedMedia.length > 0 &&
    selectedIds.size === selectableDisplayedMedia.length &&
    selectableDisplayedMedia.every((m) => selectedIds.has(m.itemId));
  const profileImageUrl = thread?.pfpUrl ?? null;
  const threadUsername = thread?.username ?? null;

  const statsValues = useMemo(
    () => [totalItemsScanned, mediaCount, reelCount, linkCount] as const,
    [totalItemsScanned, mediaCount, reelCount, linkCount],
  );

  // ─── Stable callbacks ──────────────────────────────────────────────────────

  const handleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableDisplayedMedia.map((m) => m.itemId)));
    }
    setFilterOpen(false);
  }, [allSelected, selectableDisplayedMedia]);

  const toggleSelection = useCallback(
    (id: string) => {
      if (!displayedMedia.some((m) => m.itemId === id && m.isSent)) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [displayedMedia],
  );

  const handleLongPress = useCallback(
    (id: string) => {
      if (!displayedMedia.some((m) => m.itemId === id && m.isSent)) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [displayedMedia],
  );

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
    setSelectedIds(new Set());
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

  const handleDismissUnsendModal = useCallback(() => setUnsendModalVisible(false), []);
  const handleCloseFilter = useCallback(() => setFilterOpen(false), []);
  const handleOpenFilter = useCallback(() => setFilterOpen(true), []);

  const handleSyncPress = useCallback(() => {
    if (isScraping) pauseSync();
    else if (thread) syncSingleThread(threadId, thread.username);
  }, [isScraping, pauseSync, syncSingleThread, thread, threadId]);

  const handleBack = useCallback(() => router.replace("/inbox"), [router]);

  const renderItem = useCallback(
    ({ item, extraData }: { item: Media; extraData?: Set<string> }) => {
      const selected = item.isSent && !!extraData?.has(item.itemId);
      const isSelecting = item.isSent && !!extraData && extraData.size > 0;
      return (
        <MediaGridItem
          item={item}
          isSelected={selected}
          isSelectMode={isSelecting}
          profileImageUrl={profileImageUrl}
          onOpen={handleOpenItem}
          onToggleSelection={toggleSelection}
          onLongPress={handleLongPress}
        />
      );
    },
    [handleLongPress, handleOpenItem, profileImageUrl, toggleSelection],
  );

  // ─── Stable ListHeaderComponent ────────────────────────────────────────────

  const listHeaderProps: ListHeaderProps = useMemo(
    () => ({
      profileImageUrl,
      threadUsername,
      isScraping,
      totalItemsScanned,
      statsValues,
      activeTab,
      allMediaCounts,
      allSelected,
      filterMode,
      filterOpen,
      handleBack,
      handleSyncPress,
      handleSelectAll,
      handleOpenFilter,
      handleCloseFilter,
      setActiveTab,
      setFilterMode,
      setFilterOpen,
    }),
    [
      profileImageUrl,
      threadUsername,
      isScraping,
      totalItemsScanned,
      statsValues,
      activeTab,
      allMediaCounts,
      allSelected,
      filterMode,
      filterOpen,
      handleBack,
      handleSyncPress,
      handleSelectAll,
      handleOpenFilter,
      handleCloseFilter,
    ],
  );

  const ListHeaderComponent = useCallback(
    () => <ListHeader {...listHeaderProps} />,
    [listHeaderProps],
  );

  const handleScroll = useCallback(() => {
    if (filterOpen) setFilterOpen(false);
  }, [filterOpen]);

  return (
    <View className="bg-background dark:bg-dark-background flex-1">
      <FlashList
        data={displayedMedia}
        renderItem={renderItem}
        keyExtractor={mediaKeyExtractor}
        getItemType={getItemType}
        numColumns={COLUMN_COUNT}
        ListHeaderComponent={ListHeaderComponent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={LIST_CONTENT_STYLE}
        extraData={selectedIds}
        estimatedItemSize={130}
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
      />

      {isSelectMode && (
        <View className="absolute right-6 bottom-8 left-6 shadow-2xl">
          <Button variant="gradient" onPress={handleUnsend}>
            <FontAwesome6 name="trash-can" size={16} color="white" />
            <Text className="ml-2 font-black text-white uppercase">
              Unsend {selectedIds.size} {selectedIds.size === 1 ? "Item" : "Items"}
            </Text>
          </Button>
        </View>
      )}

      <UnsendProgressModal
        isVisible={unsendModalVisible}
        onDismiss={handleDismissUnsendModal}
        onComplete={handleUnsendComplete}
      />
    </View>
  );
}
