import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

export const messages = pgTable('messages', {
  id:        text('id').primaryKey(),
  roomId:    text('room_id').notNull(),
  username:  text('username').notNull(),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('messages_room_created_idx').on(t.roomId, t.createdAt)]);
