import { pgTable, uuid, varchar, text, timestamp, date, boolean } from "drizzle-orm/pg-core";

export const sermons = pgTable("sermons", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  preacher: varchar("preacher", { length: 100 }).notNull(),
  scripture: varchar("scripture", { length: 255 }),
  summary: text("summary"),
  sermonDate: date("sermon_date").notNull(),
  videoUrl: varchar("video_url", { length: 500 }),
  audioUrl: varchar("audio_url", { length: 500 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  series: varchar("series", { length: 200 }),
  category: varchar("category", { length: 50 }).default("주일설교"),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
