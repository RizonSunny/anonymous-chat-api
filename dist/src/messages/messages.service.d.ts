import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { messages } from '../database/schema/messages.schema';
import { RedisService } from '../redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';
type MessageRow = typeof messages.$inferSelect;
export interface MessagesPage {
    messages: MessageRow[];
    hasMore: boolean;
    nextCursor: string | null;
}
export declare class MessagesService {
    private readonly db;
    private readonly redisService;
    private readonly roomsService;
    constructor(db: NodePgDatabase<Record<string, never>>, redisService: RedisService, roomsService: RoomsService);
    getMessages(roomId: string, limit: number, before?: string): Promise<MessagesPage>;
    sendMessage(roomId: string, username: string, content: string): Promise<MessageRow>;
}
export {};
