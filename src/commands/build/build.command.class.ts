/* eslint-disable @typescript-eslint/no-this-alias */
import * as webpack from 'webpack';
import { resolve as pathResolve } from 'path';
import { Command } from 'commander';
import * as fs from 'fs-extra';
import { StringUtil } from '../../utilities/string-util.class';
import * as _ from 'lodash';
import { CommandFactory } from '../command-factory.class';
import * as winston from 'winston';
import { VMUtil } from '../../utilities/vm-util.class';
import * as memfs from 'memfs';
import * as path from 'path';
import * as originalFs from 'fs';
import * as originalFsPromises from 'fs/promises';
import { Worker } from 'worker_threads';
import { SCHEMA } from './build.constants';
import VirtualModulesPlugin = require('webpack-virtual-modules');
import { v4 as uuid } from 'uuid';
import { BuildLoader } from './build.types';
import * as chokidar from 'chokidar';

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
    onAfterStart?: (worker: Worker) => void | Promise<void>;
    onBeforeStart?: () => void | Promise<void>;
}

class AutoRunPlugin {
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
    public constructor(
        private readonly logger: winston.Logger,
        private readonly absoluteOutputPath: string,
        private readonly volume: memfs.IFs,
    ) {}

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
                        const nodeVersion = process.version.split('.')[0].replace(/^v/g, '');
                        const absoluteBundlePath = path.resolve(this.absoluteOutputPath, relativePath);

                        const matchBundlePath = (pathname: originalFs.PathLike) => {
                            return typeof pathname === 'string' && path.resolve(pathname) === absoluteBundlePath;
                        };
                        const createPatchedFsMethod = <T extends (...args: any[]) => any>(
                            proxiedFn: (...args: any[]) => any,
                            originalFn: (...args: Parameters<T>) => ReturnType<T>,
                            isPromise = false,
                        ): T => {
                            return ((pathname: string, ...args) => {
                                if (matchBundlePath(pathname)) {
                                    if (isPromise) {
                                        return new Promise((resolve, reject) => {
                                            try {
                                                resolve(proxiedFn?.(pathname, ...args));
                                            } catch (error) {
                                                reject(error);
                                            }
                                        });
                                    } else {
                                        return proxiedFn?.(pathname, ...args);
                                    }
                                }
                                return originalFn?.(...([pathname, ...args] as Parameters<T>));
                            }) as T;
                        };
                        const proxiedFsPromises: typeof originalFsPromises = {
                            ...originalFsPromises,
                            ...['stat', 'lstat', 'readFile', 'readdir', 'rm'].reduce(
                                (result, methodName) => {
                                    result[methodName] = createPatchedFsMethod(
                                        this.volume[`${methodName}Sync`].bind(this.volume),
                                        originalFsPromises[methodName].bind(originalFsPromises),
                                        true,
                                    );
                                    return result;
                                },
                                {} as Partial<typeof originalFsPromises>,
                            ),
                        };
                        const proxiedFs: typeof originalFs = {
                            ...originalFs,
                            ...['existsSync', 'realpathSync'].reduce((result, methodName) => {
                                result[methodName] = createPatchedFsMethod(
                                    this.volume[methodName].bind(this.volume),
                                    originalFs[methodName].bind(originalFs),
                                );
                                return result;
                            }, {}),
                            promises: {
                                ...originalFs.promises,
                                ...proxiedFsPromises,
                            },
                        };

                        this.volume.mkdirSync(path.dirname(absoluteBundlePath), { recursive: true });
                        this.volume.writeFileSync(absoluteBundlePath, assets[relativePath]?.buffer?.());
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

                                exec(['${absoluteBundlePath}', '--target', '${['linux', 'macos', 'win'].map((os) => `node${nodeVersion}-${os}-${process.arch}`)}', '--out-path', '${this.absoluteOutputPath}'])
                            `,
                            {
                                volume: this.volume,
                                proxiedFs,
                                proxiedFsPromises,
                            },
                        );

                        _.unset(assets, relativePath);
                    } catch (error) {
                        this.logger.error('Error compiling to binary:', error);
                        process.exit(1);
                    }
                },
            );
        });
    }
}

class VirtualFilePlugin {
    public constructor(private readonly volume: memfs.IFs) {}

    public apply(compiler: webpack.Compiler) {
        compiler.outputFileSystem = this.volume as webpack.OutputFileSystem;
    }
}

class ForceWriteBundlePlugin {
    public constructor(private readonly outputPath: string) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(ForceWriteBundlePlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: ForceWriteBundlePlugin.name,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                (assets) => {
                    Object.entries(assets).forEach(([pathname, asset]) => {
                        const absolutePath = path.resolve(this.outputPath, pathname);
                        _.attempt(() => {
                            fs.mkdirpSync(path.dirname(absolutePath));
                        });
                        fs.writeFileSync(absolutePath, asset?.buffer?.());
                    });
                },
            );
        });
    }
}

export const BuildCommand = CommandFactory.create({
    schema: SCHEMA,
    context: {
        progress: '0.00',
        worker: null,
    } as {
        progress: string;
        worker: Worker;
    },
    register: ({ command, callback }) => {
        command.addCommand(
            new Command('build')
                .option('--binary', 'Compile to binary')
                .option('--clean', 'Clean output directory')
                .option('--compiler <string>', 'Compiler pathname')
                .option('--entry <string>', 'Pathname to script')
                .option('--loader <string>', 'Loader pathname')
                .option('--name <string>', 'Name of the output file')
                .option('--output-path <string>', 'Output path')
                .option('--ts-project <string>', 'TypeScript project file pathname')
                .option('--work-dir <string>', 'Work directory')
                .option('--watch', 'Watch mode')
                .action(callback),
        );
    },
    run: ({ logger, options, context }) => {
        const volume = new memfs.Volume() as memfs.IFs;
        const { watch, binary, clean, name: rawName, compiler: tsCompiler, loader, ...webpackOptions } = options;
        const name = binary ? `${rawName}-${process.arch}` : rawName;
        const absoluteOutputPath = pathResolve(webpackOptions.workDir, webpackOptions.outputPath);
        const absoluteRealEntryPath = pathResolve(webpackOptions.workDir, webpackOptions.entry);
        const absoluteEntryPath = !StringUtil.isFalsyString(loader)
            ? pathResolve(path.dirname(absoluteRealEntryPath), `tmp_${uuid()}.ts`)
            : absoluteRealEntryPath;
        const virtualEntries = (() => {
            const result: Record<string, string> = {};

            if (StringUtil.isFalsyString(loader)) return result;

            let loaderFunc: BuildLoader;
            const builtInLoaderPath = path.resolve(__dirname, './loaders', loader) + '.js';

            if (fs.existsSync(builtInLoaderPath) && fs.statSync(builtInLoaderPath).isFile()) {
                loaderFunc = require(builtInLoaderPath) as BuildLoader;
            } else {
                loaderFunc = require(
                    require.resolve(loader, {
                        paths: [process.cwd()],
                    }),
                ) as BuildLoader;
            }

            if (typeof loaderFunc !== 'function' && typeof (loaderFunc as any)?.default === 'function') {
                loaderFunc = (loaderFunc as any).default as BuildLoader;
            }

            if (typeof loaderFunc !== 'function') {
                throw new Error(`Loader '${loader}' is not a function`);
            }

            const content = loaderFunc?.(options);

            if (StringUtil.isFalsyString(content)) {
                throw new Error(`Loader '${loader}' returned non-string content`);
            }

            result[absoluteEntryPath] = content;

            return result;
        })();
        const compiler = webpack({
            cache: false,
            optimization: {
                minimize: false,
            },
            entry: {
                [name]: absoluteEntryPath,
            },
            target: 'node',
            mode: watch ? 'development' : 'production',
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
                                compiler: require.resolve(tsCompiler, { paths: [process.cwd()] }),
                                configFile: pathResolve(webpackOptions.tsProject),
                            },
                        },
                        exclude: /node_modules/,
                    },
                ],
            },
            plugins: [
                new webpack.ProgressPlugin((percentage, message) => {
                    const parsedPercentage = (percentage * 100).toFixed(2);

                    if (context.progress === parsedPercentage) return;

                    context.progress = parsedPercentage;
                    logger?.info?.(
                        `Build ${parsedPercentage}%${StringUtil.isFalsyString(message) ? '' : `: ${message}`}`,
                    );
                }),
                new CleanPlugin(),
                ...(() => {
                    const result: any[] = [];

                    result.push(new VirtualModulesPlugin(virtualEntries));

                    if (!watch && !StringUtil.isFalsyString(loader)) {
                        result.push(new ForceWriteBundlePlugin(absoluteOutputPath));
                    }

                    if (watch) {
                        result.push(
                            new VirtualFilePlugin(volume),
                            new AutoRunPlugin(
                                {
                                    logger,
                                    parallel: true,
                                    onAfterStart: (worker) => {
                                        context.worker = worker;
                                    },
                                    onBeforeStart: () => {
                                        _.attempt(() => {
                                            context.worker.terminate();
                                        });
                                    },
                                },
                                volume,
                            ),
                        );
                    }

                    if (binary) {
                        result.push(new CompilePlugin(logger, absoluteOutputPath, volume));
                    }

                    return result;
                })(),
            ],
        });
        const run = () =>
            compiler.run((error) => {
                if (error) {
                    logger.error('Builder finished with error:', error);
                }
            });

        if (watch) {
            const watcher = chokidar.watch([process.cwd()], {
                persistent: true,
            });
            watcher.on('all', () => {
                context.worker = null;
                _.attempt(() => watcher.close());
                _.attempt(() => context.worker.terminate());
                _.attempt(() => compiler.close(() => {}));
                run();
            });
        }

        if (clean) {
            logger?.info?.(`Cleaning output directory: ${compiler.options.output.path}`);
            fs.removeSync(compiler.options.output.path);
            logger?.info?.('Output directory cleaned');
        }

        run();
    },
});
