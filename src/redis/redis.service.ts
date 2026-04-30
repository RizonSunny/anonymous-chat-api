import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  // Sessions — opaque token → { userId, username }, TTL 24h
  async setSession(token: string, data: { userId: string; username: string }): Promise<void> {
    await this.client.set(`session:${token}`, JSON.stringify(data), 'EX', 86400);
  }

  async getSession(token: string): Promise<{ userId: string; username: string } | null> {
    const raw = await this.client.get(`session:${token}`);
    return raw ? (JSON.parse(raw) as { userId: string; username: string }) : null;
  }

  async deleteSession(token: string): Promise<void> {
    await this.client.del(`session:${token}`);
  }

  // Active users per room — Redis Set, no TTL
  async addActiveUser(roomId: string, username: string): Promise<void> {
    await this.client.sadd(`room:active:${roomId}`, username);
  }

  async removeActiveUser(roomId: string, username: string): Promise<void> {
    await this.client.srem(`room:active:${roomId}`, username);
  }

  async getActiveUsers(roomId: string): Promise<string[]> {
    return this.client.smembers(`room:active:${roomId}`);
  }

  async getActiveUserCount(roomId: string): Promise<number> {
    return this.client.scard(`room:active:${roomId}`);
  }

  // Socket metadata for disconnect cleanup — TTL 1h
  async setSocketMeta(socketId: string, data: { username: string; roomId: string }): Promise<void> {
    await this.client.set(`socket:${socketId}`, JSON.stringify(data), 'EX', 3600);
  }

  async getSocketMeta(socketId: string): Promise<{ username: string; roomId: string } | null> {
    const raw = await this.client.get(`socket:${socketId}`);
    return raw ? (JSON.parse(raw) as { username: string; roomId: string }) : null;
  }

  async deleteSocketMeta(socketId: string): Promise<void> {
    await this.client.del(`socket:${socketId}`);
  }

  // Pub/sub — publish a JSON payload to a channel
  async publish(channel: string, payload: object): Promise<void> {
    await this.client.publish(channel, JSON.stringify(payload));
  }
}
