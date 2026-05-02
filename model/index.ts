import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

import schema from "./schema";
import Inbox from "./inbox";
import Media from "./media";

import SyncState from "./sync-state";

// 1. The Adapter handles the physical file on the phone
const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // Uses the high-speed JSI bridge
});

// 2. The Database instance is what you'll use in your components
export const database = new Database({
  adapter,
  modelClasses: [Inbox, Media, SyncState],
});
