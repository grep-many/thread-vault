import { igRequest, getSessionData } from "@/lib/instagram/ig";

interface UnsendParams {
  sessionId: string;
  csrfToken?: string;
  appId?: string;
  threadId: string;
  itemId: string;
}

interface UnsendResult {
  success: boolean;
  error?: string;
}

/**
 * Deletes (unsends) a single direct message item.
 *
 * Instagram's delete endpoint requires:
 *   - Method: POST (not DELETE)
 *   - Body: `_csrftoken=<token>` as application/x-www-form-urlencoded
 *
 * A 300 ms delay between sequential calls is enforced by the caller (use-unsend-queue).
 */
export async function IGUnsendItem({
  sessionId,
  csrfToken,
  appId,
  threadId,
  itemId,
}: UnsendParams): Promise<UnsendResult> {
  try {
    const { csrf } = getSessionData(sessionId, csrfToken, appId);
    const url = `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/items/${itemId}/delete/`;

    const data = await igRequest(
      url,
      sessionId,
      {
        method: "POST",
        body: `_csrftoken=${encodeURIComponent(csrf)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      csrfToken,
      appId,
    ) as { status?: string; message?: string };

    // Instagram returns { status: "ok" } on success
    if (data?.status === "fail") {
      return { success: false, error: data.message || "API returned fail status" };
    }

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[IGUnsend] Failed to unsend item ${itemId}:`, msg);
    return { success: false, error: msg };
  }
}
