import { AuthType } from '../enums/auth-type.enum';

export interface AuthResult {
    challengeValue: string;
    identity: string;
    type: AuthType;
    allowedScopePatterns?: string[];
    tokenExpirationTime?: Date;
}
