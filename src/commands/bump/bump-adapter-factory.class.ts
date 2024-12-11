import * as winston from 'winston';
import * as commander from 'commander';
import * as yup from 'yup';
import { RequiredDeep } from 'type-fest';

export class BumpAdapterFactory {
    public static create<T extends yup.ObjectSchema<any>>({
        schema,
        register,
        getVersions,
    }: {
        schema: T;
        getVersions: (logger: winston.Logger, packageName: string, options?: RequiredDeep<yup.InferType<T>>) => Promise<string[]>;
        register: () => commander.Command;
    }) {
        return class {
            #logger: winston.Logger;

            public constructor(logger: winston.Logger) {
                this.#logger = logger;
            }

            public register() {
                return register.call(this);
            }

            public async getVersions(packageName: string, options?: any) {
                return getVersions.call(this, this.#logger, packageName, schema.cast(options));
            }
        };
    }
}

export type BumpAdapter = ReturnType<typeof BumpAdapterFactory.create>;
