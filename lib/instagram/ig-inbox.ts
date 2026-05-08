import { igRequest } from "@/lib/instagram/ig";
import { database } from "@/model";
import Inbox from "@/model/inbox";

interface IGInboxParams {
  sessionId: string;
  cursor: string;
  csrfToken?: string;
  appId?: string;
}

interface IGInboxResult {
  error: string | null;
  data: {
    threads: unknown[];
    has_older: boolean;
    oldest_cursor: string;
  } | null;
}

export async function IGInbox({
  sessionId,
  cursor,
  csrfToken,
  appId,
}: IGInboxParams): Promise<IGInboxResult> {
  try {
    let url =
      "https://www.instagram.com/api/v1/direct_v2/inbox/?visual_message_return_type=unseen&thread_message_limit=1&persistentBadging=true&limit=20";
    if (cursor) {
      url += `&cursor=${cursor}`;
    }

    const data = (await igRequest(url, sessionId, {}, csrfToken, appId)) as {
      inbox?: { threads: unknown[]; has_older: boolean; oldest_cursor: string };
      status?: string;
      message?: string;
    };

    if (!data?.inbox) {
      throw new Error("Unexpected API response shape");
    }

    const threads = data.inbox.threads || [];

    // Upsert threads into local database
    if (threads.length > 0) {
      const allExisting = await database.get<Inbox>("inbox").query().fetch();
      const existingIds = new Set(allExisting.map((t) => t.threadId));

      await database.write(async () => {
        const batchOps = (threads as Array<Record<string, unknown>>)
          .filter((thread) => !existingIds.has(thread.thread_id as string))
          .map((thread) =>
            database.get<Inbox>("inbox").prepareCreate((inbox) => {
              inbox.threadId = thread.thread_id as string;
              inbox.username = (thread.users as Array<{ username?: string }>)?.[0]?.username || "Unknown";
              inbox.fullName = (thread.users as Array<{ full_name?: string }>)?.[0]?.full_name || "";
              inbox.pfpUrl = (thread.users as Array<{ profile_pic_url?: string }>)?.[0]?.profile_pic_url || "";
              inbox.expired_at = Date.now() + 1000 * 60 * 60 * 24 * 7;
            }),
          );
        if (batchOps.length > 0) {
          await database.batch(...batchOps);
        }
      });
    }

    return {
      error: null,
      data: {
        threads,
        has_older: data.inbox.has_older,
        oldest_cursor: data.inbox.oldest_cursor,
      },
    };
  } catch (error: unknown) {
    console.error("IGInbox error:", error);
    return {
      error: error instanceof Error ? error.message : "Internal Server Error",
      data: null,
    };
  }
}
