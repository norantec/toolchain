import { type z } from 'zod';

export interface ServerConfigModuleOptions<S extends z.ZodObject<any>> {
    schema: S;
    onLog?: (message: string) => void;
    onError?: (error: Error) => void;
}

export interface ServerConfigModuleAsyncOptions<S extends z.ZodObject<any>> {
    useFactory: (...args: any[]) => Promise<ServerConfigModuleOptions<S>> | ServerConfigModuleOptions<S>;
    inject?: any[];
}
