import {
    Injectable,
    CanActivate,
    ExecutionContext,
} from '@nestjs/common';
import * as _ from 'lodash';
import { type RequestWithExtraContext } from '../types/request-with-extra-context.type';

@Injectable()
export class ScopeGuard implements CanActivate {
    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: RequestWithExtraContext = context.switchToHttp().getRequest();
        request.scopeIdentifier = _.last(request?.url?.split('/'));
        return true;
    }
}
