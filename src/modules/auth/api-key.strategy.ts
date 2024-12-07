import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { KeyService } from '../key/key.service';

export interface ApiKeyStrategyOptions {
    prefix: string;
}

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
    public constructor(
        options: ApiKeyStrategyOptions,
        private readonly keyService: KeyService,
        private readonly contextService: ContextService,
    ) {
        super(
            {
                header: 'Authorization',
                prefix: `${options?.prefix ?? 'API-KEY'} `,
            },
            true,
            async (value, done) => {
                const [
                    id,
                    secret,
                ] = (value ?? '').split(':');
                console.log('LENCONDA:FUCK', id, secret);
                try {
                    const user = await this.keyService.validate({
                        id,
                        secret,
                        scopeIdentifier: this.contextService.getRequest()?.scopeIdentifier,
                        checkScopeName: true,
                    });
                    if (!user) {
                        return done(null, false);
                    } else {
                        return done(null, user);
                    }
                } catch (error) {
                    return done(error);
                }
            },
        );
    }
}
