import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthAdapter } from './auth.adapter';
import * as _ from 'lodash';
import { AuthResult } from '../../interfaces/auth-result.interface';
import { RequestWithExtraContext } from '../../types/request-with-extra-context.type';
import { StringUtil } from '../../utilities/string-util.class';

export interface Options {
    adapters?: {
        [key: string]: AuthAdapter;
    };
}

@Injectable()
export class AuthStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'auth') {
    public constructor(protected readonly options: Options) {
        super(
            {
                header: 'Authorization',
            },
            true,
            async (
                value: string,
                done: (error: Error | null, result?: AuthResult | boolean) => void,
                request: RequestWithExtraContext,
            ) => {
                const adapters = this.options?.adapters ?? {};
                const scopeIdentifier = request?.scopeIdentifier;

                if (request?.allowedAuthAdapterNames === false) return done(null, true);
                if (!Object.keys(adapters).length) return done(null, false);

                for (const [adapterName, adapter] of Object.entries(adapters)) {
                    if (
                        !(adapter instanceof AuthAdapter) ||
                        (Array.isArray(request?.allowedAuthAdapterNames) &&
                            !request?.allowedAuthAdapterNames.includes(adapterName))
                    ) {
                        continue;
                    }

                    const challengeValue = _.attempt(() => adapter.getChallengeValue(value));

                    if (_.isError(challengeValue) || StringUtil.isFalsyString(challengeValue)) continue;

                    try {
                        const result = await adapter.validate(challengeValue, scopeIdentifier);

                        if (!result) {
                            return done(null, false);
                        }

                        return done(null, result);
                    } catch (e) {
                        return done(e, false);
                    }
                }

                return done(null, false);
            },
        );
    }
}
