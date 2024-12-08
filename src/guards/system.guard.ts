import { CanActivate } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { RequestWithExtraContext } from '../types/request-with-extra-context.type';
import { CommonExceptionUtil } from '../utilities/common-exception-util.class';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { HEADERS } from '../constants/headers.constant';

export class SystemGuard implements CanActivate {
    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const traceId = uuidv4();
        const request: RequestWithExtraContext = context.switchToHttp().getRequest();
        const response: Response = context.switchToHttp().getResponse();
        const userDTO = request?.user;
        const legalScopeIdentifiers = request?.legalScopeIdentifiers;
        const scopeIdentifier = /^\/api\/v\d+\/(.*)/.exec(request?.path)?.[1];
        request.scopeIdentifier = scopeIdentifier;
        request.requestTraceId = traceId;
        response.setHeader(HEADERS.TRACE_ID, traceId);

        if (
            userDTO?.keys?.length > 0 && (
                !userDTO?.keys?.[0]?.matchScope(scopeIdentifier) ||
                !legalScopeIdentifiers.includes(scopeIdentifier)
            )
        ) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_INSUFFICIENT_KEY_SCOPE, {
                requestedScopes: [scopeIdentifier],
            });
        }

        return true;
    }
}
