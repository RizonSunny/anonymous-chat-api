import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { customAlphabet } from 'nanoid';
import { rooms } from '../database/schema/rooms.schema';
import { messages } from '../database/schema/messages.schema';
import { RedisService } from '../redis/redis.service';
import { AppException } from '../common/exceptions/app.exception';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

type RoomRow = typeof rooms.$inferSelect;

export interface RoomWithActiveUsers extends RoomRow {
  activeUsers: number;
}

@Injectable()
export class RoomsService {
  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<Record<string, never>>,
    private readonly redisService: RedisService,
  ) {}

  async findAll(): Promise<RoomWithActiveUsers[]> {
    const rows = await this.db.select().from(rooms);
    return Promise.all(
      rows.map(async (room) => ({
        ...room,
        activeUsers: await this.redisService.getActiveUserCount(room.id),
      })),
    );
  }

  async findById(id: string): Promise<RoomWithActiveUsers> {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.id, id));
    if (!room) {
      throw new AppException(404, 'ROOM_NOT_FOUND', `Room with id ${id} does not exist`);
    }
    const activeUsers = await this.redisService.getActiveUserCount(id);
    return { ...room, activeUsers };
  }

  async create(name: string, createdBy: string): Promise<RoomRow> {
    const [existing] = await this.db.select({ id: rooms.id }).from(rooms).where(eq(rooms.name, name));
    if (existing) {
      throw new AppException(409, 'ROOM_NAME_TAKEN', 'A room with this name already exists');
    }
    const [room] = await this.db
      .insert(rooms)
      .values({ id: `room_${nanoid()}`, name, createdBy })
      .returning();
    return room;
  }

  async delete(id: string, requestingUsername: string): Promise<void> {
    const room = await this.findById(id);
    if (room.createdBy !== requestingUsername) {
      throw new AppException(403, 'FORBIDDEN', 'Only the room creator can delete this room');
    }
    await this.redisService.publish(`room:${id}:deleted`, { roomId: id });
    await this.db.transaction(async (tx) => {
      await tx.delete(messages).where(eq(messages.roomId, id));
      await tx.delete(rooms).where(eq(rooms.id, id));
    });
  }
}
