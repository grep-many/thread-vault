const SKIP_ITEM_TYPES = new Set([
  "text",
  "action_log",
  "like",
  "video_call",
  "raven_media",
  "story_share",
]);

const REEL_ITEM_TYPES = new Set(["clip", "media_share", "reel_share"]);
const MEDIA_ITEM_TYPES = new Set(["media", "voice_media", "animated_media"]);

export function extractItem(item: unknown, peerIds: string[]): ExtractedMedia | null {
  try {
    const record = item as Record<string, unknown>;

    // Fast early exit for non-extractable types
    if (
      SKIP_ITEM_TYPES.has(record.item_type as string) ||
      !!record.raven_media ||
      !!record.story_share
    ) {
      return null;
    }

    const id = record.item_id as string;
    const sender_pk =
      ((record.user_id ?? record.sender_id ?? record.sender) as string | number | undefined)
        ?.toString() ?? "";

    const is_sent =
      record.is_sent_by_viewer !== undefined
        ? (record.is_sent_by_viewer as boolean)
        : !peerIds.includes(sender_pk);

    const rawTimestamp = record.timestamp as number | undefined;
    const timestamp = rawTimestamp
      ? rawTimestamp > 1e13
        ? rawTimestamp / 1000
        : rawTimestamp
      : Date.now();

    const itemType = record.item_type as string;

    const isGroupMedia = MEDIA_ITEM_TYPES.has(itemType);
    const isGroupReel =
      REEL_ITEM_TYPES.has(itemType) ||
      !!record.clip ||
      !!record.reel_share ||
      (record.media as Record<string, unknown>)?.product_type === "clips" ||
      ((record.direct_media_share as Record<string, Record<string, unknown>>)?.media
        ?.product_type === "clips");
    const isGroupLink = itemType === "link";

    if (!isGroupMedia && !isGroupReel && !isGroupLink) return null;

    const extracted: ExtractedMedia = {
      id,
      type: "media",
      item_type: itemType,
      content_type: "photo",
      url: "",
      preview: "",
      text: "",
      sender_pk,
      is_video: false,
      is_sent,
      timestamp,
    };

    if (itemType === "voice_media" || !!record.voice_media) {
      extracted.type = "media";
      extracted.content_type = "audio";
      extracted.url =
        ((record.voice_media as Record<string, Record<string, Record<string, string>>>)?.media
          ?.audio?.audio_src) ?? "voice_media";
      extracted.text = "Voice Message";
    } else if (isGroupLink) {
      const link = record.link as Record<string, Record<string, string>> | undefined;
      extracted.type = "link";
      extracted.content_type = "url";
      extracted.url =
        link?.link_context?.link_url ??
        (typeof link?.text === "string" ? link.text : undefined) ??
        "link";
      extracted.text =
        link?.link_context?.link_title ??
        (typeof link?.text === "string" ? link.text : undefined) ??
        "";
    } else {
      let videoUrl = "";
      let imgUrl = "";

      const searchMedia = (obj: unknown) => {
        if (!obj || typeof obj !== "object" || (videoUrl && imgUrl)) return;

        const o = obj as Record<string, unknown>;

        if (!videoUrl) {
          if (Array.isArray(o.video_versions) && o.video_versions.length > 0) {
            videoUrl = (o.video_versions[0] as { url: string }).url;
          } else if (typeof o.video_url === "string") {
            videoUrl = o.video_url;
          }
        }

        if (!imgUrl) {
          const iv2 = o.image_versions2 as { candidates?: { url: string }[] } | undefined;
          if (iv2?.candidates && iv2.candidates.length > 0) {
            imgUrl = iv2.candidates[0].url;
          } else if (typeof o.thumbnail_url === "string") {
            imgUrl = o.thumbnail_url;
          } else if (typeof o.image_url === "string") {
            imgUrl = o.image_url;
          } else if (
            o.images &&
            (o.images as Record<string, Record<string, string>>).standard_resolution?.url
          ) {
            imgUrl = (o.images as Record<string, Record<string, string>>).standard_resolution.url;
          }
        }

        for (const key in o) {
          if (Object.prototype.hasOwnProperty.call(o, key)) {
            searchMedia(o[key]);
          }
        }
      };

      searchMedia(record);

      if (videoUrl || imgUrl) {
        extracted.type = isGroupReel ? "reel" : "media";
        extracted.content_type = videoUrl ? "video" : "photo";
        extracted.url = videoUrl || imgUrl;
        extracted.preview = imgUrl || videoUrl;
        extracted.is_video = !!videoUrl;
      } else if (itemType === "animated_media") {
        extracted.type = isGroupReel ? "reel" : "media";
        extracted.content_type = "photo";
        extracted.url = "animated_media";
      } else {
        return null;
      }
    }

    return extracted.url ? extracted : null;
  } catch {
    return null;
  }
}
