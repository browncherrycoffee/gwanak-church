import { pgTable, uuid, varchar, text, timestamp, date, boolean } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 300 }),
  detailAddress: varchar("detail_address", { length: 200 }),
  birthDate: date("birth_date"),
  gender: varchar("gender", { length: 10 }),
  position: varchar("position", { length: 30 }).default("성도"),
  department: varchar("department", { length: 50 }),
  district: varchar("district", { length: 50 }),
  familyHead: varchar("family_head", { length: 50 }),
  relationship: varchar("relationship", { length: 20 }),
  baptismDate: date("baptism_date"),
  baptismType: varchar("baptism_type", { length: 20 }),
  registrationDate: date("registration_date"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
