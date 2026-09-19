import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  owner: text("owner").primaryKey(),
  body: text("body").notNull(),
  version: integer("version").notNull().default(1),
  updated: text("updated").notNull(),
});
