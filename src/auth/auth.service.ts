import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  async login(username: string) {
    const user = await this.usersService.findOrCreate(username);
    const token = randomBytes(32).toString('hex');
    await this.redisService.setSession(token, { userId: user.id, username: user.username });
    return {
      sessionToken: token,
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
    };
  }
}
