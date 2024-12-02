import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { type Request } from 'express';
import { HeaderUtil } from '../utilities/header-util.class';
import { HEADERS } from '../constants/headers.constant';

export const CurrentLocale = createParamDecorator((scopes: string[], context: ExecutionContext): any => {
    const request = context.switchToHttp().getRequest<Request>();
    const parsedHeader = HeaderUtil.parse(request?.headers ?? {});
    return parsedHeader.getValue(HEADERS.LOCALE) || 'en-US';
});
