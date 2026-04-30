"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const nanoid_1 = require("nanoid");
const messages_schema_1 = require("../database/schema/messages.schema");
const redis_service_1 = require("../redis/redis.service");
const rooms_service_1 = require("../rooms/rooms.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const nanoid = (0, nanoid_1.customAlphabet)('abcdefghijklmnopqrstuvwxyz0123456789', 6);
let MessagesService = class MessagesService {
    db;
    redisService;
    roomsService;
    constructor(db, redisService, roomsService) {
        this.db = db;
        this.redisService = redisService;
        this.roomsService = roomsService;
    }
    async getMessages(roomId, limit, before) {
        await this.roomsService.findById(roomId);
        let rows;
        if (before) {
            const [cursor] = await this.db
                .select({ createdAt: messages_schema_1.messages.createdAt })
                .from(messages_schema_1.messages)
                .where((0, drizzle_orm_1.eq)(messages_schema_1.messages.id, before));
            rows = await this.db
                .select()
                .from(messages_schema_1.messages)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messages_schema_1.messages.roomId, roomId), (0, drizzle_orm_1.lt)(messages_schema_1.messages.createdAt, cursor.createdAt)))
                .orderBy((0, drizzle_orm_1.desc)(messages_schema_1.messages.createdAt))
                .limit(limit + 1);
        }
        else {
            rows = await this.db
                .select()
                .from(messages_schema_1.messages)
                .where((0, drizzle_orm_1.eq)(messages_schema_1.messages.roomId, roomId))
                .orderBy((0, drizzle_orm_1.desc)(messages_schema_1.messages.createdAt))
                .limit(limit + 1);
        }
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit).reverse();
        const nextCursor = hasMore ? page[0].id : null;
        return { messages: page, hasMore, nextCursor };
    }
    async sendMessage(roomId, username, content) {
        await this.roomsService.findById(roomId);
        const trimmed = content.trim();
        if (!trimmed) {
            throw new app_exception_1.AppException(422, 'MESSAGE_EMPTY', 'Message content must not be empty');
        }
        if (trimmed.length > 1000) {
            throw new app_exception_1.AppException(422, 'MESSAGE_TOO_LONG', 'Message content must not exceed 1000 characters');
        }
        const [message] = await this.db
            .insert(messages_schema_1.messages)
            .values({ id: `msg_${nanoid()}`, roomId, username, content: trimmed })
            .returning();
        await this.redisService.publish(`room:${roomId}:messages`, {
            id: message.id,
            roomId: message.roomId,
            username: message.username,
            content: message.content,
            createdAt: message.createdAt,
        });
        return message;
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE_DB')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        redis_service_1.RedisService,
        rooms_service_1.RoomsService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map