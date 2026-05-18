import { database } from "@/model";
import { IGInbox } from "@/lib/instagram/ig-inbox";
import { useSession } from "./use-session";

interface ValidateSessionResult {
  isValid: boolean;
  hasExistingData: boolean;
}

export async function validateSession(
  sessionId: string,
  csrfToken?: string | null,
  appId?: string | null,
): Promise<ValidateSessionResult> {
  try {
    // Run count + API validation in parallel — they are independent
    const [count, result] = await Promise.all([
      database.get("inbox").query().fetchCount(),
      IGInbox({
        sessionId,
        cursor: "",
        csrfToken: csrfToken ?? undefined,
        appId: appId ?? undefined,
      }),
    ]);

    const hasExistingData = count > 0;

    if (!result.error && result.data) {
      return { isValid: true, hasExistingData };
    }

    useSession.getState().logout();
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });

    return { isValid: false, hasExistingData };
  } catch {
    return { isValid: false, hasExistingData: false };
  }
}
