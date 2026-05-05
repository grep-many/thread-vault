import { database } from "@/model";
import { Q } from "@nozbe/watermelondb";
import Media from "@/model/media";
import { igRequest } from "@/lib/instagram/ig";

export function useIGDatabase() {
  const getThreadMedia = async (threadId: string) => {
    return await database.get<Media>("media").query(Q.where("thread_id", threadId)).fetch();
  };

  const unsendMediaItem = async (sessionId: string, threadId: string, itemId: string) => {
    try {
      // 1. Unsend on Instagram
      const url = `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/items/${itemId}/delete/`;
      // Usually delete endpoints require form url-encoded data with CSRF, but igRequest handles it if it's just a POST without body
      const response = await igRequest(url, sessionId, { method: "POST" }) as
        | { status: string; message?: string }
        | null;

      if (response?.status === "fail") {
        throw new Error(response.message || "Failed to unsend on Instagram");
      }

      // 2. Delete from local database
      const mediaItems = await database
        .get<Media>("media")
        .query(Q.where("item_id", itemId))
        .fetch();
      if (mediaItems.length > 0) {
        await database.write(async () => {
          const ops = mediaItems.map((item) => item.prepareDestroyPermanently());
          await database.batch(...ops);
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to unsend item:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return {
    getThreadMedia,
    unsendMediaItem,
  };
}
