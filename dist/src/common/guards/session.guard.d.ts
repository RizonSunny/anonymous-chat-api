import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
export declare class SessionGuard implements CanActivate {
    private readonly reflector;
    private readonly redisService;
    constructor(reflector: Reflector, redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
