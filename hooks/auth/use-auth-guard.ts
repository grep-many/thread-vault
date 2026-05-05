import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { SplashScreen } from "expo-router";
import { useSession } from "@/hooks/auth/use-session";
import { useSync } from "@/hooks/sync/use-sync";
import { validateSession } from "./use-validate-session";

/**
 * Centralises auth initialisation logic:
 *   1. Restores session from SecureStore via useSession.init()
 *   2. Delegates session validation to validateSession() — no duplicated IGInbox calls
 *   3. Routes to /inbox on success or stays on / (login) on failure
 *   4. Triggers auto-sync on a fresh install (empty inbox)
 *   5. Alerts user if expired data was pruned during init
 *   6. Calls SplashScreen.hideAsync() in the finally block
 */
export function useAuthGuard() {
  const [isReady, setIsReady] = useState(false);

  const init = useSession((state) => state.init);
  const syncInbox = useSync((state) => state.syncInbox);

  useEffect(() => {
    (async () => {
      try {
        if (!init) return;

        const { removedMedia, removedThreads } = await init();
        const { sessionId, csrfToken, appId } = useSession.getState();

        if (sessionId) {
          const { isValid, hasExistingData } = await validateSession(
            sessionId,
            csrfToken,
            appId,
          );

          if (isValid) {
            // Auto-start sync on a fresh install (no local threads yet)
            if (!hasExistingData) {
              useSync.getState().syncInbox();
            }

            router.replace("/inbox");

            // Notify user about pruned expired data (only after a confirmed valid session)
            if (
              (removedMedia && removedMedia.length > 0) ||
              (removedThreads && removedThreads.length > 0)
            ) {
              Alert.alert(
                "Storage Cleanup",
                `Cleaned up ${removedMedia.length} expired media items and ${removedThreads.length} expired threads. Would you like to sync now to refresh your inbox?`,
                [
                  { text: "Later", style: "cancel" },
                  { text: "Sync Now", onPress: () => syncInbox() },
                ],
              );
            }
          }
          // validateSession() already handled logout + DB reset on invalid session
        }
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, [init, syncInbox]);

  return { isReady };
}
