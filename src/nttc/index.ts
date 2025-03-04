import { Command } from 'commander';
import * as winston from 'winston';
import { ServiceCommand } from './service/service.command';
import { BumpCommand } from './bump/bump.command';
import { LinkCommand } from './link/link.command';

(async () => {
    const program = new Command('nttc');

    for (const commandGenerator of [ServiceCommand, BumpCommand, LinkCommand]) {
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
        const commandInstance = commandGenerator(logger);
        await commandInstance.register(program);
    }

    program.parse(process.argv);
})();
