import { Model } from "@nozbe/watermelondb";
import { text, field } from "@nozbe/watermelondb/decorators";

export default class Inbox extends Model {
  static table = "inbox";

  // These must match your tableSchema column names exactly
  @text("thread_id") threadId!: string;
  @text("username") username!: string;
  @text("full_name") fullName!: string;
  @text("profile_pic_url") pfpUrl!: string;
  @field("expired_at") expired_at!: number;
}
