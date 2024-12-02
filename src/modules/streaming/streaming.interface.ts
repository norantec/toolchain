export interface StreamingModuleOptions {
    secret?: string;
}

export interface StreamingModuleAsyncOptions {
    useFactory: (...args: any[]) => StreamingModuleOptions | Promise<StreamingModuleOptions>;
    inject?: any[];
}
