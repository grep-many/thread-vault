import { useCallback } from "react";
import { router } from "expo-router";
import { database } from "@/model";
import { useSession } from "./use-session";

/**
 * Encapsulates the full logout flow:
 *   1. Clear SecureStore credentials via useSession.logout()
 *   2. Reset the WatermelonDB database
 *   3. Navigate to the login screen
 *
 * Centralised here so no UI component has to know about the DB reset step.
 */
export function useLogout() {
  const logout = useSession((s) => s.logout);

  return useCallback(async () => {
    await logout();
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    router.replace("/");
  }, [logout]);
}
