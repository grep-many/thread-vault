import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 2,
  tables: [
    // 1. INBOX Table: Stores the threads/users
    tableSchema({
      name: "inbox",
      columns: [
        { name: "thread_id", type: "string", isIndexed: true },
        { name: "username", type: "string" },
        { name: "full_name", type: "string", isOptional: true },
        { name: "profile_pic_url", type: "string" },
        { name: "expired_at", type: "number" },
      ],
    }),

    // 2. MEDIA Table: Stores images, videos, reels, and links
    tableSchema({
      name: "media",
      columns: [
        { name: "inbox_id", type: "string", isIndexed: true }, // Foreign Key to inbox
        { name: "thread_id", type: "string", isIndexed: true }, // Instagram Thread ID
        { name: "item_id", type: "string", isIndexed: true }, // Instagram Item ID
        { name: "type", type: "string" }, // 'media' | 'reel' | 'link'
        { name: "item_type", type: "string" }, // Original item_type e.g., 'clip', 'media_share'
        { name: "url", type: "string" },
        { name: "thumbnail_url", type: "string", isOptional: true },
        { name: "sent_at", type: "number" },
        { name: "expired_at", type: "number", isOptional: true },
        { name: "is_sent", type: "boolean" },
      ],
    }),

    // 3. SYNC STATE Table: Stores pagination cursors for syncing
    tableSchema({
      name: "sync_state",
      columns: [
        { name: "target_id", type: "string", isIndexed: true }, // e.g., 'inbox_root' or threadId
        { name: "cursor", type: "string" }, // The pagination cursor
      ],
    }),
  ],
});
