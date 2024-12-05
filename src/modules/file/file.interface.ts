export interface FileModuleOptions {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    region: string;
    staticPrefix: string;
    pathPrefix?: string;
}

export interface FileModuleAsyncOptions {
    useFactory: (...args: any[]) => FileModuleOptions | Promise<FileModuleOptions>;
    inject?: any[];
}
