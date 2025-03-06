import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthModuleAsyncOptions, AuthModuleOptions } from './auth.interface';
import { AuthStrategy } from './auth.strategy';

const passportModule = PassportModule.register({
    defaultStrategy: ['auth'],
});

@Module({})
export class AuthModule {
    public static forRoot(options: AuthModuleOptions) {
        return {
            global: true,
            module: AuthModule,
            imports: [passportModule],
            providers: [
                {
                    provide: AuthStrategy,
                    useFactory: () => {
                        return new AuthStrategy(options);
                    },
                    inject: [],
                },
                ...(Array.isArray(options?.providers) ? options.providers : []).map((provider) => {
                    return {
                        provide: provider.provide,
                        useFactory: (...args) => provider.useFactory(options, ...args),
                        inject: provider.inject,
                    };
                }),
            ],
            exports: [AuthStrategy, passportModule],
        };
    }

    public static forRootAsync(asyncOptions: AuthModuleAsyncOptions) {
        return {
            global: true,
            module: AuthModule,
            imports: [passportModule],
            providers: [
                {
                    provide: AuthStrategy,
                    useFactory: async (...args) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new AuthStrategy(options);
                    },
                    inject: Array.isArray(asyncOptions.inject) ? asyncOptions.inject : [],
                },
                ...(Array.isArray(asyncOptions.providers) ? asyncOptions.providers : []).map((provider) => {
                    const asyncInject = Array.isArray(asyncOptions.inject) ? asyncOptions.inject : [];
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
            exports: [AuthStrategy, passportModule],
        };
    }
}
