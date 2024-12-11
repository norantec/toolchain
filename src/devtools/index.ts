import { Bump } from './bump';
// import { Build } from './build';
import { Setup } from './setup';
import { Command } from 'commander';
import { BuildCommand } from './commands/build.command.class';
import * as winston from 'winston';

const program = new Command('nttc');

program.addCommand(Bump.generateCommand());
// program.addCommand(Build.generateCommand());
program.addCommand(Setup.generateCommand());

[
    BuildCommand,
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
