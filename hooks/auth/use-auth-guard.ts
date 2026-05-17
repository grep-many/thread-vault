import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { SplashScreen } from "expo-router";
import { useSession } from "@/hooks/auth/use-session";
import { useSync } from "@/hooks/sync/use-sync";
import { validateSession } from "./use-validate-session";

const selectInit = (s: ReturnType<typeof useSession.getState>) => s.init;

export function useAuthGuard() {
  const [isReady, setIsReady] = useState(false);

  const init = useSession(selectInit);

  // Stable ref so the Alert callback never captures a stale syncInbox
  const syncInboxRef = useRef(useSync.getState().syncInbox);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!init) return;

        const { removedMedia, removedThreads } = await init();
        if (cancelled) return;

        const { sessionId, csrfToken, appId } = useSession.getState();

        if (sessionId) {
          const { isValid, hasExistingData } = await validateSession(
            sessionId,
            csrfToken,
            appId,
          );
          if (cancelled) return;

          if (isValid) {
            if (!hasExistingData) {
              useSync.getState().syncInbox();
            }

            router.replace("/inbox");

            const expiredMediaCount = removedMedia?.length ?? 0;
            const expiredThreadCount = removedThreads?.length ?? 0;

            if (expiredMediaCount > 0 || expiredThreadCount > 0) {
              Alert.alert(
                "Storage Cleanup",
                `Cleaned up ${expiredMediaCount} expired media items and ${expiredThreadCount} expired threads. Would you like to sync now to refresh your inbox?`,
                [
                  { text: "Later", style: "cancel" },
                  { text: "Sync Now", onPress: () => syncInboxRef.current() },
                ],
              );
            }
          }
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
          SplashScreen.hideAsync();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  // `init` is a stable Zustand action — deps array intentionally minimal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init]);

  return { isReady };
}
