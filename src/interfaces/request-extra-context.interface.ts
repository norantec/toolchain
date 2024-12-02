import { UserDAO } from '../daos/user.dao.class';

export interface RequestExtraContext {
    legalScopeIdentifiers?: string[];
    requestTraceId?: string;
    scopeIdentifier?: string;
    user?: UserDAO;
}
