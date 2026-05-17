import { database } from "@/model";
import { Q } from "@nozbe/watermelondb";
import Media from "@/model/media";
import { igRequest } from "@/lib/instagram/ig";

const UNSEND_URL = (threadId: string, itemId: string) =>
  `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/items/${itemId}/delete/`;

type UnsendResponse = { status: string; message?: string } | null;

export function useIGDatabase() {
  const getThreadMedia = (threadId: string) =>
    database.get<Media>("media").query(Q.where("thread_id", threadId)).fetch();

  const unsendMediaItem = async (
    sessionId: string,
    threadId: string,
    itemId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = (await igRequest(
        UNSEND_URL(threadId, itemId),
        sessionId,
        { method: "POST" },
      )) as UnsendResponse;

      if (response?.status === "fail") {
        throw new Error(response.message ?? "Failed to unsend on Instagram");
      }

      const mediaItems = await database
        .get<Media>("media")
        .query(Q.where("item_id", itemId))
        .fetch();

      if (mediaItems.length > 0) {
        await database.write(async () => {
          await database.batch(...mediaItems.map((item) => item.prepareDestroyPermanently()));
        });
      }

      return { success: true };
    } catch (error) {
      console.error("[useIGDatabase] unsendMediaItem error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return { getThreadMedia, unsendMediaItem };
}
