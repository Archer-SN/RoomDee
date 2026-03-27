import { pgTable, uuid, text, integer, date } from "drizzle-orm/pg-core";
import { roomTypes } from "./room-type";

export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id")
    .notNull()
    .references(() => roomTypes.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  availableCount: integer("available_count").notNull().default(0),
  status: text("status", { enum: ["available", "blocked"] })
    .notNull()
    .default("available"),
  source: text("source", { enum: ["platform", "channex"] })
    .notNull()
    .default("platform"),
  // UNIQUE(room_type_id, date) added via migration SQL
});
