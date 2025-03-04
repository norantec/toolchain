import * as winston from 'winston';
import * as commander from 'commander';
import * as yup from 'yup';
import { RequiredDeep } from 'type-fest';

class CommandState<T> {
    public constructor(public context: T) {}
}

export interface CreateCommandReturn<T> {
    register: (command: commander.Command) => Promise<void>;
    updateContext: (updater: (context: T) => T) => void;
}

export type CommandGenerator<T> = (logger: winston.Logger) => CreateCommandReturn<T>;

export class CommandFactory {
    public static create<T extends yup.ObjectSchema<any>, C>({
        schema,
        context,
        subCommandGenerators: inputSubCommandGenerators,
        register,
        run,
    }: {
        schema: T;
        context: C;
        subCommandGenerators?: CommandGenerator<any>[];
        register: (data: {
            logger: winston.Logger;
            context?: C;
            callback: (options?: RequiredDeep<yup.InferType<T>>) => void | Promise<void>;
        }) => commander.Command | Promise<commander.Command>;
        run?: (data: {
            logger: winston.Logger;
            options?: RequiredDeep<yup.InferType<T>>;
            context?: C;
        }) => void | Promise<void>;
    }): CommandGenerator<C> {
        return (logger) => {
            const commandState = new CommandState<C>(context);
            return {
                register: async (command) => {
                    let subCommandGenerators: CommandGenerator<any>[] = [];

                    if (Array.isArray(inputSubCommandGenerators)) {
                        subCommandGenerators = inputSubCommandGenerators.filter((item) => typeof item === 'function');
                    }

                    const factoryRegisterFn = register.bind(this) as typeof register;
                    const subCommand = await factoryRegisterFn({
                        logger,
                        context: commandState.context,
                        callback: (options) => {
                            run.call(this, {
                                logger,
                                options: schema.cast(options),
                                context: commandState.context,
                            });
                        },
                    });

                    subCommandGenerators.forEach((subCommandGenerator) => {
                        subCommandGenerator(logger)?.register?.(subCommand);
                    });
                    command.addCommand(subCommand);
                },
                updateContext: (updater) => {
                    commandState.context = {
                        ...commandState.context,
                        ...updater?.(commandState.context),
                    };
                },
            };
        };
    }
}
