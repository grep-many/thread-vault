import { IGInbox } from "@/lib/instagram/ig-inbox";
import { IGThread } from "@/lib/instagram/ig-thread";
import { database } from "@/model";
import Inbox from "@/model/inbox";
import { Q } from "@nozbe/watermelondb";
import { create } from "zustand";
import { useSession } from "@/hooks/auth/use-session";
import { getCursor, setCursor } from "./use-cursor";

interface SyncEngineState {
  isSyncing: boolean;
  isPaused: boolean;
  progressStatus: string;
  currentSyncingThreadId: string | null;
  totalItemsScanned: number;
  mediaCount: number;
  reelCount: number;
  linkCount: number;
  // Actions
  syncInbox: () => Promise<void>;
  syncThreadItems: (threadIds: string[]) => Promise<void>;
  syncSingleThread: (threadId: string, username: string) => Promise<void>;
  pauseSync: () => void;
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

  incrementCounts: (scanned, media, reel, link) =>
    set((state) => ({
      totalItemsScanned: state.totalItemsScanned + scanned,
      mediaCount: state.mediaCount + media,
      reelCount: state.reelCount + reel,
      linkCount: state.linkCount + link,
    })),

  resetCounts: () =>
    set({ totalItemsScanned: 0, mediaCount: 0, reelCount: 0, linkCount: 0 }),

  // ─── Sync a single thread by ID ──────────────────────────────────────────
  syncSingleThread: async (threadId, username) => {
    if (get().isSyncing) return;

    get().resetCounts();
    set({
      isSyncing: true,
      isPaused: false,
      currentSyncingThreadId: threadId,
      progressStatus: `Syncing items for: ${username}`,
    });

    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ isSyncing: false, currentSyncingThreadId: null, progressStatus: "No session found" });
      return;
    }

    try {
      let threadCursor = await getCursor(`thread_${threadId}`);

      // Fresh sync — clear stale items first
      if (!threadCursor) {
        await database.write(async () => {
          const oldItems = await database.get("media").query(Q.where("inbox_id", threadId)).fetch();
          if (oldItems.length > 0) {
            await database.batch(...oldItems.map((item) => item.prepareDestroyPermanently()));
          }
        });
      }

      let hasMore = true;
      while (hasMore) {
        if (get().isPaused) break;

        const res = await IGThread({
          sessionId,
          threadId,
          cursor: threadCursor,
          inboxId: threadId,
          csrfToken: csrfToken || undefined,
          appId: appId || undefined,
        });

        if (res.error) {
          console.error("[SyncSingleThread] Error:", res.error);
          break;
        }

        const itemsScanned = res.data?.items?.length || 0;
        const counts = res.data?.counts || { media: 0, reel: 0, link: 0 };
        get().incrementCounts(itemsScanned, counts.media, counts.reel, counts.link);

        threadCursor = res.data?.oldest_cursor || "";
        hasMore = res.data?.has_older === true;

        if (threadCursor) await setCursor(`thread_${threadId}`, threadCursor);
      }

      if (!get().isPaused) {
        set({ isSyncing: false, currentSyncingThreadId: null, progressStatus: "Thread sync complete" });
      }
    } catch (e) {
      console.error("[SyncSingleThread] Exception:", e);
      set({ isSyncing: false, currentSyncingThreadId: null, progressStatus: "Error syncing thread" });
    }
  },

  // ─── Full inbox crawl ─────────────────────────────────────────────────────
  syncInbox: async () => {
    if (get().isSyncing) return;

    get().resetCounts();
    set({
      isSyncing: true,
      isPaused: false,
      progressStatus: "Starting inbox sync...",
      currentSyncingThreadId: null,
    });

    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ isSyncing: false, progressStatus: "No session found" });
      return;
    }

    try {
      let inboxCursor = await getCursor("inbox_root");
      let hasMore = true;

      while (hasMore) {
        if (get().isPaused) break;

        set({ progressStatus: "Crawling inbox threads..." });

        const res = await IGInbox({
          sessionId,
          cursor: inboxCursor,
          csrfToken: csrfToken || undefined,
          appId: appId || undefined,
        });

        if (res.error) {
          set({ progressStatus: "Inbox error: " + res.error });
          break;
        }

        inboxCursor = res.data?.oldest_cursor || "";
        hasMore = res.data?.has_older === true;

        if (inboxCursor) await setCursor("inbox_root", inboxCursor);
      }

      if (!get().isPaused) {
        set({ progressStatus: "Inbox sync complete", isSyncing: false, currentSyncingThreadId: null });
      } else {
        set({ progressStatus: "Sync paused", isSyncing: false, currentSyncingThreadId: null });
      }
    } catch (e) {
      console.error("[SyncInbox] Exception:", e);
      set({ isSyncing: false, progressStatus: "Error during inbox sync", currentSyncingThreadId: null });
    }
  },

  // ─── Sync a batch of threads by IDs ──────────────────────────────────────
  syncThreadItems: async (threadIds) => {
    if (get().isSyncing) return;

    get().resetCounts();
    set({
      isSyncing: true,
      isPaused: false,
      progressStatus: "Starting thread sync...",
      currentSyncingThreadId: null,
    });

    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ isSyncing: false, progressStatus: "No session found" });
      return;
    }

    try {
      const allThreads = await database
        .get<Inbox>("inbox")
        .query(Q.where("thread_id", Q.oneOf(threadIds)))
        .fetch();

      for (const thread of allThreads) {
        if (get().isPaused) break;

        set({
          progressStatus: `Syncing items for: ${thread.username}`,
          currentSyncingThreadId: thread.threadId,
        });

        let threadCursor = await getCursor(`thread_${thread.threadId}`);

        if (!threadCursor) {
          await database.write(async () => {
            const oldItems = await database
              .get("media")
              .query(Q.where("inbox_id", thread.threadId))
              .fetch();
            if (oldItems.length > 0) {
              await database.batch(...oldItems.map((item) => item.prepareDestroyPermanently()));
            }
          });
        }

        let hasMore = true;
        while (hasMore) {
          if (get().isPaused) break;

          const res = await IGThread({
            sessionId,
            threadId: thread.threadId,
            cursor: threadCursor,
            inboxId: thread.threadId,
            csrfToken: csrfToken || undefined,
            appId: appId || undefined,
          });

          if (res.error) {
            console.error("[SyncThreadItems] Thread error:", res.error);
            break;
          }

          const itemsScanned = res.data?.items?.length || 0;
          const counts = res.data?.counts || { media: 0, reel: 0, link: 0 };
          get().incrementCounts(itemsScanned, counts.media, counts.reel, counts.link);

          threadCursor = res.data?.oldest_cursor || "";
          hasMore = res.data?.has_older === true;

          if (threadCursor) await setCursor(`thread_${thread.threadId}`, threadCursor);
        }
      }

      if (!get().isPaused) {
        set({ progressStatus: "Sync complete", isSyncing: false, currentSyncingThreadId: null });
      } else {
        set({ progressStatus: "Sync paused", isSyncing: false, currentSyncingThreadId: null });
      }
    } catch (e) {
      console.error("[SyncThreadItems] Exception:", e);
      set({ isSyncing: false, progressStatus: "Error during thread items sync", currentSyncingThreadId: null });
    }
  },

  pauseSync: () => {
    set({ isPaused: true, isSyncing: false, progressStatus: "Paused", currentSyncingThreadId: null });
  },
}));
