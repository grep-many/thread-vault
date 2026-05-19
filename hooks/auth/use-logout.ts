import { useCallback } from "react";
import { router } from "expo-router";
import { database } from "@/model";
import { useSession } from "./use-session";
import { useSync } from "@/hooks/sync/use-sync";
import { useUnsendQueue } from "@/hooks/unsend/use-unsend-queue";

const selectLogout = (s: ReturnType<typeof useSession.getState>) => s.logout;

export function useLogout() {
  const logout = useSession(selectLogout);

  return useCallback(async () => {
    await logout();
    useSync.setState({
      isSyncing: false,
      isPaused: false,
      progressStatus: "Idle",
      currentSyncingThreadId: null,
      totalItemsScanned: 0,
      mediaCount: 0,
      reelCount: 0,
      linkCount: 0,
    });
    useUnsendQueue.getState().reset();
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    router.replace("/");
  }, [logout]);
}
