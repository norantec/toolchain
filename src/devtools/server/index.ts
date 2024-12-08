import { spawn } from 'child_process';
import { Command } from 'commander';
import * as path from 'path';
import * as yup from 'yup';

export interface ServerOptions {
    delay?: number;
    script?: string;
}

export class Server {
    public static generateCommand() {
        const command = new Command('server');
        const startCommand = new Command('start');

        startCommand
            .option('-d, --delay <number>', 'the delay time', '1')
            .option('-s, --script <path>', 'the script to start', 'dist/main.js')
            .action((options) => {
                const server = new Server(options);
                server.start();
            });

        command.addCommand(startCommand);

        return command;
    }

    private options: Required<ServerOptions>;

    public constructor(options: ServerOptions) {
        const schema = yup.object({
            delay: yup.number().default(1),
            script: yup.string().default('dist/main.js'),
        });
        this.options = schema.cast(options) as Required<ServerOptions>;
        this.options.script = path.resolve(process.cwd(), this.options.script);
    }

    public start() {
        const tspcProcess = spawn('tspc', ['--watch'], {
            shell: true,
            stdio: 'inherit',
        });
        const nodemonProcess = spawn('nodemon', [
            '--watch', path.dirname(this.options.script),
            '--delay', this.options.delay.toString(),
            this.options.script,
        ], {
            shell: true,
            stdio: 'inherit',
        });
        tspcProcess.on('exit', (code) => {
            console.log(`tspc exitted with code: ${code}`);
            nodemonProcess.kill();
            process.exit(code);
        });
        nodemonProcess.on('exit', (code) => {
            console.log(`nodemon exitted with code: ${code}`);
            tspcProcess.kill();
            process.exit(code);
        });
        process.on('SIGTERM', () => {
            tspcProcess.kill();
            nodemonProcess.kill();
        });

        process.on('SIGINT', () => {
            tspcProcess.kill();
            nodemonProcess.kill();
        });
    }
}
