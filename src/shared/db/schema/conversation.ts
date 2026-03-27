import {
  pgTable, uuid, text, timestamp,
} from "drizzle-orm/pg-core";
import { properties } from "./property";
import { users } from "./user";
import { bookings } from "./booking";

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestId: uuid("guest_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  hostId: uuid("host_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }), // null = pre-booking inquiry
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  messageBody: text("message_body").notNull(),
  messageType: text("message_type", { enum: ["text", "image", "system"] }).notNull().default("text"),
  readAt: timestamp("read_at", { withTimezone: true }), // null = unread
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});
