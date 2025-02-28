import * as webpack from 'webpack';
import { resolve as pathResolve } from 'path';
import { Command } from 'commander';
import * as fs from 'fs-extra';
import { StringUtil } from '../../utilities/string-util.class';
import * as _ from 'lodash';
import { CommandFactory } from '../command-factory.class';
import * as memfs from 'memfs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { SCHEMA } from './build.constants';
import VirtualModulesPlugin = require('webpack-virtual-modules');
import { v4 as uuid } from 'uuid';
import { BuildLoader } from './build.types';
import * as chokidar from 'chokidar';
import * as ignore from 'ignore';
import { CatchNotFoundPlugin } from '../../webpack/plugins/catch-not-found-plugin';
import { CleanPlugin } from '../../webpack/plugins/clean-plugin';
import { ForceWriteBundlePlugin } from '../../webpack/plugins/force-write-bundle-plugin';
import { VirtualFilePlugin } from '../../webpack/plugins/virtual-file-plugin';
import { AutoRunPlugin } from '../../webpack/plugins/auto-run-plugin';
import { CompilePlugin } from '../../webpack/plugins/compile-plugin';

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
        const run = () => {
            compiler.run((error) => {
                if (error) {
                    logger.error('Builder finished with error:', error);
                }
            });
        };
        const watchHandler = () => {
            _.attempt(() => context.worker.terminate());
            context.worker = null;
            _.attempt(() => {
                compiler.close(() => {
                    run();
                });
            });
        };

        if (watch) {
            const ig = ignore().add(
                (() => {
                    const gitIgnorePath = path.resolve('.gitignore');
                    if (fs.existsSync(gitIgnorePath) && fs.statSync(gitIgnorePath).isFile()) {
                        return fs.readFileSync(gitIgnorePath).toString();
                    }
                    return '';
                })(),
            );
            const watcher = chokidar.watch(process.cwd(), {
                persistent: true,
                ignoreInitial: true,
                ignored: (pathname) => {
                    const relativePath = path.relative(process.cwd(), pathname);
                    if (StringUtil.isFalsyString(relativePath)) return false;
                    if (relativePath.startsWith('.git')) return true;
                    return ig.ignores(relativePath);
                },
            });
            watcher.on('change', watchHandler);
            watcher.on('add', watchHandler);
            watcher.on('unlink', watchHandler);
        }

        if (clean) {
            logger?.info?.(`Cleaning output directory: ${compiler.options.output.path}`);
            _.attempt(() => fs.removeSync(compiler?.options?.output?.path));
            logger?.info?.('Output directory cleaned');
        }

        run();
    },
});
