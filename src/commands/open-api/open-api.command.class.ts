import { Command } from 'commander';
import { CommandFactory } from '../command-factory.class';
import { SCHEMA } from './open-api.constants';

export const OpenApiCommand = CommandFactory.create({
    schema: SCHEMA,
    context: {},
    register: ({ command, callback }) => {
        command.addCommand(
            new Command('open-api')
                .requiredOption('--package-name', 'Name for generated NPM package')
                .requiredOption('--package-version', 'Version for generated NPM package')
                .requiredOption('-t, --bump-type <type>', 'Bump type, e.g. alpha/beta/release')
                .action(callback),
        );
    },
    run: ({ logger, options }) => {},
});
