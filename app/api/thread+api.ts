import { igRequest } from "@/lib/ig";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, threadId, cursor } = body;

    if (!sessionId || !threadId) {
      return Response.json({ error: "Session ID and Thread ID are required" }, { status: 400 });
    }

    let url = `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/`;
    if (cursor) {
      url += `?cursor=${cursor}`;
    }

    const data = (await igRequest(url, sessionId)) as any;

    if (data.status === "fail") {
      return Response.json({ error: data.message || "API Error" }, { status: 400 });
    }

    return Response.json(
      {
        items: data.thread.items || [],
        has_older: data.thread.has_older,
        oldest_cursor: data.thread.oldest_cursor,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Thread proxy error:", error);
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
