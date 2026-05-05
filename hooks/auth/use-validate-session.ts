import { database } from "@/model";
import { IGInbox } from "@/lib/instagram/ig-inbox";
import { useSession } from "./use-session";

interface ValidateSessionResult {
  isValid: boolean;
  /** True if the inbox was already populated (count > 0) before this validation. */
  hasExistingData: boolean;
}

/**
 * Shared async utility that validates a session against the Instagram API.
 *
 * - Returns `{ isValid: true }` if the session is still active.
 * - Returns `{ isValid: false }` and clears credentials + resets the DB if stale.
 *
 * Centralises the identical IGInbox validation blocks that previously lived in
 * both `use-auth-guard.ts` and the login screen `app/(tabs)/index.tsx`.
 */
export async function validateSession(
  sessionId: string,
  csrfToken?: string | null,
  appId?: string | null,
): Promise<ValidateSessionResult> {
  try {
    const count = await database.get("inbox").query().fetchCount();

    const result = await IGInbox({
      sessionId,
      cursor: "",
      csrfToken: csrfToken ?? undefined,
      appId: appId ?? undefined,
    });

    if (!result.error && result.data) {
      return { isValid: true, hasExistingData: count > 0 };
    }

    // Session is stale — clear credentials and wipe the DB
    useSession.getState().logout();
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log("[validateSession] Session invalid — credentials cleared, DB reset.");
    return { isValid: false, hasExistingData: count > 0 };
  } catch (e) {
    console.error("[validateSession] Unexpected error:", e);
    return { isValid: false, hasExistingData: false };
  }
}
