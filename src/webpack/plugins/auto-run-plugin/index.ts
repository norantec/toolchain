import * as winston from 'winston';
import * as memfs from 'memfs';
import * as webpack from 'webpack';
import { StringUtil } from '../../../utilities/string-util.class';
import { resolve as pathResolve } from 'path';
import { Worker } from 'worker_threads';

export interface AutoRunPluginOptions {
    logger?: winston.Logger;
    parallel?: boolean;
    onAfterStart?: (worker: Worker) => void | Promise<void>;
    onBeforeStart?: () => void | Promise<void>;
}

export class AutoRunPlugin {
    public constructor(
        private readonly options: AutoRunPluginOptions = {},
        private readonly volume: memfs.IFs,
    ) {}

    public apply(compiler: webpack.Compiler) {
        const logger = this?.options?.logger;
        compiler.hooks.beforeCompile.tapAsync('AutoRunPlugin', async (compilationParams, callback) => {
            if (this.options.onBeforeStart) {
                await this.options?.onBeforeStart?.();
            }
            callback();
        });
        compiler.hooks.afterEmit.tapAsync('AutoRunPlugin', async (compilation: webpack.Compilation, callback) => {
            const assets = compilation.getAssets();

            if (assets.length === 0) {
                logger?.warn?.('No output file was found, skipping...');
                callback();
                return;
            }

            const bundledScriptFile = assets?.find?.((item) => item?.name?.endsWith?.('.js'))?.name;

            if (StringUtil.isFalsyString(bundledScriptFile)) {
                logger?.warn?.('No output file was found, skipping...');
                callback();
                return;
            }

            const outputPath = pathResolve(compilation.options.output.path, bundledScriptFile);

            logger?.info?.(`Prepared to run file: ${outputPath}`);

            const worker = new Worker(this.volume.readFileSync(outputPath).toString(), {
                eval: true,
            });

            if (this.options.onAfterStart) {
                await this.options?.onAfterStart?.(worker);
            }

            worker.on('exit', (code) => {
                if (code !== 0) {
                    logger?.error?.(`Process exited with code: ${code}`);
                }
                if (!this.options?.parallel) {
                    callback();
                }
            });
            worker.on('error', (error) => {
                logger?.error?.('Worker error:');
                logger?.error?.(error?.message);
                logger?.error?.(error?.stack);
                if (!this.options?.parallel) {
                    callback();
                }
            });

            if (this.options?.parallel) {
                callback();
            }
        });
    }
}
