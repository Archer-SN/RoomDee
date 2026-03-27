import {
  pgTable, uuid, text, integer, boolean, timestamp,
} from "drizzle-orm/pg-core";
import { bookings } from "./booking";
import { users } from "./user";
import { properties } from "./property";

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").unique().notNull().references(() => bookings.id, { onDelete: "restrict" }), // one review per booking
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1–5, enforced via check constraint in migration SQL
  comment: text("comment"),
  hostReply: text("host_reply"),
  hostRepliedAt: timestamp("host_replied_at", { withTimezone: true }),
  isVisible: boolean("is_visible").notNull().default(true), // admin moderation flag
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
