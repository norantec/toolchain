export interface RepositoryModuleOptions {
    accessToken: string;
    authorName: string;
    authorEmail: string;
}

export interface RepositoryModuleAsyncOptions {
    useFactory: (...args: any[]) => Promise<RepositoryModuleOptions> | RepositoryModuleOptions;
    inject?: any[];
}
