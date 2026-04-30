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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = class RedisService {
    client;
    constructor(client) {
        this.client = client;
    }
    async setSession(token, data) {
        await this.client.set(`session:${token}`, JSON.stringify(data), 'EX', 86400);
    }
    async getSession(token) {
        const raw = await this.client.get(`session:${token}`);
        return raw ? JSON.parse(raw) : null;
    }
    async deleteSession(token) {
        await this.client.del(`session:${token}`);
    }
    async addActiveUser(roomId, username) {
        await this.client.sadd(`room:active:${roomId}`, username);
    }
    async removeActiveUser(roomId, username) {
        await this.client.srem(`room:active:${roomId}`, username);
    }
    async getActiveUsers(roomId) {
        return this.client.smembers(`room:active:${roomId}`);
    }
    async getActiveUserCount(roomId) {
        return this.client.scard(`room:active:${roomId}`);
    }
    async setSocketMeta(socketId, data) {
        await this.client.set(`socket:${socketId}`, JSON.stringify(data), 'EX', 3600);
    }
    async getSocketMeta(socketId) {
        const raw = await this.client.get(`socket:${socketId}`);
        return raw ? JSON.parse(raw) : null;
    }
    async deleteSocketMeta(socketId) {
        await this.client.del(`socket:${socketId}`);
    }
    async publish(channel, payload) {
        await this.client.publish(channel, JSON.stringify(payload));
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [ioredis_1.default])
], RedisService);
//# sourceMappingURL=redis.service.js.map