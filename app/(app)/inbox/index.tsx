import { ScrapePromptDialog } from "@/components/features/inbox/scrape-prompt-dialog";
import { ThreadTile } from "@/components/features/inbox/thread-tile";
import { Input } from "@/components/ui/input";
import { useLogout } from "@/hooks/auth/use-logout";
import { useSync } from "@/hooks/sync/use-sync";
import { database } from "@/model";
import InboxModel from "@/model/inbox";
import SyncState from "@/model/sync-state";
import { FontAwesome6 } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

// ─── Static constants ─────────────────────────────────────────────────────────

const STATS_LABELS = ["SCANNED", "MEDIA", "REELS", "LINKS"] as const;
const SKELETON_KEYS = [1, 2, 3, 4, 5, 6] as const;
const LIST_CONTENT_STYLE = { paddingHorizontal: 14, paddingBottom: 40 } as const;
const EMPTY_QUERY = Q.where("thread_id", Q.notEq(""));

const keyExtractor = (item: InboxModel) => item.threadId;

// ─── Stable class strings ─────────────────────────────────────────────────────


// ─── Sub-components ───────────────────────────────────────────────────────────

const ItemSeparator = memo(function ItemSeparator() {
  return <View className="h-1.5" />;
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Inbox() {
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<InboxModel[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncedThreadIds, setSyncedThreadIds] = useState<Set<string>>(new Set());

  const {
    isSyncing,
    isPaused,
    progressStatus,
    currentSyncingThreadId,
    totalItemsScanned,
    mediaCount,
    reelCount,
    linkCount,
    syncInbox,
    syncThreadItems,
    pauseSync,
    syncSingleThread,
  } = useSync(
    useShallow((s) => ({
      isSyncing: s.isSyncing,
      isPaused: s.isPaused,
      progressStatus: s.progressStatus,
      currentSyncingThreadId: s.currentSyncingThreadId,
      totalItemsScanned: s.totalItemsScanned,
      mediaCount: s.mediaCount,
      reelCount: s.reelCount,
      linkCount: s.linkCount,
      syncInbox: s.syncInbox,
      syncThreadItems: s.syncThreadItems,
      pauseSync: s.pauseSync,
      syncSingleThread: s.syncSingleThread,
    })),
  );

  const handleLogout = useLogout();
  const prevSyncingRef = useRef(false);

  useEffect(() => {
    const query =
      search.length > 1
        ? database.get<InboxModel>("inbox").query(Q.where("username", Q.like(`%${search}%`)))
        : database.get<InboxModel>("inbox").query(EMPTY_QUERY);

    const subscription = query.observe().subscribe((data) => {
      setChats(data);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [search]);

  useEffect(() => {
    const subscription = database
      .get<SyncState>("sync_state")
      .query(Q.where("target_id", Q.like("thread_%")))
      .observe()
      .subscribe((data) => {
        setSyncedThreadIds((prev) => {
          const next = new Set(data.map((d) => d.targetId.replace("thread_", "")));
          if (prev.size === next.size) {
            let same = true;
            for (const id of next) {
              if (!prev.has(id)) {
                same = false;
                break;
              }
            }
            if (same) return prev;
          }
          return next;
        });
      });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing && progressStatus === "Inbox sync complete") {
      setShowPrompt(true);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing, progressStatus]);

  const sortedChats = useMemo(() => {
    const sorted = [...chats];
    sorted.sort((a, b) => {
      if (a.threadId === currentSyncingThreadId) return -1;
      if (b.threadId === currentSyncingThreadId) return 1;
      const aSynced = syncedThreadIds.has(a.threadId);
      const bSynced = syncedThreadIds.has(b.threadId);
      if (aSynced && !bSynced) return -1;
      if (!aSynced && bSynced) return 1;
      return 0;
    });
    return sorted;
  }, [chats, currentSyncingThreadId, syncedThreadIds]);

  const statValues = useMemo(
    () => [totalItemsScanned, mediaCount, reelCount, linkCount],
    [totalItemsScanned, mediaCount, reelCount, linkCount],
  );

  const showBanner = useMemo(
    () => isSyncing || progressStatus !== "Idle",
    [isSyncing, progressStatus],
  );

  const openThread = useCallback((id: string) => {
    router.push({ pathname: "/inbox/[threadId]", params: { threadId: id } });
  }, []);

  const handleConfirmScrape = useCallback(
    (selectedIds: string[]) => {
      setShowPrompt(false);
      if (selectedIds.length > 0) syncThreadItems(selectedIds);
    },
    [syncThreadItems],
  );

  const handleSync = useCallback(() => {
    if (isSyncing) pauseSync();
    else syncInbox();
    setDropdownOpen(false);
  }, [isSyncing, pauseSync, syncInbox]);

  const handleSyncIconPress = useCallback(() => {
    if (isSyncing) pauseSync();
    else syncInbox();
  }, [isSyncing, pauseSync, syncInbox]);

  const handleDropdownToggle = useCallback(() => setDropdownOpen((v) => !v), []);
  const handleDropdownClose = useCallback(() => setDropdownOpen(false), []);

  const handleShowPrompt = useCallback(() => {
    setDropdownOpen(false);
    setShowPrompt(true);
  }, []);

  const handleClosePrompt = useCallback(() => setShowPrompt(false), []);

  const handleLogoutPress = useCallback(async () => {
    setDropdownOpen(false);
    await handleLogout();
  }, [handleLogout]);

  const renderItem = useCallback(
    ({ item, extraData: syncThreadId }: { item: InboxModel; extraData?: string | null }) => (
      <ThreadTileWrapper
        item={item}
        currentSyncingThreadId={syncThreadId ?? null}
        openThread={openThread}
        pauseSync={pauseSync}
        syncSingleThread={syncSingleThread}
      />
    ),
    [openThread, pauseSync, syncSingleThread],
  );

  const syncIconName = isSyncing || isPaused ? "rotate" : "play";
  const syncIconColor = isSyncing ? "#ec4899" : "#71717a";
  const syncAnimClass = isSyncing && !isPaused ? "animate-spin" : "";

  return (
    <View className="flex-1 bg-background dark:bg-dark-background">
      <View className="z-50 px-5 pt-10 pb-4">
        <View className="z-50 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="mr-3 text-3xl font-bold text-foreground dark:text-dark-foreground">Thread Vault</Text>
            <Pressable onPress={handleSyncIconPress} className="w-8 aspect-square items-center justify-center rounded-full bg-muted dark:bg-dark-muted">
              <FontAwesome6
                name={syncIconName}
                size={14}
                color={syncIconColor}
                className={syncAnimClass}
              />
            </Pressable>
          </View>

          <View className="relative z-50">
            <Pressable onPress={handleDropdownToggle} className="w-10 aspect-square items-center justify-center rounded-full bg-muted dark:bg-dark-muted">
              <FontAwesome6 name="user" size={16} color="#71717a" />
            </Pressable>

            {dropdownOpen && (
              <Modal visible transparent animationType="none" onRequestClose={handleDropdownClose}>
                <Pressable className="flex-1" onPress={handleDropdownClose}>
                  <View className="absolute top-24 right-5 z-[100] w-48 rounded-xl border border-border bg-card p-2 shadow-xl dark:border-dark-border dark:bg-dark-card">
                    <Pressable onPress={handleSync} className="flex-row items-center rounded-lg p-3 active:bg-muted/50 dark:active:bg-dark-muted/50">
                      <FontAwesome6 name={isSyncing ? "pause" : "play"} size={14} color="#71717a" />
                      <Text className="ml-3 font-medium text-foreground dark:text-dark-foreground">
                        {isSyncing ? "Pause Sync" : "Start Inbox Sync"}
                      </Text>
                    </Pressable>

                    <Pressable onPress={handleShowPrompt} className="flex-row items-center rounded-lg p-3 active:bg-muted/50 dark:active:bg-dark-muted/50">
                      <FontAwesome6 name="list-check" size={14} color="#71717a" />
                      <Text className="ml-3 font-medium text-foreground dark:text-dark-foreground">Select Threads</Text>
                    </Pressable>

                    <View className="my-1 h-px bg-border dark:bg-dark-border" />

                    <Pressable onPress={handleLogoutPress} className="flex-row items-center rounded-lg p-3 active:bg-red-50 dark:active:bg-red-900/20">
                      <FontAwesome6 name="arrow-right-from-bracket" size={14} color="#ef4444" />
                      <Text className="ml-3 font-medium text-red-500">Logout</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
            )}
          </View>
        </View>

        {showBanner && (
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold text-muted-foreground dark:text-dark-muted-foreground">{progressStatus}</Text>
            {totalItemsScanned > 0 && (
              <View className="flex-row items-center gap-3">
                {STATS_LABELS.map((label, i) => (
                  <Text key={label} className="text-[10px] font-bold tracking-wider text-muted-foreground dark:text-dark-muted-foreground">
                    {label}: {statValues[i]}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        <Input
          placeholder="Search thread"
          value={search}
          onChangeText={setSearch}
          icon={<FontAwesome6 name="magnifying-glass" size={16} color="#71717a" />}
        />
      </View>

      <View className="flex-1">
        {isLoading || (sortedChats.length === 0 && isSyncing) ? (
          <View className="px-3 pt-2">
            {SKELETON_KEYS.map((i) => (
              <View key={i} className="mb-1 flex-row items-center justify-between rounded-xl bg-muted/50 px-2 py-3 opacity-60 dark:bg-dark-muted/50">
                <View className="flex-1 flex-row items-center">
                  <View className="h-12 w-12 animate-pulse rounded-full bg-muted dark:bg-dark-muted" />
                  <View className="ml-3 flex-1 gap-2">
                    <View className="h-4 w-32 animate-pulse rounded-md bg-muted dark:bg-dark-muted" />
                    <View className="h-3 w-20 animate-pulse rounded-md bg-muted dark:bg-dark-muted" />
                  </View>
                </View>
                <View className="h-8 w-8 animate-pulse rounded-full bg-muted dark:bg-dark-muted" />
              </View>
            ))}
          </View>
        ) : sortedChats.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6 opacity-50">
            <FontAwesome6 name="inbox" size={48} color="#71717a" />
            <Text className="mt-4 text-center font-medium text-muted-foreground dark:text-dark-muted-foreground">
              No threads found. Start an inbox sync to fetch your latest conversations.
            </Text>
          </View>
        ) : (
          <FlashList
            data={sortedChats}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={ItemSeparator}
            contentContainerStyle={LIST_CONTENT_STYLE}
            estimatedItemSize={72}
            extraData={currentSyncingThreadId}
            removeClippedSubviews
            windowSize={5}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
          />
        )}
      </View>

      <ScrapePromptDialog
        isOpen={showPrompt}
        onClose={handleClosePrompt}
        chats={chats}
        onConfirm={handleConfirmScrape}
      />
    </View>
  );
}

// ─── ThreadTileWrapper ────────────────────────────────────────────────────────

interface ThreadTileWrapperProps {
  item: InboxModel;
  currentSyncingThreadId: string | null;
  openThread: (id: string) => void;
  pauseSync: () => void;
  syncSingleThread: (threadId: string, username: string) => Promise<void>;
}

const ThreadTileWrapper = memo(function ThreadTileWrapper({
  item,
  currentSyncingThreadId,
  openThread,
  pauseSync,
  syncSingleThread,
}: ThreadTileWrapperProps) {
  const isSyncing = item.threadId === currentSyncingThreadId;

  const handlePress = useCallback(() => openThread(item.threadId), [openThread, item.threadId]);
  const handleSyncPress = useCallback(() => {
    if (isSyncing) pauseSync();
    else syncSingleThread(item.threadId, item.username);
  }, [isSyncing, pauseSync, syncSingleThread, item.threadId, item.username]);

  return (
    <ThreadTile
      item={item}
      onPress={handlePress}
      isSyncing={isSyncing}
      onSyncPress={handleSyncPress}
    />
  );
});
