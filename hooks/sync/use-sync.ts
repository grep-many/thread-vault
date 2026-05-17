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
  syncInbox: () => Promise<void>;
  syncThreadItems: (threadIds: string[]) => Promise<void>;
  syncSingleThread: (threadId: string, username: string) => Promise<void>;
  pauseSync: () => void;
  incrementCounts: (scanned: number, media: number, reel: number, link: number) => void;
  resetCounts: () => void;
}

const INITIAL_COUNTS = {
  totalItemsScanned: 0,
  mediaCount: 0,
  reelCount: 0,
  linkCount: 0,
} as const;

export const useSync = create<SyncEngineState>((set, get) => ({
  isSyncing: false,
  isPaused: false,
  progressStatus: "Idle",
  currentSyncingThreadId: null,
  ...INITIAL_COUNTS,

  incrementCounts: (scanned, media, reel, link) =>
    set((state) => ({
      totalItemsScanned: state.totalItemsScanned + scanned,
      mediaCount: state.mediaCount + media,
      reelCount: state.reelCount + reel,
      linkCount: state.linkCount + link,
    })),

  resetCounts: () => set(INITIAL_COUNTS),

  pauseSync: () =>
    set({
      isPaused: true,
      isSyncing: false,
      progressStatus: "Paused",
      currentSyncingThreadId: null,
    }),

  // ─── Sync a single thread ─────────────────────────────────────────────────
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
      let cursor = await getCursor(`thread_${threadId}`);

      if (!cursor) {
        await database.write(async () => {
          const old = await database.get("media").query(Q.where("inbox_id", threadId)).fetch();
          if (old.length > 0) {
            await database.batch(...old.map((item) => item.prepareDestroyPermanently()));
          }
        });
      }

      let hasMore = true;
      while (hasMore) {
        if (get().isPaused) break;

        const res = await IGThread({
          sessionId,
          threadId,
          cursor,
          inboxId: threadId,
          csrfToken: csrfToken ?? undefined,
          appId: appId ?? undefined,
        });

        if (res.error) {
          console.error("[syncSingleThread] Error:", res.error);
          break;
        }

        const itemsScanned = res.data?.items?.length ?? 0;
        const counts = res.data?.counts ?? { media: 0, reel: 0, link: 0 };
        get().incrementCounts(itemsScanned, counts.media, counts.reel, counts.link);

        cursor = res.data?.oldest_cursor ?? "";
        hasMore = res.data?.has_older === true;

        if (cursor) await setCursor(`thread_${threadId}`, cursor);
      }

      if (!get().isPaused) {
        set({ isSyncing: false, currentSyncingThreadId: null, progressStatus: "Thread sync complete" });
      }
    } catch (e) {
      console.error("[syncSingleThread] Exception:", e);
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
      let cursor = await getCursor("inbox_root");
      let hasMore = true;

      while (hasMore) {
        if (get().isPaused) break;

        set({ progressStatus: "Crawling inbox threads..." });

        const res = await IGInbox({
          sessionId,
          cursor,
          csrfToken: csrfToken ?? undefined,
          appId: appId ?? undefined,
        });

        if (res.error) {
          set({ progressStatus: `Inbox error: ${res.error}` });
          break;
        }

        cursor = res.data?.oldest_cursor ?? "";
        hasMore = res.data?.has_older === true;

        if (cursor) await setCursor("inbox_root", cursor);
      }

      set(
        get().isPaused
          ? { progressStatus: "Sync paused", isSyncing: false, currentSyncingThreadId: null }
          : { progressStatus: "Inbox sync complete", isSyncing: false, currentSyncingThreadId: null },
      );
    } catch (e) {
      console.error("[syncInbox] Exception:", e);
      set({ isSyncing: false, progressStatus: "Error during inbox sync", currentSyncingThreadId: null });
    }
  },

  // ─── Batch thread sync ────────────────────────────────────────────────────
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

        let cursor = await getCursor(`thread_${thread.threadId}`);

        if (!cursor) {
          await database.write(async () => {
            const old = await database
              .get("media")
              .query(Q.where("inbox_id", thread.threadId))
              .fetch();
            if (old.length > 0) {
              await database.batch(...old.map((item) => item.prepareDestroyPermanently()));
            }
          });
        }

        let hasMore = true;
        while (hasMore) {
          if (get().isPaused) break;

          const res = await IGThread({
            sessionId,
            threadId: thread.threadId,
            cursor,
            inboxId: thread.threadId,
            csrfToken: csrfToken ?? undefined,
            appId: appId ?? undefined,
          });

          if (res.error) {
            console.error("[syncThreadItems] Thread error:", res.error);
            break;
          }

          const itemsScanned = res.data?.items?.length ?? 0;
          const counts = res.data?.counts ?? { media: 0, reel: 0, link: 0 };
          get().incrementCounts(itemsScanned, counts.media, counts.reel, counts.link);

          cursor = res.data?.oldest_cursor ?? "";
          hasMore = res.data?.has_older === true;

          if (cursor) await setCursor(`thread_${thread.threadId}`, cursor);
        }
      }

      set(
        get().isPaused
          ? { progressStatus: "Sync paused", isSyncing: false, currentSyncingThreadId: null }
          : { progressStatus: "Sync complete", isSyncing: false, currentSyncingThreadId: null },
      );
    } catch (e) {
      console.error("[syncThreadItems] Exception:", e);
      set({ isSyncing: false, progressStatus: "Error during thread items sync", currentSyncingThreadId: null });
    }
  },
}));
