import Redis from 'ioredis';
export declare class RedisService {
    private readonly client;
    constructor(client: Redis);
    setSession(token: string, data: {
        userId: string;
        username: string;
    }): Promise<void>;
    getSession(token: string): Promise<{
        userId: string;
        username: string;
    } | null>;
    deleteSession(token: string): Promise<void>;
    addActiveUser(roomId: string, username: string): Promise<void>;
    removeActiveUser(roomId: string, username: string): Promise<void>;
    getActiveUsers(roomId: string): Promise<string[]>;
    getActiveUserCount(roomId: string): Promise<number>;
    setSocketMeta(socketId: string, data: {
        username: string;
        roomId: string;
    }): Promise<void>;
    getSocketMeta(socketId: string): Promise<{
        username: string;
        roomId: string;
    } | null>;
    deleteSocketMeta(socketId: string): Promise<void>;
    publish(channel: string, payload: object): Promise<void>;
}
