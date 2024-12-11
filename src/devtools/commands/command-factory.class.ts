import * as winston from 'winston';
import * as commander from 'commander';
import * as yup from 'yup';
import { RequiredDeep } from 'type-fest';

export class CommandFactory {
    public static create<T extends yup.ObjectSchema<any>, C>({
        schema,
        context,
        register,
        run,
    }: {
        schema: T;
        context: C;
        register: (data: {
            logger: winston.Logger;
            command: commander.Command;
            context?: C;
            callback: (options?: any) => void | Promise<void>;
        }) => void | Promise<void>;
        run: (data: {
            logger: winston.Logger;
            options?: RequiredDeep<yup.InferType<T>>;
            context?: C;
        }) => void | Promise<void>;
    }) {
        return class {
            #context = context;
            #logger: winston.Logger;

            public constructor(logger: winston.Logger) {
                this.#logger = logger;
            }

            public async register(command: commander.Command): Promise<void> {
                return await register.call(
                    this,
                    {
                        logger: this.#logger,
                        command,
                        context: this.#context,
                        callback: (options) => {
                            run.call(this, {
                                logger: this.#logger,
                                options: schema.cast(options),
                                context: this.#context,
                            });
                        },
                    },
                );
            }

            public updateContext(updater: (context: C) => C) {
                this.#context = {
                    ...this.#context,
                    ...updater(this.#context),
                };
            }
        };
    }
}
