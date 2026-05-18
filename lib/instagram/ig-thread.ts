import { igRequest } from "@/lib/instagram/ig";
import { extractItem } from "@/lib/instagram/ig-extract";
import { database } from "@/model";
import Media from "@/model/media";
import { Q } from "@nozbe/watermelondb";

const THREAD_BASE = "https://www.instagram.com/api/v1/direct_v2/threads/";

type RawUser = { pk?: string | number; id?: string | number };

const EMPTY_COUNTS = { media: 0, reel: 0, link: 0, skipped: 0 };

export async function IGThread({
  sessionId,
  threadId,
  cursor,
  inboxId,
  expiredAt,
  csrfToken,
  appId,
}: IGThreadParameter) {
  try {
    if (!sessionId || !threadId) throw new Error("Session ID and Thread ID are required");

    const url = cursor
      ? `${THREAD_BASE}${threadId}/?cursor=${cursor}`
      : `${THREAD_BASE}${threadId}/`;

    const data = (await igRequest(url, sessionId, {}, csrfToken, appId)) as {
      thread: {
        items: unknown[];
        users: RawUser[];
        has_older: boolean;
        oldest_cursor: string;
      };
      status?: string;
      message?: string;
    };

    if (data.status === "fail") throw new Error(data.message ?? "Instagram API failed!");

    const items = data.thread.items ?? [];
    const users = data.thread.users ?? [];
    const peerIds = users.map((u) => (u.pk ?? u.id)?.toString() ?? "").filter(Boolean);

    const counts = { ...EMPTY_COUNTS };

    if (inboxId && items.length > 0) {
      const extractedItems: ExtractedMedia[] = [];

      for (const item of items) {
        const ext = extractItem(item, peerIds);
        if (!ext) {
          counts.skipped++;
        } else {
          if (ext.type === "media") counts.media++;
          else if (ext.type === "reel") counts.reel++;
          else if (ext.type === "link") counts.link++;
          extractedItems.push(ext);
        }
      }

      if (extractedItems.length > 0) {
        const existingMedia = await database
          .get<Media>("media")
          .query(Q.where("thread_id", threadId))
          .fetch();

        const existingItemIds = new Set(existingMedia.map((m) => m.itemId));
        const newItems = extractedItems.filter((item) => !existingItemIds.has(item.id));

        if (newItems.length > 0) {
          await database.write(async () => {
            const batchOps = newItems.map((item) =>
              database.get<Media>("media").prepareCreate((media) => {
                media.inboxId = inboxId;
                media.threadId = threadId;
                media.itemId = item.id;
                media.type = item.type;
                media.itemType = item.item_type;
                media.url = item.url;
                media.thumbnailUrl = item.preview;
                media.sentAt = item.timestamp;
                media.isSent = item.is_sent;
                if (expiredAt) media.expiredAt = expiredAt;
              }),
            );
            await database.batch(...batchOps);
          });
        }
      }
    }

    return {
      error: null,
      data: {
        items,
        has_older: data.thread.has_older,
        oldest_cursor: data.thread.oldest_cursor,
        counts,
      },
    };
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Internal Server Error",
      data: null,
    };
  }
}
