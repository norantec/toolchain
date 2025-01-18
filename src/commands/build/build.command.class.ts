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
import * as os from 'os';

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
    public constructor(
        private readonly logger: winston.Logger,
        private readonly absoluteOutputPath: string,
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
                    const osType = (() => {
                        switch (os.type()) {
                            case 'Linux':
                                return 'linux';
                            case 'Darwin':
                                return 'macos';
                            case 'Windows_NT':
                                return 'win';
                        }
                    })();

                    if (StringUtil.isFalsyString(relativePath) || StringUtil.isFalsyString(osType)) return;

                    try {
                        const nodeVersion = process.version.split('.')[0].replace(/^v/g, '');
                        const volume = new memfs.Volume();
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
                                        volume[`${methodName}Sync`].bind(volume),
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
                                    volume[methodName].bind(volume),
                                    originalFs[methodName].bind(originalFs),
                                );
                                return result;
                            }, {}),
                            promises: {
                                ...originalFs.promises,
                                ...proxiedFsPromises,
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

                                exec(['${absoluteBundlePath}', '--target', 'node${nodeVersion}-${osType}-${process.arch}', '--out-path', './build'])
                            `,
                            {
                                volume,
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

export const BuildCommand = CommandFactory.create({
    schema: yup.object().shape({
        binary: yup.boolean().optional().default(false),
        clean: yup.boolean().optional().default(true),
        compiler: yup.string().optional().default('typescript'),
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
                .option('--binary', 'Compile to binary')
                .option('--clean', 'Clean output directory')
                .option('--compiler <string>', 'Compiler pathname')
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
        const { watch, binary, clean, ...webpackOptions } = options;
        const absoluteOutputPath = pathResolve(webpackOptions.workDir, webpackOptions.outputPath);
        // console.log('LENCONDA:TEST', require.resolve('ts-patch/compiler'));
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
                                compiler: require.resolve(options.compiler, { paths: [process.cwd()] }),
                                configFile: pathResolve(webpackOptions.tsProject),
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
                        result.push(new CompilePlugin(logger, absoluteOutputPath));
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
            compiler.run((error, assets) => {
                if (error) {
                    logger.error('Builder finished with error:', error);
                } else {
                    console.log(assets);
                }
            });
        }
    },
});
