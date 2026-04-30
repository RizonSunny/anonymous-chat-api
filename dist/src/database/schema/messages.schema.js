"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    roomId: (0, pg_core_1.text)('room_id').notNull(),
    username: (0, pg_core_1.text)('username').notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('messages_room_created_idx').on(t.roomId, t.createdAt)]);
//# sourceMappingURL=messages.schema.js.map