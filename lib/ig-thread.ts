import { igRequest } from "@/lib/ig";

export async function IGThread({ sessionId, threadId, cursor }: IGThreadParameter) {
  try {
    if (!sessionId || !threadId) throw new Error("Session ID and Thread ID are required");

    let url = `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/`;
    if (cursor) {
      url += `?cursor=${cursor}`;
    }

    const data = await igRequest(url, sessionId);

    if (data.status === "fail") throw new Error(data.message || "Instagram API failed!");

    return {
      error: null,
      data: {
        items: data.thread.items || [],
        has_older: data.thread.has_older,
        oldest_cursor: data.thread.oldest_cursor,
      },
    };
  } catch (error: unknown) {
    console.error("Thread proxy error:", error);
    return { error: error instanceof Error ? error.message : "Internal Server Error", data: null };
  }
}
