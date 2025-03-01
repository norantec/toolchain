import * as webpack from 'webpack';
import * as winston from 'winston';
import { Worker } from 'worker_threads';

export class RunOncePlugin {
    public constructor(private readonly logger: winston.Logger) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(RunOncePlugin.name, (compilation) => {
            compilation.hooks.processAssets.tapAsync(
                {
                    name: RunOncePlugin.name,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                (assets, callback) => {
                    const targetAsset = Object.entries(assets)?.find?.(([pathname]) => pathname?.endsWith?.('.js'));

                    if (!targetAsset) {
                        throw new Error('Not found any JS bundle file, exitting...');
                    }

                    this.logger.info(`Found bundle file: ${targetAsset?.[0]}, executing...`);

                    const worker = new Worker(targetAsset?.[1]?.buffer?.()?.toString?.(), {
                        eval: true,
                    });

                    worker.on('exit', (code) => {
                        if (code !== 0) {
                            this.logger?.error?.(`Process exited with code: ${code}`);
                        }
                        callback();
                    });

                    worker.on('error', (error) => {
                        this?.logger?.error?.('Worker error:');
                        this?.logger?.error?.(error?.message);
                        this?.logger?.error?.(error?.stack);
                        callback(error);
                    });
                },
            );
        });
    }
}
