import { Model } from "@nozbe/watermelondb";
import { text, field } from "@nozbe/watermelondb/decorators";

export default class Media extends Model {
  static table = "media";

  @text("inbox_id") inboxId!: string; // Link to the Inbox record
  @text("type") type!: "media" | "reel" | "link";
  @text("url") url!: string;
  @field("sent_at") sentAt!: number;
  @field("expired_at") expiredAt!: number;
}
