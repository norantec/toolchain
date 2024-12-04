import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import {
    Injectable,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { KeyService } from '../key/key.service';
import { AuthModuleOptions } from './auth.interface';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
    @Inject(forwardRef(() => KeyService))
    private readonly keyService: KeyService;

    @Inject(forwardRef(() => ContextService))
    private readonly contextService: ContextService;

    public constructor(options: AuthModuleOptions) {
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
