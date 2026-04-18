import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { storage } from "@/services";

/**
 * 1. Bridge Zustand to MMKV
 * This tells Zustand how to read/write using the MMKV engine.
 */
const mmkvStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
};

/**
 * 2. The Hook
 * Use this in your components: const { sessionId, logout } = useAuth();
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,

      setSession: (id: string) => {
        set({ sessionId: id });
      },

      logout: () => {
        set({ sessionId: null });
        storage.clearAll();
      },
    }),
    {
      name: "session-storage", // The key used inside MMKV
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
