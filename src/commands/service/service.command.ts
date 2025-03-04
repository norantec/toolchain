import { Command } from 'commander';
import { CommandFactory } from '../../factories/command.factory';
import { BuildCommand } from './commands/build/build.command';
import { SDKCommand } from './commands/sdk/sdk.command';

export const ServiceCommand = CommandFactory.create({
    schema: null,
    context: {},
    subCommandGenerators: [BuildCommand, SDKCommand],
    register: ({ callback }) => {
        return new Command('service').action(callback);
    },
});
