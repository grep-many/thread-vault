import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface SessionState {
  sessionId: string | null;
  isLoading: boolean;
  init: () => Promise<void>;
  setSession: (id: string) => void;
  logout: () => void;
}

export const useSession = create<SessionState>((set) => ({
  sessionId: null,
  isLoading: true,

  init: async () => {
    const id = await SecureStore.getItemAsync("sid");
    set({ sessionId: id, isLoading: false });
  },

  setSession: (id) => {
    SecureStore.setItemAsync("sid", id);
    set({ sessionId: id });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("sid");
    set({ sessionId: null });
  },
}));
