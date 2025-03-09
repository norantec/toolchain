import * as winston from 'winston';
import * as yup from 'yup';
import { RequiredDeep } from 'type-fest';

export class BumpAdapterFactory {
    public static create<T extends yup.ObjectSchema<any>>({
        schema,
        getVersions,
    }: {
        schema: T;
        getVersions: (
            logger: winston.Logger,
            packageName: string,
            options?: RequiredDeep<yup.InferType<T>>,
        ) => Promise<string[]>;
    }) {
        return (logger: winston.Logger) => {
            return (packageName: string, options?: any) => {
                return getVersions(logger, packageName, schema.cast(options));
            };
        };
    }
}

export type BumpAdapter = ReturnType<typeof BumpAdapterFactory.create>;
