import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
