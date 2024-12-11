import * as winston from 'winston';
import * as commander from 'commander';
import * as yup from 'yup';
import { ClassType } from '../../types/class-type.type';
import { RequiredDeep } from 'type-fest';

// type Constructor<T extends yup.ObjectSchema<any>> = new (logger: winston.Logger, schema: T) => CommandConstructor<T>;

export abstract class CommandFactory<T extends yup.ObjectSchema<any>, C> {
    public static create<T1 extends yup.ObjectSchema<any>, C1>({
        schema,
        context,
        register,
        run,
    }: {
        schema: T1;
        context: C1;
        register: CommandFactory<T1, C1>['register'];
        run: CommandFactory<T1, C1>['run'];
    }): ClassType<CommandFactory<T1, C1>> {
        return class extends CommandFactory<T1, C1> implements CommandFactory<T1, C1> {
            private readonly context = context;

            public constructor(logger: winston.Logger) {
                super(logger, schema);
            }

            public register(command: commander.Command): void | Promise<void> {
                return register.call(this, command, this.callback.bind(this));
            }

            public run(options?: RequiredDeep<yup.InferType<T1>>, context?: C1): void | Promise<void> {
                return run.call(this, options, context);
            }

            protected async callback(options?: any) {
                this.run(this.schema.cast(options), this.context);
            }
        };
    }

    public constructor(
        protected readonly logger: winston.Logger,
        protected readonly schema: T,
    ) {}

    public abstract register(command: commander.Command, callback: (options?: any) => void | Promise<void>): void | Promise<void>;
    protected abstract run(options?: RequiredDeep<yup.InferType<T>>, context?: C): void | Promise<void>;
}

// export class CommandFactory {
//     public static create<T extends ClassType<Command>>(Clazz: T, logger: winston.Logger, schema: yup.ObjectSchema<any>): Command {
//         return new Clazz(logger, schema);
//     }
// }
