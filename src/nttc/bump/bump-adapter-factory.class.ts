import * as winston from 'winston';
import { RequiredDeep } from 'type-fest';
import { z } from 'zod';

export class BumpAdapterFactory {
    public static create<T extends z.Schema<any>>({
        schema,
        getVersions,
    }: {
        schema: T;
        getVersions: (
            logger: winston.Logger,
            packageName: string,
            options?: RequiredDeep<z.infer<T>>,
        ) => Promise<string[]>;
    }) {
        return (logger: winston.Logger) => {
            return (packageName: string, options?: any) => {
                return getVersions(logger, packageName, schema.parse(options));
            };
        };
    }
}

export type BumpAdapter = ReturnType<typeof BumpAdapterFactory.create>;
