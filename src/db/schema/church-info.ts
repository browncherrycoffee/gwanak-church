import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const churchInfo = pgTable("church_info", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
