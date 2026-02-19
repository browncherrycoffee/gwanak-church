import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  summary: varchar("summary", { length: 500 }),
  category: varchar("category", { length: 50 }).default("일반"),
  isPinned: boolean("is_pinned").default(false),
  isPublished: boolean("is_published").default(true),
  viewCount: integer("view_count").default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
