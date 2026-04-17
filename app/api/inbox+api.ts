import { igRequest } from "@/lib/ig";

// app/api/validate+api.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, cursor } = body;

    if (!sessionId) return Response.json({ error: "Session ID is required!" }, { status: 400 });

    let url =
      "https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=0&thread_message_limit=1";
    if (cursor) url += `&cursor=${cursor}`;

    const data = await igRequest(url, sessionId);

    if (data.status === "fail") return Response.json({ error: data.message }, { status: 400 });

    return Response.json(
      {
        threads: data.inbox?.threads || [],
        has_older: data.inbox?.has_older,
        oldest_cursor: data.inbox?.oldest_cursor,
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json({ error: "Server Error" }, { status: 500 });
  }
}
