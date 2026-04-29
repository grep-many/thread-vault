import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 1,
  tables: [
    // 1. INBOX Table: Stores the threads/users
    tableSchema({
      name: "inbox",
      columns: [
        { name: "thread_id", type: "string", isIndexed: true },
        { name: "username", type: "string" },
        { name: "profile_pic_url", type: "string" },
        { name: "expired_at", type: "number" },
      ],
    }),

    // 2. MEDIA Table: Stores images, videos, reels, and links
    // We consolidate these for better performance with FlashList
    tableSchema({
      name: "media",
      columns: [
        { name: "inbox_id", type: "string", isIndexed: true }, // Foreign Key to inbox
        { name: "type", type: "string" }, // 'media' | 'reels' | 'urls'
        { name: "url", type: "string" },
        { name: "thumbnail_url", type: "string", isOptional: true },
        { name: "expired_at", type: "number" },
      ],
    }),
  ],
});
