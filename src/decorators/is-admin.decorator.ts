import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { type RequestWithExtraContext } from '../types/request-with-extra-context.type';

export const IsAdmin = createParamDecorator((data: unknown, context: ExecutionContext): any => {
    const request: RequestWithExtraContext = context.switchToHttp().getRequest();
    return request?.scopeIdentifier?.startsWith?.('admin.');
});
