import { AuthAdapter } from '../auth.adapter';
import { AuthResult } from '../../../interfaces/auth-result.interface';
import { StringUtil } from '../../../utilities/string-util.class';

export interface Options {
    prefixRegex?: RegExp;
    validator: (
        id: string,
        secret: string,
        scopeIdentifier: string,
    ) => Promise<Omit<AuthResult, 'challengeValue'> | null>;
}

export class HeaderAuthAdapter extends AuthAdapter implements AuthAdapter {
    public constructor(protected readonly options: Options) {
        super();
    }

    public override getChallengeValue(rawValue: string): string {
        let prefixRegex = this.options?.prefixRegex;

        if (!(prefixRegex instanceof RegExp)) {
            prefixRegex = /^API\-KEY\s+(.*)$/;
        }

        const result = prefixRegex.exec(rawValue)?.[1];

        return StringUtil.isFalsyString(result) ? null : result;
    }

    public async validate(challengeValue: string, scopeIdentifier: string): Promise<AuthResult> {
        const [id, secret] = challengeValue.split(':');

        if (StringUtil.isFalsyString(id) || typeof this?.options?.validator !== 'function') {
            return null;
        }

        const validateResult = await this.options.validator(id, secret, scopeIdentifier);

        if (validateResult === null) return null;

        return {
            ...validateResult,
            challengeValue,
        };
    }
}
