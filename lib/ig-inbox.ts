import { igRequest } from "@/lib/ig";

export async function IGInbox({ sessionId, cursor }: Omit<IGThreadParameter, "threadId">) {
  try {
    if (!sessionId) throw new Error("Session ID is required!");

    let url =
      "https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=0&thread_message_limit=1";
    if (cursor) url += `&cursor=${cursor}`;

    const data = await igRequest(url, sessionId);

    if (data.status === "fail") throw new Error(data.message || "Instagram API failed!");

    return {
      error: null,
      data: {
        threads: data.inbox?.threads || [],
        has_older: data.inbox?.has_older,
        oldest_cursor: data.inbox?.oldest_cursor,
      },
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Server Error", data: null };
  }
}
