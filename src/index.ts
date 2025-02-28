import { Command } from 'commander';
import { BuildCommand } from './commands/build/build.command.class';
import * as winston from 'winston';
import { BumpCommand } from './commands/bump/bump.command.class';
import { LinkCommand } from './commands/link/link.command.class';
import { SDKCommand } from './commands/sdk/sdk.command.class';

const program = new Command('nttc');

[BuildCommand, BumpCommand, LinkCommand, SDKCommand].forEach((Command) => {
    const logger = winston.createLogger({
        level: 'verbose',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.printf(
                (info) =>
                    `${info.timestamp} - ${info.level}: ${info.message}` +
                    (info.splat !== undefined ? `${info.splat}` : ' '),
            ),
        ),
        transports: [new winston.transports.Console()],
    });
    const commandInstance = new Command(logger);
    commandInstance.register(program);
});

program.parse(process.argv);
