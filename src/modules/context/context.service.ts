import { HEADERS } from '../../constants/headers.constant';
import {
    Inject,
    Injectable,
} from '@nestjs/common';
import {
    NJRS_REQUEST,
    RequestScope,
} from 'nj-request-scope';
import { type RequestWithExtraContext } from '../../types/request-with-extra-context.type';

@Injectable()
@RequestScope()
export class ContextService {
    public constructor(
        @Inject(NJRS_REQUEST)
        private readonly request: RequestWithExtraContext,
    ) {}

    public getRequest() {
        return this.request;
    }

    public getScopeName() {
        return this.request?.[HEADERS.SCOPE];
    }
}
