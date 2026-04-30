import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { rooms } from '../database/schema/rooms.schema';
import { RedisService } from '../redis/redis.service';
type RoomRow = typeof rooms.$inferSelect;
export interface RoomWithActiveUsers extends RoomRow {
    activeUsers: number;
}
export declare class RoomsService {
    private readonly db;
    private readonly redisService;
    constructor(db: NodePgDatabase<Record<string, never>>, redisService: RedisService);
    findAll(): Promise<RoomWithActiveUsers[]>;
    findById(id: string): Promise<RoomWithActiveUsers>;
    create(name: string, createdBy: string): Promise<RoomRow>;
    delete(id: string, requestingUsername: string): Promise<void>;
}
export {};
