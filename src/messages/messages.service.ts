import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { customAlphabet } from 'nanoid';
import { messages } from '../database/schema/messages.schema';
import { RedisService } from '../redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';
import { AppException } from '../common/exceptions/app.exception';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

type MessageRow = typeof messages.$inferSelect;

export interface MessagesPage {
  messages: MessageRow[];
  hasMore: boolean;
  nextCursor: string | null;
}

@Injectable()
export class MessagesService {
  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<Record<string, never>>,
    private readonly redisService: RedisService,
    private readonly roomsService: RoomsService,
  ) {}

  async getMessages(roomId: string, limit: number, before?: string): Promise<MessagesPage> {
    await this.roomsService.findById(roomId);

    let rows: MessageRow[];

    if (before) {
      const [cursor] = await this.db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.id, before));

      rows = await this.db
        .select()
        .from(messages)
        .where(and(eq(messages.roomId, roomId), lt(messages.createdAt, cursor.createdAt)))
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1);
    } else {
      rows = await this.db
        .select()
        .from(messages)
        .where(eq(messages.roomId, roomId))
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1);
    }

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    const nextCursor = hasMore ? page[0].id : null;

    return { messages: page, hasMore, nextCursor };
  }

  async sendMessage(roomId: string, username: string, content: string): Promise<MessageRow> {
    await this.roomsService.findById(roomId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new AppException(422, 'MESSAGE_EMPTY', 'Message content must not be empty');
    }
    if (trimmed.length > 1000) {
      throw new AppException(422, 'MESSAGE_TOO_LONG', 'Message content must not exceed 1000 characters');
    }

    const [message] = await this.db
      .insert(messages)
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
}
