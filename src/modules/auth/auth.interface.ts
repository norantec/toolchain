import { ApiKeyStrategyOptions } from './api-key.strategy';
import { JwtStrategyOptions } from './jwt.strategy';

export interface AuthModuleOptions {
    apiKey: ApiKeyStrategyOptions | false;
    codeExpirationMinutes: number;
    codeResendDelay: number;
    jwt: JwtStrategyOptions | false;
    providers?: Array<{
        provide: any;
        useFactory: (options?: AuthModuleOptions, ...args: any[]) => any;
        inject?: any[];
    }>;
}

interface AuthModuleAsyncOptionsReturn extends Omit<AuthModuleOptions, 'jwt' | 'apiKey' | 'providers'> {
    jwt: JwtStrategyOptions;
    apiKey: ApiKeyStrategyOptions;
}

export interface AuthModuleAsyncOptions {
    useFactory: (...args: any[]) => AuthModuleAsyncOptionsReturn | Promise<AuthModuleAsyncOptionsReturn>;
    disableJwt?: boolean;
    disableApiKey?: boolean;
    inject?: any[];
    providers?: Array<{
        provide: any;
        useFactory: (options?: AuthModuleAsyncOptionsReturn, ...args: any[]) => any;
        inject?: any[];
    }>;
}
