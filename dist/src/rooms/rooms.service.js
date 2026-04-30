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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const nanoid_1 = require("nanoid");
const rooms_schema_1 = require("../database/schema/rooms.schema");
const messages_schema_1 = require("../database/schema/messages.schema");
const redis_service_1 = require("../redis/redis.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const nanoid = (0, nanoid_1.customAlphabet)('abcdefghijklmnopqrstuvwxyz0123456789', 6);
let RoomsService = class RoomsService {
    db;
    redisService;
    constructor(db, redisService) {
        this.db = db;
        this.redisService = redisService;
    }
    async findAll() {
        const rows = await this.db.select().from(rooms_schema_1.rooms);
        return Promise.all(rows.map(async (room) => ({
            ...room,
            activeUsers: await this.redisService.getActiveUserCount(room.id),
        })));
    }
    async findById(id) {
        const [room] = await this.db.select().from(rooms_schema_1.rooms).where((0, drizzle_orm_1.eq)(rooms_schema_1.rooms.id, id));
        if (!room) {
            throw new app_exception_1.AppException(404, 'ROOM_NOT_FOUND', `Room with id ${id} does not exist`);
        }
        const activeUsers = await this.redisService.getActiveUserCount(id);
        return { ...room, activeUsers };
    }
    async create(name, createdBy) {
        const [existing] = await this.db.select({ id: rooms_schema_1.rooms.id }).from(rooms_schema_1.rooms).where((0, drizzle_orm_1.eq)(rooms_schema_1.rooms.name, name));
        if (existing) {
            throw new app_exception_1.AppException(409, 'ROOM_NAME_TAKEN', 'A room with this name already exists');
        }
        const [room] = await this.db
            .insert(rooms_schema_1.rooms)
            .values({ id: `room_${nanoid()}`, name, createdBy })
            .returning();
        return room;
    }
    async delete(id, requestingUsername) {
        const room = await this.findById(id);
        if (room.createdBy !== requestingUsername) {
            throw new app_exception_1.AppException(403, 'FORBIDDEN', 'Only the room creator can delete this room');
        }
        await this.redisService.publish(`room:${id}:deleted`, { roomId: id });
        await this.db.transaction(async (tx) => {
            await tx.delete(messages_schema_1.messages).where((0, drizzle_orm_1.eq)(messages_schema_1.messages.roomId, id));
            await tx.delete(rooms_schema_1.rooms).where((0, drizzle_orm_1.eq)(rooms_schema_1.rooms.id, id));
        });
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE_DB')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        redis_service_1.RedisService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map