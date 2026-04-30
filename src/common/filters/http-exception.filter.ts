import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';

const HTTP_STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let code: string;
    let message: string;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      const body = exception.getResponse() as { code: string; message: string };
      message = body.message;
    } else if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      const body = exception.getResponse() as
        | { message: string | string[] }
        | string;
      if (typeof body === 'string') {
        message = body;
      } else {
        const raw = body.message;
        message = Array.isArray(raw) ? raw[0] : raw;
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = HTTP_STATUS_CODES[status] ?? 'HTTP_ERROR';
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : (body as { message?: string }).message ?? exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
      console.error('[Unhandled Exception]', request.method, request.url, exception);
    }

    response.status(status).json({
      success: false,
      error: { code, message },
    });
  }
}
