export interface AuthModuleOptions {
    apiKey: {
        prefix: string;
    };
    codeExpirationMinutes: number;
    codeResendDelay: number;
    jwt: {
        audience: string;
        expirationDays: number;
        issuer: string;
        secret: string;
        ignoreExpiration?: boolean;
    };
}

export interface AuthModuleAsyncOptions {
    useFactory: (...args: any[]) => AuthModuleOptions | Promise<AuthModuleOptions>;
    inject?: any[];
}
