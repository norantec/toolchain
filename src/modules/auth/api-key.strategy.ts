import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { KeyService } from '../key/key.service';
import { AuthModuleOptions } from './auth.interface';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
    public constructor(
        options: AuthModuleOptions,
        private readonly keyService: KeyService,
        private readonly contextService: ContextService,
    ) {
        super(
            {
                header: 'Authorization',
                prefix: `${options?.apiKey?.prefix} `,
            },
            true,
            async (value, done) => {
                const [
                    id,
                    secret,
                ] = (value ?? '').split(':');
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
