"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rooms = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.rooms = (0, pg_core_1.pgTable)('rooms', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    createdBy: (0, pg_core_1.text)('created_by').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=rooms.schema.js.map