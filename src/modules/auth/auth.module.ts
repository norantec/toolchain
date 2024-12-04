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

@Global()
@Module({})
export class AuthModule {
    public static forRoot(options: AuthModuleOptions) {
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
                    useFactory: () => new JwtStrategy(options),
                },
                {
                    provide: ApiKeyStrategy,
                    useFactory: () => new ApiKeyStrategy(options),
                },
                {
                    provide: AuthService,
                    useFactory: () => new AuthService(options),
                },
            ],
            exports: [
                ApiKeyStrategy,
                JwtStrategy,
                AuthService,
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
                        const options = await asyncOptions.useFactory(...args);
                        return new JwtStrategy(options);
                    },
                    inject: asyncOptions.inject || [],
                },
                {
                    provide: ApiKeyStrategy,
                    useFactory: async (...args) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new ApiKeyStrategy(options);
                    },
                    inject: asyncOptions.inject || [],
                },
                {
                    provide: AuthService,
                    useFactory: async (...args) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new AuthService(options);
                    },
                    inject: asyncOptions.inject || [],
                },
            ],
            exports: [
                ApiKeyStrategy,
                JwtStrategy,
                AuthService,
            ],
            controllers: [AuthController],
        };
    }
}
