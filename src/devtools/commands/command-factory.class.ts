import * as winston from 'winston';
import * as commander from 'commander';
import * as yup from 'yup';
// import { ClassType } from '../../types/class-type.type';
import { RequiredDeep } from 'type-fest';

// type Constructor<T extends yup.ObjectSchema<any>> = new (logger: winston.Logger, schema: T) => CommandConstructor<T>;

export abstract class CommandFactory {
    public static create<T1 extends yup.ObjectSchema<any>, C1>({
        schema,
        context,
        register,
        run,
    }: {
        schema: T1;
        context: C1;
        register: (command: commander.Command, callback: (options?: any) => void | Promise<void>) => void | Promise<void>;
        run: (options?: RequiredDeep<yup.InferType<T1>>, context?: C1) => void | Promise<void>;
    }) {
        return class {
            readonly #context = context;
            #logger: winston.Logger;

            public constructor(logger: winston.Logger) {
                this.#logger = logger;
            }

            public register(command: commander.Command): void | Promise<void> {
                return register.call(
                    this,
                    command,
                    (options) => {
                        this.run(this.#logger, schema.cast(options), this.#context);
                    },
                );
            }

            public run(logger: winston.Logger, options?: RequiredDeep<yup.InferType<T1>>, context?: C1): void | Promise<void> {
                return run.call(this, logger, options, context);
            }
        };
    }

    // public abstract register(command: commander.Command, callback: (options?: any) => void | Promise<void>): void | Promise<void>;
    // protected abstract run(options?: RequiredDeep<yup.InferType<T>>, context?: C): void | Promise<void>;
}

// export class CommandFactory {
//     public static create<T extends ClassType<Command>>(Clazz: T, logger: winston.Logger, schema: yup.ObjectSchema<any>): Command {
//         return new Clazz(logger, schema);
//     }
// }
