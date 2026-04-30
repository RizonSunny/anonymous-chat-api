import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly roomsService: RoomsService,
  ) {}

  afterInit(): void {
    // Dedicated subscriber for REST → WS fan-out
    const subClient = new Redis(process.env.REDIS_URL!);
    subClient.psubscribe('room:*:messages', 'room:*:deleted');
    subClient.on('pmessage', (_pattern, channel, messageStr) => {
      const payload = JSON.parse(messageStr) as Record<string, unknown>;
      if (channel.endsWith(':messages')) {
        const roomId = channel.split(':')[1];
        this.server.to(roomId).emit('message:new', {
          id: payload.id,
          username: payload.username,
          content: payload.content,
          createdAt: payload.createdAt,
        });
      } else if (channel.endsWith(':deleted')) {
        const roomId = channel.split(':')[1];
        this.server.to(roomId).emit('room:deleted', { roomId });
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.query['token'] as string | undefined;
    const roomId = client.handshake.query['roomId'] as string | undefined;

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
    } catch {
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

  async handleDisconnect(client: Socket): Promise<void> {
    const meta = await this.redisService.getSocketMeta(client.id);
    if (!meta) return;

    await this.redisService.removeActiveUser(meta.roomId, meta.username);
    await this.redisService.deleteSocketMeta(client.id);

    const activeUsers = await this.redisService.getActiveUsers(meta.roomId);
    this.server.to(meta.roomId).emit('room:user_left', { username: meta.username, activeUsers });
  }

  @SubscribeMessage('room:leave')
  async handleLeave(client: Socket): Promise<void> {
    const meta = await this.redisService.getSocketMeta(client.id);
    if (!meta) return;

    await this.redisService.removeActiveUser(meta.roomId, meta.username);
    await this.redisService.deleteSocketMeta(client.id);

    const activeUsers = await this.redisService.getActiveUsers(meta.roomId);
    this.server.to(meta.roomId).emit('room:user_left', { username: meta.username, activeUsers });

    client.leave(meta.roomId);
    client.disconnect();
  }
}
