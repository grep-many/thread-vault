import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { database } from "@/model";
import { Q } from "@nozbe/watermelondb";
import Media from "@/model/media";
import Inbox from "@/model/inbox";

interface SessionState {
  sessionId: string | null;
  csrfToken: string | null;
  appId: string | null;
  isLoading: boolean;
  init: () => Promise<{ removedMedia: Media[]; removedThreads: Inbox[] }>;
  setSession: (id: string, csrf?: string, app_id?: string) => void;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  sessionId: null,
  csrfToken: null,
  appId: null,
  isLoading: true,

  init: async () => {
    const id = await SecureStore.getItemAsync("sid");
    const csrf = await SecureStore.getItemAsync("csrfToken");
    const app_id = await SecureStore.getItemAsync("appId");
    set({ sessionId: id, csrfToken: csrf, appId: app_id, isLoading: false });

    // Perform database cleanup of expired records
    const now = Date.now();
    let removedMedia: Media[] = [];
    let removedThreads: Inbox[] = [];

    try {
      const expiredMedia = await database
        .get<Media>("media")
        .query(Q.where("expired_at", Q.notEq(null)), Q.where("expired_at", Q.lt(now)))
        .fetch();

      const expiredThreads = await database
        .get<Inbox>("inbox")
        .query(Q.where("expired_at", Q.notEq(null)), Q.where("expired_at", Q.lt(now)))
        .fetch();

      removedMedia = [...expiredMedia];
      removedThreads = [...expiredThreads];

      if (expiredMedia.length > 0 || expiredThreads.length > 0) {
        await database.write(async () => {
          const ops = [
            ...expiredMedia.map((m) => m.prepareDestroyPermanently()),
            ...expiredThreads.map((t) => t.prepareDestroyPermanently()),
          ];
          await database.batch(...ops);
        });
      }
    } catch (err) {
      console.error("[useSession] Cleanup error:", err);
    }

    return { removedMedia, removedThreads };
  },

  setSession: (id, csrf, app_id) => {
    SecureStore.setItemAsync("sid", id);
    if (csrf) SecureStore.setItemAsync("csrfToken", csrf);
    if (app_id) SecureStore.setItemAsync("appId", app_id);
    set({ sessionId: id, csrfToken: csrf || null, appId: app_id || null });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("sid");
    await SecureStore.deleteItemAsync("csrfToken");
    await SecureStore.deleteItemAsync("appId");
    set({ sessionId: null, csrfToken: null, appId: null });
  },
}));
