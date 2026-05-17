import { database } from "@/model";
import SyncState from "@/model/sync-state";
import { Q } from "@nozbe/watermelondb";

export async function getCursor(targetId: string): Promise<string> {
  const records = await database
    .get<SyncState>("sync_state")
    .query(Q.where("target_id", targetId))
    .fetch();
  return records[0]?.cursor ?? "";
}

export async function setCursor(targetId: string, cursor: string): Promise<void> {
  await database.write(async () => {
    const records = await database
      .get<SyncState>("sync_state")
      .query(Q.where("target_id", targetId))
      .fetch();

    if (records.length > 0) {
      await records[0].update((rec) => {
        rec.cursor = cursor;
      });
    } else {
      await database.get<SyncState>("sync_state").create((rec) => {
        rec.targetId = targetId;
        rec.cursor = cursor;
      });
    }
  });
}
