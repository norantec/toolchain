import { ApiKeyStrategyOptions } from './api-key.strategy';
import { JwtStrategyOptions } from './jwt.strategy';

export interface AuthModuleOptions {
    apiKey: ApiKeyStrategyOptions;
    codeExpirationMinutes: number;
    codeResendDelay: number;
    jwt: JwtStrategyOptions;
    providers?: Array<{
        provide: any;
        useFactory: (options?: AuthModuleOptions, ...args: any[]) => any;
        inject?: any[];
    }>;
}

export interface AuthModuleAsyncOptions {
    useFactory: (...args: any[]) => AuthModuleOptions | Promise<AuthModuleOptions>;
    disableJwt?: boolean;
    disableApiKey?: boolean;
    inject?: any[];
    providers?: Array<{
        provide: any;
        useFactory: (options?: AuthModuleOptions, ...args: any[]) => any;
        inject?: any[];
    }>;
}
