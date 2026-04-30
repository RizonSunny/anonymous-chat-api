import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
export declare class ResponseInterceptor implements NestInterceptor {
    intercept(_ctx: ExecutionContext, next: CallHandler): import("rxjs").Observable<{
        success: boolean;
        data: any;
    }>;
}
