/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-this-alias */
import * as webpack from 'webpack';
import { resolve as pathResolve } from 'path';
import { Command } from 'commander';
import * as yup from 'yup';
import * as fs from 'fs-extra';
import * as childProcess from 'child_process';
import { StringUtil } from '../../utilities/string-util.class';
import * as _ from 'lodash';
import { CommandFactory } from '../command-factory.class';
import * as winston from 'winston';
import { VMUtil } from '../../utilities/vm-util.class';
import * as memfs from 'memfs';
import * as path from 'path';
import * as originalFs from 'fs';
import * as originalFsPromises from 'fs/promises';

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
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(CleanPlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: CleanPlugin.name,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                (assets) => {
                    Object.keys(assets).forEach((key) => {
                        if (!key?.endsWith?.('.js')) {
                            _.unset(assets, key);
                        }
                    });
                },
            );
        });
    }
}

class CompilePlugin {
    public constructor(private readonly absoluteOutputPath: string) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(CompilePlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: CompilePlugin.name,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                (assets) => {
                    const relativePath = Object.keys(assets).find((currentRelativePath) => {
                        return currentRelativePath?.endsWith?.('.js');
                    });

                    if (StringUtil.isFalsyString(relativePath)) return;

                    try {
                        const volume = new memfs.Volume();
                        const absoluteBundlePath = path.resolve(this.absoluteOutputPath, relativePath);
                        const matchBundlePath = (pathname: originalFs.PathLike) => {
                            return typeof pathname === 'string' && path.resolve(pathname) === absoluteBundlePath;
                        };
                        const proxiedFsPromises: typeof originalFsPromises = {
                            ...originalFsPromises,
                            stat: ((pathname, options): Promise<originalFs.Stats> => {
                                if (matchBundlePath(pathname)) {
                                    return new Promise<originalFs.Stats>((resolve, reject) => {
                                        try {
                                            resolve(volume.statSync(pathname));
                                        } catch (e) {
                                            reject(e);
                                        }
                                    });
                                }
                                return originalFsPromises.stat(pathname, options);
                            }) as unknown as typeof originalFsPromises.stat,
                            lstat: ((pathname, options): Promise<originalFs.Stats> => {
                                if (matchBundlePath(pathname)) {
                                    return new Promise<originalFs.Stats>((resolve, reject) => {
                                        try {
                                            resolve(volume.lstatSync(pathname));
                                        } catch (e) {
                                            reject(e);
                                        }
                                    });
                                }
                                return originalFsPromises.lstat(pathname, options);
                            }) as unknown as typeof originalFsPromises.lstat,
                        };
                        const proxiedFs: typeof originalFs = {
                            ...originalFs,
                            existsSync: (pathname): boolean => {
                                if (typeof pathname === 'string' && path.resolve(pathname) === absoluteBundlePath) {
                                    return true;
                                }
                                return originalFs.existsSync(pathname);
                            },
                        };

                        volume.mkdirSync(path.dirname(absoluteBundlePath), { recursive: true });
                        volume.writeFileSync(absoluteBundlePath, assets[relativePath]?.buffer?.());
                        VMUtil.runScriptCode(
                            `
                                const Module = require('module');
                                const originalLoad = Module._load;

                                Module._load = function(request, parent) {
                                    if (request === 'fs' || request === 'node:fs') return proxiedFs;
                                    if (request === 'fs/promises' || request === 'node:fs/promises') return proxiedFsPromises;
                                    return originalLoad.apply(this, arguments);
                                };

                                const { exec } = require('@yao-pkg/pkg');

                                exec(['${absoluteBundlePath}', '--target', 'node20', '--output', './build'])
                            `,
                            {
                                volume,
                                proxiedFs,
                                proxiedFsPromises,
                            },
                        );

                        _.unset(assets, relativePath);
                    } catch (e) {
                        console.log('LENCONDA:2:', e);
                    }
                },
            );
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
        binary: yup.boolean().optional().default(false),
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
                .option('--binary', 'Compile to binary')
                .action(callback),
        );
    },
    run: ({ logger, options, context }) => {
        const { watch, binary, clean, ...webpackOptions } = options;
        const absoluteOutputPath = pathResolve(webpackOptions.workDir, webpackOptions.outputPath);
        const compiler = webpack({
            optimization: {
                minimize: false,
            },
            entry: {
                [webpackOptions.name]: pathResolve(webpackOptions.workDir, webpackOptions.entry),
            },
            target: 'node',
            mode: options.watch ? 'development' : 'production',
            output: {
                filename: webpackOptions.outputFilename,
                path: absoluteOutputPath,
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
                new CleanPlugin(),
                ...(() => {
                    const result: any[] = [];

                    if (watch) {
                        result.push(
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
                        );
                    }

                    if (binary) {
                        result.push(new CompilePlugin(absoluteOutputPath));
                    }

                    return result;
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
            compiler.run((error) => {
                if (error) {
                    console.log('LENCONDA:3:', error);
                }
            });
        }
    },
});
