import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithExtraContext } from '../types/request-with-extra-context.type';
import { StringUtil } from '../utilities/string-util.class';

export const CurrentUserId = createParamDecorator((data: unknown, context: ExecutionContext): any => {
    const request: RequestWithExtraContext = context.switchToHttp().getRequest();
    return StringUtil.isFalsyString(request?.user?.identity) ? null : request?.user?.identity;
});
