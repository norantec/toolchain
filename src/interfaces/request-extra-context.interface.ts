import { AuthResult } from './auth-result.interface';

export interface RequestExtraContext {
    allowedAuthAdapterNames?: string[] | boolean;
    nextToken?: string;
    requestTraceId?: string;
    scopeIdentifier?: string;
    user?: AuthResult;
}
