import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppException } from '../exceptions/app.exception';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC, context.getHandler());
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new AppException(401, 'UNAUTHORIZED', 'Missing or expired session token');
    }

    const session = await this.redisService.getSession(token);
    if (!session) {
      throw new AppException(401, 'UNAUTHORIZED', 'Missing or expired session token');
    }

    (request as any).user = session;
    return true;
  }
}
