import { Input } from "@/components/ui/input";
import { ThreadTile } from "@/components/features/inbox/thread-tile";
import { ScrapePromptDialog } from "@/components/features/inbox/scrape-prompt-dialog";
import { useLogout } from "@/hooks/auth/use-logout";
import { useSync } from "@/hooks/sync/use-sync";
import { database } from "@/model";
import InboxModel from "@/model/inbox";
import SyncState from "@/model/sync-state";
import { FontAwesome6 } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import { Pressable, Text, View, Modal } from "react-native";

export default function Inbox() {
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<InboxModel[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prevSyncing, setPrevSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncedThreadIds, setSyncedThreadIds] = useState<Set<string>>(new Set());

  const {
    isSyncing,
    isPaused,
    progressStatus,
    syncInbox,
    syncThreadItems,
    pauseSync,
    currentSyncingThreadId,
    syncSingleThread,
    totalItemsScanned,
    mediaCount,
    reelCount,
    linkCount,
  } = useSync();
  const handleLogout = useLogout();

  // Default subscription: load all threads when there is no active search
  useEffect(() => {
    if (search.length > 1) return;
    const subscription = database
      .get<InboxModel>("inbox")
      .query(Q.where("thread_id", Q.notEq("")))
      .observe()
      .subscribe((data) => {
        setChats(data);
        setIsLoading(false);
      });
    return () => subscription.unsubscribe();
  }, [search]);

  // Search subscription: filter threads by username when a real query is typed
  useEffect(() => {
    if (search.length <= 1) return;
    const subscription = database
      .get<InboxModel>("inbox")
      .query(Q.where("username", Q.like(`%${search}%`)))
      .observe()
      .subscribe((data) => {
        setChats(data);
        setIsLoading(false);
      });
    return () => subscription.unsubscribe();
  }, [search]);

  // Track which threads have been synced (have a cursor stored)
  useEffect(() => {
    const subscription = database
      .get<SyncState>("sync_state")
      .query(Q.where("target_id", Q.like("thread_%")))
      .observe()
      .subscribe((data) => {
        const ids = new Set(data.map((d) => d.targetId.replace("thread_", "")));
        setSyncedThreadIds(ids);
      });
    return () => subscription.unsubscribe();
  }, []);

  // Sort: currently syncing first, then synced, then unsynced
  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      if (a.threadId === currentSyncingThreadId) return -1;
      if (b.threadId === currentSyncingThreadId) return 1;

      const aSynced = syncedThreadIds.has(a.threadId);
      const bSynced = syncedThreadIds.has(b.threadId);

      if (aSynced && !bSynced) return -1;
      if (!aSynced && bSynced) return 1;

      return 0;
    });
  }, [chats, currentSyncingThreadId, syncedThreadIds]);

  // Show scrape prompt when inbox sync finishes
  useEffect(() => {
    if (prevSyncing && !isSyncing && progressStatus === "Inbox sync complete") {
      setShowPrompt(true);
    }
    setPrevSyncing(isSyncing);
  }, [isSyncing, prevSyncing, progressStatus]);

  const openThread = (id: string) => {
    router.push({ pathname: "/inbox/[threadId]", params: { threadId: id } });
  };

  const handleConfirmScrape = (selectedIds: string[]) => {
    setShowPrompt(false);
    if (selectedIds.length > 0) {
      syncThreadItems(selectedIds);
    }
  };

  const handleSync = () => {
    if (isSyncing) pauseSync();
    else syncInbox();
    setDropdownOpen(false);
  };

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Header Area */}
      <View className="z-50 px-5 pt-10 pb-4">
        <View className="z-50 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="mr-3 text-3xl font-bold text-zinc-900 dark:text-white">
              Thread Vault
            </Text>
            <Pressable
              onPress={isSyncing ? pauseSync : syncInbox}
              className="rounded-full bg-zinc-200 p-2 dark:bg-zinc-800"
            >
              <FontAwesome6
                name={isSyncing ? "rotate" : isPaused ? "rotate" : "play"}
                size={14}
                color={isSyncing ? "#ec4899" : "#71717a"}
                className={isSyncing && !isPaused ? "animate-spin" : ""}
              />
            </Pressable>
          </View>

          <View className="relative z-50" style={{ zIndex: 50 }}>
            <Pressable
              onPress={() => setDropdownOpen(!dropdownOpen)}
              className="rounded-full bg-zinc-200 p-2 dark:bg-zinc-800"
            >
              <FontAwesome6 name="user" size={16} color="#71717a" />
            </Pressable>

            {dropdownOpen && (
              <Modal
                visible={true}
                transparent={true}
                animationType="none"
                onRequestClose={() => setDropdownOpen(false)}
              >
                <Pressable style={{ flex: 1 }} onPress={() => setDropdownOpen(false)}>
                  <View
                    className="absolute top-24 right-5 w-48 rounded-xl border border-black/5 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900"
                    style={{ zIndex: 100 }}
                  >
                    <Pressable
                      onPress={handleSync}
                      className="flex-row items-center rounded-lg p-3 active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                      <FontAwesome6 name={isSyncing ? "pause" : "play"} size={14} color="#71717a" />
                      <Text className="ml-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {isSyncing ? "Pause Sync" : "Start Inbox Sync"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setDropdownOpen(false);
                        setShowPrompt(true);
                      }}
                      className="flex-row items-center rounded-lg p-3 active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                      <FontAwesome6 name="list-check" size={14} color="#71717a" />
                      <Text className="ml-3 font-medium text-zinc-900 dark:text-zinc-100">
                        Select Threads
                      </Text>
                    </Pressable>

                    <View className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

                    <Pressable
                      onPress={async () => {
                        setDropdownOpen(false);
                        await handleLogout();
                      }}
                      className="flex-row items-center rounded-lg p-3 active:bg-red-50 dark:active:bg-red-900/20"
                    >
                      <FontAwesome6 name="arrow-right-from-bracket" size={14} color="#ef4444" />
                      <Text className="ml-3 font-medium text-red-500">Logout</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
            )}
          </View>
        </View>

        {/* Sync progress banner */}
        {(isSyncing || progressStatus !== "Idle") && (
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {progressStatus}
            </Text>
            {totalItemsScanned > 0 && (
              <View className="flex-row items-center gap-3">
                {[
                  ["SCANNED", totalItemsScanned],
                  ["MEDIA", mediaCount],
                  ["REELS", reelCount],
                  ["LINKS", linkCount],
                ].map(([label, value]) => (
                  <Text
                    key={label as string}
                    className="text-[10px] font-bold tracking-wider text-zinc-400"
                  >
                    {label}: {value}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Search Bar */}
        <Input
          placeholder="Search thread"
          value={search}
          onChangeText={setSearch}
          icon={<FontAwesome6 name="magnifying-glass" size={16} color="#71717a" />}
        />
      </View>

      {/* Chat List */}
      <View className="flex-1">
        {isLoading || (sortedChats.length === 0 && isSyncing) ? (
          <View className="px-3 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View
                key={i}
                className="mb-1 flex-row items-center justify-between rounded-xl bg-zinc-200/50 px-2 py-3 opacity-60 dark:bg-zinc-800/50"
              >
                <View className="flex-1 flex-row items-center">
                  <View className="h-12 w-12 animate-pulse rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <View className="ml-3 flex-1 gap-2">
                    <View className="h-4 w-32 animate-pulse rounded-md bg-zinc-300 dark:bg-zinc-700" />
                    <View className="h-3 w-20 animate-pulse rounded-md bg-zinc-300 dark:bg-zinc-700" />
                  </View>
                </View>
                <View className="h-8 w-8 animate-pulse rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </View>
            ))}
          </View>
        ) : sortedChats.length === 0 && !isSyncing ? (
          <View className="flex-1 items-center justify-center p-6 opacity-50">
            <FontAwesome6 name="inbox" size={48} color="#71717a" />
            <Text className="mt-4 text-center font-medium text-zinc-500 dark:text-zinc-400">
              No threads found. Start an inbox sync to fetch your latest conversations.
            </Text>
          </View>
        ) : (
          <FlashList
            data={sortedChats}
            keyExtractor={(item) => item.threadId}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <ThreadTile
                item={item}
                onPress={() => openThread(item.threadId)}
                isSyncing={item.threadId === currentSyncingThreadId}
                onSyncPress={() => {
                  if (item.threadId === currentSyncingThreadId) pauseSync();
                  else syncSingleThread(item.threadId, item.username);
                }}
              />
            )}
            ItemSeparatorComponent={() => <View className="h-1.5" />}
          />
        )}
      </View>

      <ScrapePromptDialog
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        chats={chats}
        onConfirm={handleConfirmScrape}
      />
    </View>
  );
}
