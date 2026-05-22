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
    const [id, csrf, app_id] = await Promise.all([
      SecureStore.getItemAsync("sid"),
      SecureStore.getItemAsync("csrfToken"),
      SecureStore.getItemAsync("appId"),
    ]);

    set({ sessionId: id, csrfToken: csrf, appId: app_id, isLoading: false });

    const now = Date.now();
    let removedMedia: Media[] = [];
    let removedThreads: Inbox[] = [];

    try {
      const [expiredMedia, expiredThreads] = await Promise.all([
        database
          .get<Media>("media")
          .query(Q.where("expired_at", Q.notEq(null)), Q.where("expired_at", Q.lt(now)))
          .fetch(),
        database
          .get<Inbox>("inbox")
          .query(Q.where("expired_at", Q.notEq(null)), Q.where("expired_at", Q.lt(now)))
          .fetch(),
      ]);

      removedMedia = expiredMedia;
      removedThreads = expiredThreads;

      if (expiredMedia.length > 0 || expiredThreads.length > 0) {
        await database.write(async () => {
          await database.batch(
            ...expiredMedia.map((m) => m.prepareDestroyPermanently()),
            ...expiredThreads.map((t) => t.prepareDestroyPermanently()),
          );
        });
      }
    } catch {}

    return { removedMedia, removedThreads };
  },

  setSession: (id, csrf, app_id) => {
    const ops: Promise<void>[] = [SecureStore.setItemAsync("sid", id)];
    if (csrf) ops.push(SecureStore.setItemAsync("csrfToken", csrf));
    if (app_id) ops.push(SecureStore.setItemAsync("appId", app_id));
    Promise.all(ops).catch(() => {});
    set({ sessionId: id, csrfToken: csrf ?? null, appId: app_id ?? null });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync("sid"),
      SecureStore.deleteItemAsync("csrfToken"),
      SecureStore.deleteItemAsync("appId"),
    ]);
    set({ sessionId: null, csrfToken: null, appId: null });
  },
}));
