import { HttpException } from '@nestjs/common';
export declare class AppException extends HttpException {
    readonly code: string;
    constructor(status: number, code: string, message: string);
}
