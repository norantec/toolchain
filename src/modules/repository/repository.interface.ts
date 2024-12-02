export interface RepositoryModuleOptions {
    accessToken: string;
    authorName: string;
    authorEmail: string;
    onLog?: (message: string) => void;
    onError?: (error: Error) => void;
}

export interface RepositoryModuleAsyncOptions {
    useFactory: (...args: any[]) => Promise<RepositoryModuleOptions> | RepositoryModuleOptions;
    inject?: any[];
}
