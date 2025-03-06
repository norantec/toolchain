import { CanActivate } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { RequestWithExtraContext } from '../types/request-with-extra-context.type';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { HEADERS } from '../constants/headers.constant';
import { METADATA_NAMES } from '../constants/metadata-names.constant';

export class SystemHeadGuard implements CanActivate {
    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const traceId = uuidv4();
        const request: RequestWithExtraContext = context.switchToHttp().getRequest();
        const response: Response = context.switchToHttp().getResponse();
        const scopeIdentifier = /^\/api\/v\d+\/(.*)/.exec(request?.path)?.[1];
        const allowedAuthAdapterNames: string[] | boolean = Reflect.getMetadata(
            METADATA_NAMES.METHOD_AUTH_ADAPTERS,
            context.getClass(),
            context.getHandler()?.name,
        );
        request.scopeIdentifier = scopeIdentifier;
        request.requestTraceId = traceId;
        request.allowedAuthAdapterNames = allowedAuthAdapterNames;
        response.setHeader(HEADERS.TRACE_ID, traceId);
        return true;
    }
}
