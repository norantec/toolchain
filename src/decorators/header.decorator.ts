import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';
import { HeaderUtil } from '../utilities/header-util.class';

export const Header = createParamDecorator((data: string, context: ExecutionContext): any => {
    const request = context.switchToHttp().getRequest<Request>();
    const parsedHeader = HeaderUtil.parse(request?.headers ?? {});
    return parsedHeader.getValue(data);
});
