import { create } from "zustand";
import { database } from "@/model";
import SyncState from "@/model/sync-state";
import Inbox from "@/model/inbox";
import { Q } from "@nozbe/watermelondb";
import { useSession } from "./use-session";
import { IGInbox } from "@/lib/ig-inbox";
import { IGThread } from "@/lib/ig-thread";
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // Add these two lines to satisfy the new type requirements:
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('sync', {
    name: 'Background Sync',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

let activeNotificationId: string | null = null;

async function requestPermissionsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

const SYNC_NOTIFICATION_ID = 'threadvault-sync';

async function updateNotification(status: string) {
  try {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) return;

    activeNotificationId = await Notifications.scheduleNotificationAsync({
      identifier: SYNC_NOTIFICATION_ID,
      content: {
        title: 'ThreadVault Sync',
        body: status,
        autoDismiss: false,
        sticky: true,
      },
      trigger: {
        channelId: Platform.OS === 'android' ? 'sync' : undefined,
      } as any, // bypassing strict trigger type for channelId
    });
  } catch (error) {
    console.error("Failed to schedule notification:", error);
  }
}

async function clearNotification() {
  await Notifications.dismissNotificationAsync(SYNC_NOTIFICATION_ID);
  activeNotificationId = null;
}

interface SyncEngineState {
  isSyncing: boolean;
  isPaused: boolean;
  progressStatus: string;
  currentSyncingThreadId: string | null;
  startSync: () => Promise<void>;
  pauseSync: () => void;
  syncSingleThread: (threadId: string, username: string) => Promise<void>;
}

export const useSync = create<SyncEngineState>((set, get) => ({
  isSyncing: false,
  isPaused: false,
  progressStatus: "Idle",
  currentSyncingThreadId: null,

  syncSingleThread: async (threadId: string, username: string) => {
    if (get().isSyncing) return; // Don't interrupt global sync

    set({ currentSyncingThreadId: threadId, progressStatus: `Syncing items for: ${username}` });
    
    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ currentSyncingThreadId: null, progressStatus: "No session found" });
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

        threadCursor = threadRes.data?.oldest_cursor || "";
        hasMoreThread = threadRes.data?.has_older === true;

        if (threadCursor) {
          await setCursor(`thread_${threadId}`, threadCursor);
        }
      }

      set({ currentSyncingThreadId: null, progressStatus: "Thread sync complete" });
    } catch (e) {
      console.error("Single Thread Sync Error", e);
      set({ currentSyncingThreadId: null, progressStatus: "Error syncing thread" });
    }
  },

  startSync: async () => {
    if (get().isSyncing) return;

    set({ isSyncing: true, isPaused: false, progressStatus: "Starting sync...", currentSyncingThreadId: null });
    await updateNotification("Starting sync...");

    const { sessionId, csrfToken, appId } = useSession.getState();
    if (!sessionId) {
      set({ isSyncing: false, progressStatus: "No session found" });
      await clearNotification();
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

      // PHASE 1: Fetch all inbox threads
      let inboxCursor = await getCursor("inbox_root");
      let hasMoreInbox = true;

      while (hasMoreInbox) {
        if (get().isPaused) break;

        set({ progressStatus: "Crawling inbox threads..." });
        await updateNotification("Crawling inbox threads...");

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

      // PHASE 2: Fetch items for each thread
      if (!get().isPaused) {
        const allThreads = await database.get<Inbox>("inbox").query().fetch();

        for (const thread of allThreads) {
          if (get().isPaused) break;

          set({
            progressStatus: `Syncing items for: ${thread.username}`,
            currentSyncingThreadId: thread.threadId
          });
          await updateNotification(`Syncing items for: ${thread.username}`);

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

            threadCursor = threadRes.data?.oldest_cursor || "";
            hasMoreThread = threadRes.data?.has_older === true;

            if (threadCursor) {
              await setCursor(`thread_${thread.threadId}`, threadCursor);
            }
          }
        }
      }

      if (!get().isPaused) {
        set({ progressStatus: "Sync complete", isSyncing: false, currentSyncingThreadId: null });
        await updateNotification("Sync complete");
        setTimeout(() => clearNotification(), 2000);
      } else {
        set({ progressStatus: "Sync paused", isSyncing: false, currentSyncingThreadId: null });
        await updateNotification("Sync paused");
        setTimeout(() => clearNotification(), 2000);
      }

    } catch (e) {
      console.error("Sync Engine Error", e);
      set({ isSyncing: false, progressStatus: "Error during sync", currentSyncingThreadId: null });
      await clearNotification();
    }
  },

  pauseSync: () => {
    set({ isPaused: true, isSyncing: false, progressStatus: "Paused", currentSyncingThreadId: null });
    updateNotification("Sync paused");
    setTimeout(() => clearNotification(), 2000);
  }
}));
