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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const ioredis_1 = __importDefault(require("ioredis"));
const socket_io_1 = require("socket.io");
const redis_service_1 = require("../redis/redis.service");
const rooms_service_1 = require("../rooms/rooms.service");
let ChatGateway = class ChatGateway {
    redisService;
    roomsService;
    server;
    constructor(redisService, roomsService) {
        this.redisService = redisService;
        this.roomsService = roomsService;
    }
    afterInit() {
        const subClient = new ioredis_1.default(process.env.REDIS_URL);
        subClient.psubscribe('room:*:messages', 'room:*:deleted');
        subClient.on('pmessage', (_pattern, channel, messageStr) => {
            const payload = JSON.parse(messageStr);
            if (channel.endsWith(':messages')) {
                const roomId = channel.split(':')[1];
                this.server.to(roomId).emit('message:new', {
                    id: payload.id,
                    username: payload.username,
                    content: payload.content,
                    createdAt: payload.createdAt,
                });
            }
            else if (channel.endsWith(':deleted')) {
                const roomId = channel.split(':')[1];
                this.server.to(roomId).emit('room:deleted', { roomId });
            }
        });
    }
    async handleConnection(client) {
        const token = client.handshake.query['token'];
        const roomId = client.handshake.query['roomId'];
        if (!token || !roomId) {
            client.emit('error', { code: 400, message: 'token and roomId are required' });
            client.disconnect();
            return;
        }
        const session = await this.redisService.getSession(token);
        if (!session) {
            client.emit('error', { code: 401, message: 'Invalid or expired session' });
            client.disconnect();
            return;
        }
        try {
            await this.roomsService.findById(roomId);
        }
        catch {
            client.emit('error', { code: 404, message: 'Room not found' });
            client.disconnect();
            return;
        }
        const { username } = session;
        await this.redisService.addActiveUser(roomId, username);
        await this.redisService.setSocketMeta(client.id, { username, roomId });
        client.join(roomId);
        const activeUsers = await this.redisService.getActiveUsers(roomId);
        client.emit('room:joined', { activeUsers });
        client.to(roomId).emit('room:user_joined', { username, activeUsers });
    }
    async handleDisconnect(client) {
        const meta = await this.redisService.getSocketMeta(client.id);
        if (!meta)
            return;
        await this.redisService.removeActiveUser(meta.roomId, meta.username);
        await this.redisService.deleteSocketMeta(client.id);
        const activeUsers = await this.redisService.getActiveUsers(meta.roomId);
        this.server.to(meta.roomId).emit('room:user_left', { username: meta.username, activeUsers });
    }
    async handleLeave(client) {
        const meta = await this.redisService.getSocketMeta(client.id);
        if (!meta)
            return;
        await this.redisService.removeActiveUser(meta.roomId, meta.username);
        await this.redisService.deleteSocketMeta(client.id);
        const activeUsers = await this.redisService.getActiveUsers(meta.roomId);
        this.server.to(meta.roomId).emit('room:user_left', { username: meta.username, activeUsers });
        client.leave(meta.roomId);
        client.disconnect();
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:leave'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleLeave", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/chat', cors: { origin: '*' } }),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        rooms_service_1.RoomsService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map