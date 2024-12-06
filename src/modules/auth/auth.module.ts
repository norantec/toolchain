import {
    Global,
    Module,
} from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApiKeyStrategy } from './api-key.strategy';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import {
    AuthModuleAsyncOptions,
    AuthModuleOptions,
} from './auth.interface';
import { AuthController } from './auth.controller';
import { EntityService } from '../entity/entity.service';
import { KeyService } from '../key/key.service';
import { ContextService } from '../context/context.service';
import * as _ from 'lodash';
import { MailService } from '../mail/mail.service';
import { LoggerService } from '../logger/logger.service';

const passportModuleInstance = PassportModule.register({
    defaultStrategy: [
        'api-key',
        'jwt',
    ],
});

@Global()
@Module({})
export class AuthModule {
    public static forRoot(options: AuthModuleOptions) {
        return {
            module: AuthModule,
            imports: [passportModuleInstance],
            providers: [
                {
                    provide: JwtStrategy,
                    useFactory: (entityService: EntityService) => new JwtStrategy(options, entityService),
                    inject: [EntityService],
                },
                {
                    provide: ApiKeyStrategy,
                    useFactory: (keyService: KeyService, contextService: ContextService) => new ApiKeyStrategy(options, keyService, contextService),
                    inject: [KeyService, ContextService],
                },
                {
                    provide: AuthService,
                    useFactory: (
                        mailService: MailService,
                        entityService: EntityService,
                        loggerService: LoggerService,
                    ) => new AuthService(
                        options,
                        mailService,
                        entityService,
                        loggerService,
                    ),
                    inject: [
                        MailService,
                        EntityService,
                        LoggerService,
                    ],
                },
            ],
            exports: [
                ApiKeyStrategy,
                JwtStrategy,
                AuthService,
                passportModuleInstance,
            ],
            controllers: [AuthController],
        };
    }

    public static forRootAsync(asyncOptions: AuthModuleAsyncOptions) {
        return {
            module: AuthModule,
            imports: [
                PassportModule.register({
                    defaultStrategy: [
                        'api-key',
                        'jwt',
                    ],
                }),
            ],
            providers: [
                {
                    provide: JwtStrategy,
                    useFactory: async (...args) => {
                        const options = await asyncOptions.useFactory(...args.slice(0, -1));
                        return new JwtStrategy(options, _.last(args));
                    },
                    inject: (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []).concat([
                        EntityService,
                    ]),
                },
                {
                    provide: ApiKeyStrategy,
                    useFactory: async (...args) => {
                        const options = await asyncOptions.useFactory(...args.slice(0, -2));
                        return new ApiKeyStrategy(
                            options,
                            _.last(args.slice(0, -1)),
                            _.last(args),
                        );
                    },
                    inject: (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []).concat([
                        KeyService,
                        ContextService,
                    ]),
                },
                {
                    provide: AuthService,
                    useFactory: async (...args) => {
                        const options = await asyncOptions.useFactory(...args.slice(0, -3));
                        return new AuthService(
                            options,
                            _.last(args.slice(0, -2)),
                            _.last(args.slice(0, -1)),
                            _.last(args),
                        );
                    },
                    inject: (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []).concat([
                        MailService,
                        EntityService,
                        LoggerService,
                    ]),
                },
            ],
            exports: [
                ApiKeyStrategy,
                JwtStrategy,
                AuthService,
                passportModuleInstance,
            ],
            controllers: [AuthController],
        };
    }
}
