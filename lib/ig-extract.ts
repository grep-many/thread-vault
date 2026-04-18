// Robust High-Performance Recursive Search (Replaces slow JSON parsing memory leaks)
export const extractItem = (item: any, peerIds: string[]): ExtractedMedia | null => {
  try {
    // Efficiency block: Instantly drop non-extractive purely text primitives
    if (
      item.item_type === "text" ||
      item.item_type === "action_log" ||
      item.item_type === "like" ||
      item.item_type === "video_call" ||
      item.item_type === "raven_media" ||
      !!item.raven_media ||
      item.item_type === "story_share" ||
      !!item.story_share
    ) {
      return null;
    }

    const id = item.item_id;
    // Guarantee reliable Sender PK extraction using Instagram's multiple variable namespaces
    const sender_pk = (item.user_id || item.sender_id || item.sender)?.toString() || "";

    const is_sent =
      item.is_sent_by_viewer !== undefined ? item.is_sent_by_viewer : !peerIds.includes(sender_pk);
    const timestamp = item.timestamp
      ? item.timestamp > 1e13
        ? item.timestamp / 1000
        : item.timestamp
      : Date.now();

    let extracted: ExtractedMedia = {
      id,
      type: "media",
      content_type: "photo",
      url: "",
      preview: "",
      text: "",
      sender_pk,
      is_video: false,
      is_sent,
      timestamp,
    };

    const itemType = item.item_type;

    // Ensure strict mapping requested by user
    const isGroupMedia = ["media", "voice_media", "animated_media"].includes(itemType);
    const isGroupReel =
      ["clip", "media_share", "reel_share"].includes(itemType) ||
      !!item.clip ||
      !!item.reel_share ||
      (item.media && item.media.product_type === "clips") ||
      item.direct_media_share?.media?.product_type === "clips";
    const isGroupLink = itemType === "link";

    if (!isGroupMedia && !isGroupReel && !isGroupLink) {
      return null;
    }

    if (itemType === "voice_media" || !!item.voice_media) {
      extracted.type = "media";
      extracted.content_type = "audio";
      extracted.url = item.voice_media?.media?.audio?.audio_src || "voice_media";
      extracted.text = "Voice Message";
    } else if (isGroupLink) {
      extracted.type = "url";
      extracted.content_type = "url";
      extracted.url = item.link?.link_context?.link_url || item.link?.text || "link";
      extracted.text = item.link?.link_context?.link_title || item.link?.text || "";
    } else {
      let videoUrl = "";
      let imgUrl = "";

      const searchMedia = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        if (videoUrl && imgUrl) return;

        if (!videoUrl) {
          if (
            obj.video_versions &&
            Array.isArray(obj.video_versions) &&
            obj.video_versions.length > 0
          ) {
            videoUrl = obj.video_versions[0].url;
          } else if (typeof obj.video_url === "string") {
            videoUrl = obj.video_url;
          }
        }

        if (!imgUrl) {
          if (
            obj.image_versions2 &&
            Array.isArray(obj.image_versions2.candidates) &&
            obj.image_versions2.candidates.length > 0
          ) {
            imgUrl = obj.image_versions2.candidates[0].url;
          } else if (typeof obj.thumbnail_url === "string") {
            imgUrl = obj.thumbnail_url;
          } else if (typeof obj.image_url === "string") {
            imgUrl = obj.image_url;
          } else if (
            obj.images &&
            obj.images.standard_resolution &&
            typeof obj.images.standard_resolution.url === "string"
          ) {
            imgUrl = obj.images.standard_resolution.url;
          }
        }

        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            searchMedia(obj[key]);
          }
        }
      };

      searchMedia(item);

      if (videoUrl || imgUrl) {
        extracted.type = isGroupReel ? "reel" : "media";
        extracted.content_type = videoUrl ? "video" : "photo";
        extracted.url = videoUrl || imgUrl || "";
        extracted.preview = imgUrl || videoUrl || "";
        extracted.is_video = !!videoUrl;
      } else if (itemType === "animated_media") {
        extracted.type = isGroupReel ? "reel" : "media";
        extracted.content_type = "photo";
        extracted.url = "animated_media";
      } else {
        return null;
      }
    }

    if (extracted.url) {
      return extracted;
    }
    return null;
  } catch (e) {
    return null;
  }
};
