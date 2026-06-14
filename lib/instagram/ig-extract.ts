const SKIP_ITEM_TYPES = new Set(["text", "action_log", "like", "video_call", "story_share"]);

const REEL_ITEM_TYPES = new Set(["clip", "media_share", "reel_share"]);

const MEDIA_ITEM_TYPES = new Set(["media", "voice_media", "animated_media"]);

const LINK_ITEM_TYPES = new Set(["link", "raven_media", "placeholder"]);

function findMediaUrls(obj: unknown): {
  videoUrl: string;
  imageUrl: string;
} {
  let videoUrl = "";
  let imageUrl = "";

  const walk = (value: unknown): void => {
    if (!value || typeof value !== "object" || (videoUrl && imageUrl)) {
      return;
    }

    const o = value as Record<string, unknown>;

    if (!videoUrl) {
      if (Array.isArray(o.video_versions) && o.video_versions.length > 0) {
        videoUrl = (o.video_versions[0] as { url?: string }).url ?? "";
      } else if (typeof o.video_url === "string") {
        videoUrl = o.video_url;
      }
    }

    if (!imageUrl) {
      const iv2 = o.image_versions2 as { candidates?: { url: string }[] } | undefined;

      if (iv2?.candidates?.length) {
        imageUrl = iv2.candidates[0].url;
      } else if (typeof o.thumbnail_url === "string") {
        imageUrl = o.thumbnail_url;
      } else if (typeof o.image_url === "string") {
        imageUrl = o.image_url;
      } else if (
        o.images &&
        (o.images as Record<string, Record<string, string>>).standard_resolution?.url
      ) {
        imageUrl = (o.images as Record<string, Record<string, string>>).standard_resolution.url;
      }
    }

    for (const child of Object.values(o)) {
      walk(child);
    }
  };

  walk(obj);

  return { videoUrl, imageUrl };
}

export function extractItem(item: unknown, peerIds: string[]): ExtractedMedia | null {
  try {
    const record = item as Record<string, unknown>;

    const itemType = String(record.item_type ?? "");

    if (SKIP_ITEM_TYPES.has(itemType) || record.story_share) {
      return null;
    }

    const sender_pk = (record.user_id ?? record.sender_id ?? record.sender)?.toString?.() ?? "";

    const is_sent =
      record.is_sent_by_viewer !== undefined
        ? Boolean(record.is_sent_by_viewer)
        : !peerIds.includes(sender_pk);

    const rawTimestamp = Number(record.timestamp);

    const timestamp =
      Number.isFinite(rawTimestamp) && rawTimestamp > 0
        ? rawTimestamp > 1e13
          ? rawTimestamp / 1000
          : rawTimestamp
        : Date.now();

    const isGroupMedia = MEDIA_ITEM_TYPES.has(itemType);

    const isGroupReel =
      REEL_ITEM_TYPES.has(itemType) ||
      !!record.clip ||
      !!record.reel_share ||
      (record.media as Record<string, unknown>)?.product_type === "clips" ||
      (record.direct_media_share as Record<string, Record<string, unknown>> | undefined)?.media
        ?.product_type === "clips";

    const isGroupLink = LINK_ITEM_TYPES.has(itemType);

    if (!isGroupMedia && !isGroupReel && !isGroupLink) {
      return null;
    }

    const extracted: ExtractedMedia = {
      id: String(record.item_id ?? ""),
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

    // Voice message
    if (itemType === "voice_media" || record.voice_media) {
      extracted.type = "media";
      extracted.content_type = "audio";
      extracted.url =
        (record.voice_media as Record<string, Record<string, Record<string, string>>>)?.media?.audio
          ?.audio_src ?? "voice_media";
      extracted.text = "Voice Message";

      return extracted;
    }

    // Link / Raven / Placeholder
    if (isGroupLink) {
      const link = record.link as Record<string, Record<string, string>> | undefined;

      const raven = record.raven_media as Record<string, unknown> | undefined;

      const placeholder = record.placeholder as Record<string, unknown> | undefined;

      extracted.type = "link";
      extracted.content_type = "url";

      extracted.url =
        link?.link_context?.link_url ??
        (typeof link?.text === "string" ? link.text : undefined) ??
        (raven?.url as string | undefined) ??
        (placeholder?.url as string | undefined) ??
        itemType;

      extracted.text =
        link?.link_context?.link_title ??
        (typeof link?.text === "string" ? link.text : undefined) ??
        (placeholder?.message as string | undefined) ??
        (raven?.title as string | undefined) ??
        itemType;

      return extracted;
    }

    // Media / Reels
    const { videoUrl, imageUrl } = findMediaUrls(record);

    if (videoUrl || imageUrl) {
      extracted.type = isGroupReel ? "reel" : "media";

      extracted.content_type = videoUrl ? "video" : "photo";

      extracted.url = videoUrl || imageUrl;
      extracted.preview = imageUrl || videoUrl;
      extracted.is_video = Boolean(videoUrl);

      return extracted;
    }

    if (itemType === "animated_media") {
      extracted.type = isGroupReel ? "reel" : "media";

      extracted.content_type = "photo";
      extracted.url = "animated_media";

      return extracted;
    }

    return null;
  } catch {
    return null;
  }
}
