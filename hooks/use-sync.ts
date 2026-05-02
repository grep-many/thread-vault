import { IGInbox } from "@/lib/ig-inbox";
import { IGThread } from "@/lib/ig-thread";
import { database } from "@/model";
import Inbox from "@/model/inbox";
import SyncState from "@/model/sync-state";
import { Q } from "@nozbe/watermelondb";
import { create } from "zustand";
import { useSession } from "./use-session";

interface SyncEngineState {
  isSyncing: boolean;
  isPaused: boolean;
  progressStatus: string;
  currentSyncingThreadId: string | null;
  syncInbox: () => Promise<void>;
  syncThreadItems: (threadIds: string[]) => Promise<void>;
  pauseSync: () => void;
  syncSingleThread: (threadId: string, username: string) => Promise<void>;
  totalItemsScanned: number;
  mediaCount: number;
  reelCount: number;
  linkCount: number;
  incrementCounts: (scanned: number, media: number, reel: number, link: number) => void;
  resetCounts: () => void;
}

export const useSync = create<SyncEngineState>((set, get) => ({
  isSyncing: false,
  isPaused: false,
  progressStatus: "Idle",
  currentSyncingThreadId: null,
  totalItemsScanned: 0,
  mediaCount: 0,
  reelCount: 0,
  linkCount: 0,

  incrementCounts: (scanned, media, reel, link) => set((state) => ({
    totalItemsScanned: state.totalItemsScanned + scanned,
    mediaCount: state.mediaCount + media,
    reelCount: state.reelCount + reel,
    linkCount: state.linkCount + link,
  })),

  resetCounts: () => set({
    totalItemsScanned: 0,
    mediaCount: 0,
    reelCount: 0,
    linkCount: 0,
  }),

  syncSingleThread: async (threadId: string, username: string) => {
    if (get().isSyncing) return; // Don't interrupt global sync

    get().resetCounts();
    set({ isSyncing: true, isPaused: false, currentSyncingThreadId: threadId, progressStatus: `Syncing items for: ${username}` });

    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ isSyncing: false, currentSyncingThreadId: null, progressStatus: "No session found" });
      return;
    }

    try {
      const getCursor = async (targetId: string) => {
        const records = await database.get<SyncState>("sync_state").query(Q.where("target_id", targetId)).fetch();
        return records.length > 0 ? records[0].cursor : "";
      };

      const setCursor = async (targetId: string, cursor: string) => {
        await database.write(async () => {
          const records = await database.get<SyncState>("sync_state").query(Q.where("target_id", targetId)).fetch();
          if (records.length > 0) {
            await records[0].update((rec) => {
              rec.cursor = cursor;
            });
          } else {
            await database.get<SyncState>("sync_state").create((rec) => {
              rec.targetId = targetId;
              rec.cursor = cursor;
            });
          }
        });
      };

      let threadCursor = await getCursor(`thread_${threadId}`);

      if (!threadCursor) {
        await database.write(async () => {
          const oldItems = await database.get('media').query(Q.where('inbox_id', threadId)).fetch();
          if (oldItems.length > 0) {
            const batchOps = oldItems.map(item => item.prepareDestroyPermanently());
            await database.batch(...batchOps);
          }
        });
      }

      let hasMoreThread = true;

      while (hasMoreThread) {
        if (get().isPaused) break; // User manually paused

        const threadRes = await IGThread({
          sessionId,
          threadId,
          cursor: threadCursor,
          inboxId: threadId,
          csrfToken: csrfToken || undefined,
          appId: appId || undefined
        });

        if (threadRes.error) {
          console.error("Thread sync error:", threadRes.error);
          break;
        }

        const itemsScanned = threadRes.data?.items?.length || 0;
        const counts = threadRes.data?.counts || { media: 0, reel: 0, link: 0 };
        get().incrementCounts(itemsScanned, counts.media, counts.reel, counts.link);

        threadCursor = threadRes.data?.oldest_cursor || "";
        hasMoreThread = threadRes.data?.has_older === true;

        if (threadCursor) {
          await setCursor(`thread_${threadId}`, threadCursor);
        }
      }

      if (!get().isPaused) {
        set({ isSyncing: false, currentSyncingThreadId: null, progressStatus: "Thread sync complete" });
      } else {
        // Leave it paused
      }
    } catch (e) {
      console.error("Single Thread Sync Error", e);
      set({ isSyncing: false, currentSyncingThreadId: null, progressStatus: "Error syncing thread" });
    }
  },

  syncInbox: async () => {
    if (get().isSyncing) return;

    get().resetCounts();
    set({ isSyncing: true, isPaused: false, progressStatus: "Starting inbox sync...", currentSyncingThreadId: null });

    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ isSyncing: false, progressStatus: "No session found" });
      return;
    }

    try {
      const getCursor = async (targetId: string) => {
        const records = await database.get<SyncState>("sync_state").query(Q.where("target_id", targetId)).fetch();
        return records.length > 0 ? records[0].cursor : "";
      };

      const setCursor = async (targetId: string, cursor: string) => {
        await database.write(async () => {
          const records = await database.get<SyncState>("sync_state").query(Q.where("target_id", targetId)).fetch();
          if (records.length > 0) {
            await records[0].update((rec) => {
              rec.cursor = cursor;
            });
          } else {
            await database.get<SyncState>("sync_state").create((rec) => {
              rec.targetId = targetId;
              rec.cursor = cursor;
            });
          }
        });
      };

      let inboxCursor = await getCursor("inbox_root");
      let hasMoreInbox = true;

      while (hasMoreInbox) {
        if (get().isPaused) break;

        set({ progressStatus: "Crawling inbox threads..." });

        const res = await IGInbox({ sessionId, cursor: inboxCursor, csrfToken: csrfToken || undefined, appId: appId || undefined });

        if (res.error) {
          set({ progressStatus: "Inbox error: " + res.error });
          break;
        }

        const threads = res.data?.threads || [];

        if (threads.length > 0) {
          const allExisting = await database.get<Inbox>("inbox").query().fetch();
          const existingIds = new Set(allExisting.map(t => t.threadId));

          await database.write(async () => {
            const batchOps = threads
              .filter((thread: any) => !existingIds.has(thread.thread_id))
              .map((thread: any) =>
                database.get<Inbox>("inbox").prepareCreate((inbox) => {
                  inbox.threadId = thread.thread_id;
                  inbox.username = thread.users?.[0]?.username || "Unknown";
                  inbox.fullName = thread.users?.[0]?.full_name || "";
                  inbox.pfpUrl = thread.users?.[0]?.profile_pic_url || "";
                  inbox.expired_at = Date.now() + 1000 * 60 * 60 * 24 * 7;
                })
              );
            if (batchOps.length > 0) {
              await database.batch(...batchOps);
            }
          });
        }

        inboxCursor = res.data?.oldest_cursor || "";
        hasMoreInbox = res.data?.has_older === true;

        if (inboxCursor) {
          await setCursor("inbox_root", inboxCursor);
        }
      }

      if (!get().isPaused) {
        set({ progressStatus: "Inbox sync complete", isSyncing: false, currentSyncingThreadId: null });
      } else {
        set({ progressStatus: "Sync paused", isSyncing: false, currentSyncingThreadId: null });
      }

    } catch (e) {
      console.error("Inbox Sync Error", e);
      set({ isSyncing: false, progressStatus: "Error during inbox sync", currentSyncingThreadId: null });
    }
  },

  syncThreadItems: async (threadIds: string[]) => {
    if (get().isSyncing) return;

    get().resetCounts();
    set({ isSyncing: true, isPaused: false, progressStatus: "Starting thread sync...", currentSyncingThreadId: null });

    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ isSyncing: false, progressStatus: "No session found" });
      return;
    }

    try {
      const getCursor = async (targetId: string) => {
        const records = await database.get<SyncState>("sync_state").query(Q.where("target_id", targetId)).fetch();
        return records.length > 0 ? records[0].cursor : "";
      };

      const setCursor = async (targetId: string, cursor: string) => {
        await database.write(async () => {
          const records = await database.get<SyncState>("sync_state").query(Q.where("target_id", targetId)).fetch();
          if (records.length > 0) {
            await records[0].update((rec) => {
              rec.cursor = cursor;
            });
          } else {
            await database.get<SyncState>("sync_state").create((rec) => {
              rec.targetId = targetId;
              rec.cursor = cursor;
            });
          }
        });
      };

      const allThreads = await database.get<Inbox>("inbox").query(
        Q.where('thread_id', Q.oneOf(threadIds))
      ).fetch();

      for (const thread of allThreads) {
        if (get().isPaused) break;

        set({
          progressStatus: `Syncing items for: ${thread.username}`,
          currentSyncingThreadId: thread.threadId
        });

        let threadCursor = await getCursor(`thread_${thread.threadId}`);

        if (!threadCursor) {
          await database.write(async () => {
            const oldItems = await database.get('media').query(Q.where('inbox_id', thread.threadId)).fetch();
            if (oldItems.length > 0) {
              const batchOps = oldItems.map(item => item.prepareDestroyPermanently());
              await database.batch(...batchOps);
            }
          });
        }

        let hasMoreThread = true;

        while (hasMoreThread) {
          if (get().isPaused) break;

          const threadRes = await IGThread({
            sessionId,
            threadId: thread.threadId,
            cursor: threadCursor,
            inboxId: thread.threadId,
            csrfToken: csrfToken || undefined,
            appId: appId || undefined
          });

          if (threadRes.error) {
            console.error("Thread sync error:", threadRes.error);
            break;
          }

          const itemsScanned = threadRes.data?.items?.length || 0;
          const counts = threadRes.data?.counts || { media: 0, reel: 0, link: 0 };
          get().incrementCounts(itemsScanned, counts.media, counts.reel, counts.link);

          threadCursor = threadRes.data?.oldest_cursor || "";
          hasMoreThread = threadRes.data?.has_older === true;

          if (threadCursor) {
            await setCursor(`thread_${thread.threadId}`, threadCursor);
          }
        }
      }

      if (!get().isPaused) {
        set({ progressStatus: "Sync complete", isSyncing: false, currentSyncingThreadId: null });
      } else {
        set({ progressStatus: "Sync paused", isSyncing: false, currentSyncingThreadId: null });
      }

    } catch (e) {
      console.error("Thread Items Sync Error", e);
      set({ isSyncing: false, progressStatus: "Error during thread items sync", currentSyncingThreadId: null });
    }
  },

  pauseSync: () => {
    set({ isPaused: true, isSyncing: false, progressStatus: "Paused", currentSyncingThreadId: null });
  }
}));
