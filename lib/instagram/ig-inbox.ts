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

type RawThread = Record<string, unknown>;
type RawUser = { username?: string; full_name?: string; profile_pic_url?: string };

const INBOX_BASE_URL =
  "https://www.instagram.com/api/v1/direct_v2/inbox/?visual_message_return_type=unseen&thread_message_limit=1&persistentBadging=true&limit=20";

const THREAD_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function IGInbox({
  sessionId,
  cursor,
  csrfToken,
  appId,
}: IGInboxParams): Promise<IGInboxResult> {
  try {
    const url = cursor ? `${INBOX_BASE_URL}&cursor=${cursor}` : INBOX_BASE_URL;

    const data = (await igRequest(url, sessionId, {}, csrfToken, appId)) as {
      inbox?: { threads: unknown[]; has_older: boolean; oldest_cursor: string };
      status?: string;
      message?: string;
    };

    if (!data?.inbox) {
      throw new Error("Unexpected API response shape");
    }

    const threads = (data.inbox.threads ?? []) as RawThread[];

    if (threads.length > 0) {
      // Fetch only existing IDs — cheaper than fetching full records
      const allExisting = await database.get<Inbox>("inbox").query().fetch();
      const existingIds = new Set(allExisting.map((t) => t.threadId));
      const expiredAt = Date.now() + THREAD_TTL_MS;

      const newThreads = threads.filter(
        (thread) => !existingIds.has(thread.thread_id as string),
      );

      if (newThreads.length > 0) {
        await database.write(async () => {
          const batchOps = newThreads.map((thread) => {
            const user = ((thread.users as RawUser[]) ?? [])[0] ?? {};
            return database.get<Inbox>("inbox").prepareCreate((inbox) => {
              inbox.threadId = thread.thread_id as string;
              inbox.username = user.username ?? "Unknown";
              inbox.fullName = user.full_name ?? "";
              inbox.pfpUrl = user.profile_pic_url ?? "";
              inbox.expired_at = expiredAt;
            });
          });
          await database.batch(...batchOps);
        });
      }
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
    return {
      error: error instanceof Error ? error.message : "Internal Server Error",
      data: null,
    };
  }
}
