import { Command } from 'commander';
import { BuildCommand } from './commands/build/build.command.class';
import * as winston from 'winston';
import { BumpCommand } from './commands/bump/bump.command.class';
import { SetupCommand } from './commands/setup/setup.command';

const program = new Command('nttc');

[
    BuildCommand,
    BumpCommand,
    SetupCommand,
].forEach((Command) => {
    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [new winston.transports.Console()],
    });
    const commandInstance = new Command(logger);
    commandInstance.register(program);
});

program.parse(process.argv);
