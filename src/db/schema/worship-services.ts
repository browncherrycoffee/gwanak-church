import { pgTable, uuid, varchar, text, time, boolean, integer } from "drizzle-orm/pg-core";

export const worshipServices = pgTable("worship_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  location: varchar("location", { length: 200 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});
