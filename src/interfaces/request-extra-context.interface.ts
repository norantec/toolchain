import { Result } from '../abstract-classes/auth-adapter.abstract.class';

export interface RequestExtraContext {
    methodName: string;
    traceId: string;
    user?: Result;
}
