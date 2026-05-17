import { useCallback } from "react";
import { router } from "expo-router";
import { database } from "@/model";
import { useSession } from "./use-session";

const selectLogout = (s: ReturnType<typeof useSession.getState>) => s.logout;

export function useLogout() {
  const logout = useSession(selectLogout);

  return useCallback(async () => {
    await logout();
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    router.replace("/");
  }, [logout]);
}
