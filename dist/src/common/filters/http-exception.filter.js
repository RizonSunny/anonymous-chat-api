"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const app_exception_1 = require("../exceptions/app.exception");
const HTTP_STATUS_CODES = {
    [common_1.HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [common_1.HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [common_1.HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [common_1.HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [common_1.HttpStatus.CONFLICT]: 'CONFLICT',
    [common_1.HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
    [common_1.HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status;
        let code;
        let message;
        if (exception instanceof app_exception_1.AppException) {
            status = exception.getStatus();
            code = exception.code;
            const body = exception.getResponse();
            message = body.message;
        }
        else if (exception instanceof common_1.BadRequestException) {
            status = common_1.HttpStatus.BAD_REQUEST;
            code = 'VALIDATION_ERROR';
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
            }
            else {
                const raw = body.message;
                message = Array.isArray(raw) ? raw[0] : raw;
            }
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            code = HTTP_STATUS_CODES[status] ?? 'HTTP_ERROR';
            const body = exception.getResponse();
            message =
                typeof body === 'string'
                    ? body
                    : body.message ?? exception.message;
        }
        else {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            code = 'INTERNAL_ERROR';
            message = 'An unexpected error occurred';
            console.error('[Unhandled Exception]', request.method, request.url, exception);
        }
        response.status(status).json({
            success: false,
            error: { code, message },
        });
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map