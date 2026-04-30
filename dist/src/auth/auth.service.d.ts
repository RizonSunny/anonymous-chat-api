import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly redisService;
    constructor(usersService: UsersService, redisService: RedisService);
    login(username: string): Promise<{
        sessionToken: string;
        user: {
            id: string;
            username: string;
            createdAt: Date;
        };
    }>;
}
