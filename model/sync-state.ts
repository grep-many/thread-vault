import { Model } from "@nozbe/watermelondb";
import { text } from "@nozbe/watermelondb/decorators";

export default class SyncState extends Model {
  static table = "sync_state";

  @text("target_id") targetId!: string;
  @text("cursor") cursor!: string;
}
