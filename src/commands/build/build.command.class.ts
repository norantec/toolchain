/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-this-alias */
import { Volume } from 'memfs';
import { ufs } from 'unionfs';
import { Module } from 'module';
import * as fs from 'fs-extra';
import * as fs1 from 'fs';
import { dirname as pathDirname, resolve as pathResolve } from 'path';

const SYNC_WRITE_METHODS = [
    'writeFile',
    'writeFileSync',
    'appendFile',
    'appendFileSync',
    'mkdir',
    'mkdirSync',
    'rmdir',
    'rmdirSync',
    'unlink',
    'unlinkSync',
];
const PROMISE_WRITE_METHODS = ['writeFile', 'appendFile', 'mkdir', 'rmdir', 'unlink'];
let interceptWriting = false;
const volume = Volume.fromJSON({});

ufs.use(fs1).use(volume as unknown as typeof fs1);

// @ts-ignore
const originalModuleLoad = Module._load;

// @ts-ignore
Module._load = (request, parent, isMain) => {
    if (!['fs', 'node:fs', 'fs/promises', 'node:fs/promises'].includes(request)) {
        return originalModuleLoad(request, parent, isMain);
    }

    const promiseFs = {
        ...ufs.promises,
        ...PROMISE_WRITE_METHODS.reduce((result, methodName) => {
            result[methodName] = interceptWriting
                ? async (...args) => {
                      return volume.promises[methodName](...args);
                  }
                : ufs.promises[methodName];
            return result;
        }, {}),
        constants: fs1.promises.constants,
    };
    const fs = {
        ...ufs,
        promises: promiseFs,
        ...SYNC_WRITE_METHODS.reduce((result, methodName) => {
            result[methodName] = interceptWriting
                ? (...args) => {
                      return volume[methodName](...args);
                  }
                : ufs[methodName];
            return result;
        }, {}),
        constants: fs1.constants,
    };

    if (request === 'fs' || request === 'node:fs') {
        return fs;
    }

    if (request === 'fs/promises' || request === 'node:fs/promises') {
        return promiseFs;
    }
};

import * as webpack from 'webpack';
import { Command } from 'commander';
import * as yup from 'yup';
import * as childProcess from 'child_process';
import { StringUtil } from '../../utilities/string-util.class';
import * as _ from 'lodash';
import { CommandFactory } from '../command-factory.class';
import * as winston from 'winston';

class CatchNotFoundPlugin {
    public constructor(private logger?: winston.Logger) {}

    public apply(resolver) {
        const resolve = resolver.resolve;
        const logger = this.logger;
        resolver.resolve = function (context, path, request, resolveContext, callback) {
            const self = this;
            resolve.call(self, context, path, request, resolveContext, (error, innerPath, result) => {
                const notfoundPathname = pathResolve(__dirname, '../../../') + `/preserved/@@notfound.js?${request}`;
                if (result) {
                    return callback(null, innerPath, result);
                }
                if (error && !error.message.startsWith("Can't resolve")) {
                    return callback(error);
                }
                // Allow .js resolutions to .tsx? from .tsx?
                if (
                    request.endsWith('.js') &&
                    context.issuer &&
                    (context.issuer.endsWith('.ts') || context.issuer.endsWith('.tsx'))
                ) {
                    return resolve.call(
                        self,
                        context,
                        path,
                        request.slice(0, -3),
                        resolveContext,
                        (error1, innerPath, result) => {
                            if (result) return callback(null, innerPath, result);
                            if (error1 && !error1.message.startsWith("Can't resolve")) return callback(error1);
                            // make not found errors runtime errors
                            callback(null, notfoundPathname, request);
                        },
                    );
                }
                logger?.warn?.(`Notfound '${context.issuer}' from '${request}', skipping...`);
                // make not found errors runtime errors
                callback(null, notfoundPathname, request);
            });
        };
    }
}

interface AutoRunPluginOptions {
    logger?: winston.Logger;
    parallel?: boolean;
    onAfterStart?: (childProcess: childProcess.ChildProcess) => void | Promise<void>;
    onBeforeStart?: () => void | Promise<void>;
}

class AutoRunPlugin {
    public constructor(private options: AutoRunPluginOptions = {}) {}

    public apply(compiler: webpack.Compiler) {
        const logger = this?.options?.logger;
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

            if (this.options.onBeforeStart) {
                await this.options?.onBeforeStart?.();
            }

            const child = childProcess.spawn('node', [outputPath], {
                stdio: 'inherit',
            });

            if (this.options.onAfterStart) {
                await this.options?.onAfterStart?.(child);
            }

            if (!this.options?.parallel) {
                child.on('close', (code) => {
                    if (code !== 0) {
                        logger?.error?.(`Process exited with code: ${code}`);
                    }
                    callback();
                });
            } else {
                callback();
            }
        });
    }
}

class CleanPlugin {
    public constructor(private readonly outputJsPathname: string) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('CleanPlugin', (compilation) => {
            compilation.hooks.processAssets.tap('CleanPlugin', (assets) => {
                Object.keys(assets).forEach((key) => {
                    if (pathResolve(pathDirname(this.outputJsPathname), key) !== this.outputJsPathname) {
                        _.unset(assets, key);
                    }
                });
            });
        });
    }
}

class BinaryPlugin {
    public constructor(
        private readonly logger: winston.Logger,
        private readonly outputJsPathname: string,
    ) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap('BinaryPlugin', (compilation) => {
            compilation.hooks.processAssets.tapPromise('BinaryPlugin', async (assets) => {
                try {
                    const assetItem = Object.entries(assets).find(([relativePathname]) => {
                        return (
                            pathResolve(pathDirname(this.outputJsPathname), relativePathname) === this.outputJsPathname
                        );
                    });

                    if (!assetItem) {
                        return;
                    }

                    const [relativePathname, asset] = assetItem;
                    const { exec } = require('@yao-pkg/pkg');

                    volume.mkdirSync(pathDirname(this.outputJsPathname), { recursive: true });
                    volume.writeFileSync(this.outputJsPathname, asset?.source?.());
                    _.unset(assets, relativePathname);
                    await exec([
                        this.outputJsPathname,
                        '--output',
                        pathResolve(pathDirname(this.outputJsPathname), 'build'),
                    ]);

                    console.log(
                        'LENCONDA:FUCK',
                        volume.readdirSync(pathResolve(pathDirname(this.outputJsPathname), 'build')),
                    );
                } catch (error) {
                    this.logger.error(error);
                }
            });
        });
    }
}

export const BuildCommand = CommandFactory.create({
    schema: yup.object().shape({
        clean: yup.boolean().optional().default(true),
        entry: yup.string().required().default('src/main.ts'),
        name: yup.string().required().default('index'),
        outputFilename: yup.string().optional().default('[name].js'),
        outputPath: yup.string().optional().default('dist'),
        tsProject: yup.string().optional().default('tsconfig.json'),
        workDir: yup.string().optional().default(process.cwd()),
        watch: yup.boolean().optional().default(false),
    }),
    context: {
        childProcess: null,
    } as {
        childProcess: childProcess.ChildProcess;
    },
    register: ({ command, callback }) => {
        command.addCommand(
            new Command('build')
                .option('--clean', 'Clean output directory')
                .option('--entry <string>', 'Pathname to script')
                .option('--name <string>', 'Name of the output file')
                .option('--output-path <string>', 'Output path')
                .option('--ts-project <string>', 'TypeScript project file pathname')
                .option('--work-dir <string>', 'Work directory')
                .option('--watch', 'Watch mode')
                .action(callback),
        );
    },
    run: ({ logger, options, context }) => {
        const { watch, clean, ...webpackOptions } = options;
        interceptWriting = !watch;
        const outputDirectoryPathname = pathResolve(webpackOptions.workDir, webpackOptions.outputPath);
        const outputFilePathname = pathResolve(outputDirectoryPathname, `${webpackOptions.name}.js`);
        const compiler = webpack({
            optimization: {
                minimize: false,
            },
            entry: {
                [webpackOptions.name]: pathResolve(webpackOptions.workDir, webpackOptions.entry),
            },
            target: 'node',
            mode: watch ? 'development' : 'production',
            output: {
                filename: webpackOptions.outputFilename,
                path: outputDirectoryPathname,
                libraryTarget: 'commonjs',
            },
            resolve: {
                extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
                alias: {
                    src: pathResolve(webpackOptions.workDir, './src'),
                    UNKNOWN: false,
                },
                plugins: [new CatchNotFoundPlugin(logger)],
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        use: {
                            loader: require.resolve('ts-loader'),
                            options: {
                                compiler: require.resolve('ts-patch/compiler'),
                                configFile: pathResolve(webpackOptions.workDir, './tsconfig.json'),
                            },
                        },
                        exclude: /node_modules/,
                    },
                ],
            },
            plugins: [
                new webpack.ProgressPlugin((percentage, message) => {
                    logger?.info?.(`Build progress: ${percentage * 100}%, ${message}`);
                }),
                new CleanPlugin(outputFilePathname),
                ...(() => {
                    if (watch) {
                        return [
                            new AutoRunPlugin({
                                logger,
                                parallel: true,
                                onAfterStart: (childProcess) => {
                                    context.childProcess = childProcess;
                                },
                                onBeforeStart: () => {
                                    if (context.childProcess) {
                                        context.childProcess.kill();
                                    }
                                },
                            }),
                        ];
                    } else {
                        return [new BinaryPlugin(logger, outputFilePathname)];
                    }
                })(),
            ],
        });

        if (watch) {
            compiler.watch({}, (error) => {
                if (error) {
                    logger?.error?.(error);
                }
            });
        } else {
            if (clean) {
                logger?.info?.(`Cleaning output directory: ${compiler.options.output.path}`);
                fs.removeSync(compiler.options.output.path);
                logger?.info?.('Output directory cleaned');
            }
            compiler.run(() => {});
        }
    },
});
