import { Model } from "@nozbe/watermelondb";
import { text, field } from "@nozbe/watermelondb/decorators";

export default class Media extends Model {
  static table = "media";

  @text("inbox_id") inboxId!: string; // Link to the Inbox record
  @text("thread_id") threadId!: string;
  @text("item_id") itemId!: string;
  @text("type") type!: "media" | "reel" | "link";
  @text("item_type") itemType!: string;
  @text("url") url!: string;
  @text("thumbnail_url") thumbnailUrl?: string;
  @field("sent_at") sentAt!: number;
  @field("expired_at") expiredAt?: number;
  @field("is_sent") isSent!: boolean;
}
