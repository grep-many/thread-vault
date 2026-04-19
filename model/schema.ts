import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "inbox",
      columns: [
        { name: "instagram_id", type: "string", isIndexed: true },
        { name: "username", type: "string" },
      ],
    }),
    tableSchema({
      name: "threads",
      columns: [
        { name: "thread_id", type: "string", isIndexed: true },
        { name: "content", type: "string" },
        { name: "timestamp", type: "number" },
      ],
    }),
  ],
});
