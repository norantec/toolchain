export interface UploadModuleOptions {
    accessKeyId: string;
    accessKeySecret: string;
    roleArn: string;
}

export interface UploadModuleAsyncOptions {
    useFactory: (...args: any[]) => Promise<UploadModuleOptions>;
    inject?: any[];
}
