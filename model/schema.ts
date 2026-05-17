import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: "inbox",
      columns: [
        { name: "thread_id", type: "string", isIndexed: true },
        { name: "username", type: "string", isIndexed: true },
        { name: "full_name", type: "string", isOptional: true },
        { name: "profile_pic_url", type: "string" },
        { name: "expired_at", type: "number" },
      ],
    }),

    tableSchema({
      name: "media",
      columns: [
        { name: "inbox_id", type: "string", isIndexed: true },
        { name: "thread_id", type: "string", isIndexed: true },
        { name: "item_id", type: "string", isIndexed: true },
        { name: "type", type: "string", isIndexed: true },
        { name: "item_type", type: "string" },
        { name: "url", type: "string" },
        { name: "thumbnail_url", type: "string", isOptional: true },
        { name: "sent_at", type: "number", isIndexed: true },
        { name: "expired_at", type: "number", isOptional: true },
        { name: "is_sent", type: "boolean", isIndexed: true },
      ],
    }),

    tableSchema({
      name: "sync_state",
      columns: [
        { name: "target_id", type: "string", isIndexed: true },
        { name: "cursor", type: "string" },
      ],
    }),
  ],
});
