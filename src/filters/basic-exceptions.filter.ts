import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class BasicExceptionsFilter extends BaseExceptionFilter {
    public catch(exception: unknown, host: ArgumentsHost) {
        if (exception instanceof Error) {
            console.error('💥 Error name:', exception.name);
            console.error('💬 Error message:', exception.message);
            console.error('📌 Stack trace:\n', exception.stack);
        } else {
            console.error('💥 Unknown exception:', exception);
        }
        super.catch(exception, host);
    }
}
