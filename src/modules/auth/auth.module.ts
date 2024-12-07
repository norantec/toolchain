import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import {
    ApiKeyStrategy,
    ApiKeyStrategyOptions,
} from './api-key.strategy';
import {
    JwtStrategy,
    JwtStrategyOptions,
} from './jwt.strategy';
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

const passportModule = PassportModule.register({
    defaultStrategy: [
        'api-key',
        'jwt',
    ],
});

@Module({})
export class AuthModule {
    public static forRoot(options: AuthModuleOptions) {
        return {
            global: true,
            module: AuthModule,
            imports: [
                passportModule,
            ],
            providers: [
                ...(
                    options?.jwt !== null
                        ? [
                            {
                                provide: JwtStrategy,
                                useFactory: (entityService: EntityService) => new JwtStrategy(
                                    (options?.jwt as JwtStrategyOptions),
                                    entityService,
                                ),
                                inject: [EntityService],
                            },
                        ]
                        : []
                ),
                ...(
                    options?.apiKey !== null
                        ? [
                            {
                                provide: ApiKeyStrategy,
                                useFactory: (keyService: KeyService, contextService: ContextService) => new ApiKeyStrategy(
                                    (options?.apiKey as ApiKeyStrategyOptions),
                                    keyService,
                                    contextService,
                                ),
                                inject: [KeyService, ContextService],
                            },
                        ]
                        : []
                ),
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
                ...(Array.isArray(options?.providers) ? options.providers : []).map((provider) => {
                    return {
                        provide: provider.provide,
                        useFactory: (...args) => provider.useFactory(options, ...args),
                        inject: provider.inject,
                    };
                }),
            ],
            exports: [
                JwtStrategy,
                ApiKeyStrategy,
                AuthService,
                passportModule,
            ],
            controllers: [AuthController],
        };
    }

    public static forRootAsync(asyncOptions: AuthModuleAsyncOptions) {
        return {
            global: true,
            module: AuthModule,
            imports: [
                passportModule,
            ],
            providers: [
                ...(
                    !asyncOptions.disableJwt
                        ? [
                            {
                                provide: JwtStrategy,
                                useFactory: async (...args) => {
                                    const options = await asyncOptions.useFactory(...args.slice(0, -1));
                                    return new JwtStrategy(options?.jwt, _.last(args));
                                },
                                inject: (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []).concat([
                                    EntityService,
                                ]),
                            },
                        ]
                        : []
                ),
                ...(
                    !asyncOptions.disableApiKey
                        ? [
                            {
                                provide: ApiKeyStrategy,
                                useFactory: async (...args) => {
                                    const options = await asyncOptions.useFactory(...args.slice(0, -2));
                                    return new ApiKeyStrategy(
                                        options?.apiKey,
                                        _.last(args.slice(0, -1)),
                                        _.last(args),
                                    );
                                },
                                inject: (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []).concat([
                                    KeyService,
                                    ContextService,
                                ]),
                            },
                        ]
                        : []
                ),
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
                ...(Array.isArray(asyncOptions.providers) ? asyncOptions.providers : []).map((provider) => {
                    const asyncInject = (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []);
                    return {
                        provide: provider.provide,
                        useFactory: async (...args) => {
                            return provider.useFactory(
                                await asyncOptions.useFactory(...args.slice(0, asyncInject.length)),
                                ...args.slice(asyncInject.length),
                            );
                        },
                        inject: asyncInject.concat(Array.isArray(provider.inject) ? provider.inject : []),
                    };
                }),
            ],
            exports: [
                JwtStrategy,
                ApiKeyStrategy,
                AuthService,
                passportModule,
            ],
            controllers: [AuthController],
        };
    }
}
