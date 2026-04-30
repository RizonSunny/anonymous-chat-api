"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_exception_1 = require("../exceptions/app.exception");
const public_decorator_1 = require("../decorators/public.decorator");
const redis_service_1 = require("../../redis/redis.service");
let SessionGuard = class SessionGuard {
    reflector;
    redisService;
    constructor(reflector, redisService) {
        this.reflector = reflector;
        this.redisService = redisService;
    }
    async canActivate(context) {
        const isPublic = this.reflector.get(public_decorator_1.IS_PUBLIC, context.getHandler());
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            throw new app_exception_1.AppException(401, 'UNAUTHORIZED', 'Missing or expired session token');
        }
        const session = await this.redisService.getSession(token);
        if (!session) {
            throw new app_exception_1.AppException(401, 'UNAUTHORIZED', 'Missing or expired session token');
        }
        request.user = session;
        return true;
    }
};
exports.SessionGuard = SessionGuard;
exports.SessionGuard = SessionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        redis_service_1.RedisService])
], SessionGuard);
//# sourceMappingURL=session.guard.js.map