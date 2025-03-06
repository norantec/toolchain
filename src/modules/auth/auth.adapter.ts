import { AuthResult } from '../../interfaces/auth-result.interface';
import { StringUtil } from '../../utilities/string-util.class';

export abstract class AuthAdapter {
    public getChallengeValue(rawValue: string) {
        if (StringUtil.isFalsyString(rawValue)) return '';
        return rawValue;
    }

    public abstract validate(challengeValue: string, scopeIdentifier: string): Promise<AuthResult | null>;
}
