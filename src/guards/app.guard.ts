import {
    Injectable,
    CanActivate,
    ExecutionContext,
} from '@nestjs/common';
import { type RequestWithExtraContext } from '../types/request-with-extra-context.type';
import { CommonExceptionUtil } from 'src/utilities/common-exception-util.class';

@Injectable()
export class AppGuard implements CanActivate {
    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: RequestWithExtraContext = context.switchToHttp().getRequest();
        const scopeIdentifier = request?.scopeIdentifier;
        const userDTO = request?.user;
        const legalScopeIdentifiers = request?.legalScopeIdentifiers;

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
