import { AuthAdapter } from '../auth.adapter';
import * as jwt from 'jsonwebtoken';
import { AuthResult } from '../../../interfaces/auth-result.interface';
import { AuthType } from '../../../enums/auth-type.enum';
import { StringUtil } from '../../../utilities/string-util.class';

export interface Options {
    audience: string;
    expirationDays: number;
    issuer: string;
    secret: string;
    ignoreExpiration?: boolean;
}

export class JwtAuthAdapter extends AuthAdapter implements AuthAdapter {
    public constructor(protected readonly options: Options) {
        super();
    }

    public override getChallengeValue(rawValue: string): string {
        const result = /^Bearer\s+(.*)$/.exec(rawValue)?.[1];
        return StringUtil.isFalsyString(result) ? null : result;
    }

    public async validate(challengeValue: string): Promise<AuthResult> {
        const [apiKeyId, apiKeySecret] = challengeValue.split(':');

        if (StringUtil.isFalsyString(apiKeyId) || StringUtil.isFalsyString(apiKeySecret)) {
            return null;
        }

        const payload = jwt.verify(challengeValue, this.options.secret);
        let result: string | Error;
        let tokenExpirationTime: Date;

        if (typeof payload === 'string' && !StringUtil.isFalsyString(payload)) {
            result = payload;
        } else {
            const currentPayload = payload as jwt.JwtPayload;
            tokenExpirationTime = new Date(currentPayload.exp);
            result = currentPayload.sub;
        }

        if (StringUtil.isFalsyString(result)) return null;

        return {
            type: AuthType.JWT,
            identity: result as string,
            tokenExpirationTime,
            challengeValue,
        };
    }
}
