import { Options as AuthStrategyOptions } from './auth.strategy';

export interface AuthModuleOptions extends AuthStrategyOptions {
    providers?: Array<{
        provide: any;
        useFactory: (options?: AuthModuleOptions, ...args: any[]) => any;
        inject?: any[];
    }>;
}

export interface AuthModuleAsyncOptions {
    useFactory: (...args: any[]) => AuthModuleOptions | Promise<AuthModuleOptions>;
    inject?: any[];
    providers?: Array<{
        provide: any;
        useFactory: (options?: AuthModuleOptions, ...args: any[]) => any;
        inject?: any[];
    }>;
}
