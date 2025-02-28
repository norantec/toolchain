import * as webpack from 'webpack';
import { resolve as pathResolve } from 'path';
import { Command } from 'commander';
import * as fs from 'fs-extra';
import { StringUtil } from '../../utilities/string-util.class';
import { CommandFactory } from '../command-factory.class';
import * as memfs from 'memfs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { SCHEMA } from './generate.constants';
import VirtualModulesPlugin = require('webpack-virtual-modules');
import { v4 as uuid } from 'uuid';
import { GenerateLoader } from './generate.types';
import { CatchNotFoundPlugin } from '../../webpack/plugins/catch-not-found-plugin';
import { VirtualFilePlugin } from '../../webpack/plugins/virtual-file-plugin';
import { AutoRunPlugin } from '../../webpack/plugins/auto-run-plugin';
import * as _ from 'lodash';

export const GenerateCommand = CommandFactory.create({
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
                .option('--compiler <string>', 'Compiler pathname')
                .option('--entry <string>', 'Pathname to script')
                .option('--loader <string>', 'Loader pathname')
                .option('--output-path <string>', 'Output path')
                .option('--ts-project <string>', 'TypeScript project file pathname')
                .option('--work-dir <string>', 'Work directory')
                .action(callback),
        );
    },
    run: ({ logger, options, context }) => {
        const volume = new memfs.Volume() as memfs.IFs;
        const { compiler: tsCompiler, loader, ...webpackOptions } = options;
        const name = `index${uuid().split('-')[0]}`;
        const absoluteOutputPath = pathResolve(webpackOptions.workDir, webpackOptions.outputPath);
        const absoluteRealEntryPath = pathResolve(webpackOptions.workDir, webpackOptions.entry);
        const absoluteEntryPath = !StringUtil.isFalsyString(loader)
            ? pathResolve(path.dirname(absoluteRealEntryPath), `tmp_${uuid()}.ts`)
            : absoluteRealEntryPath;
        const virtualEntries = (() => {
            const result: Record<string, string> = {};

            if (StringUtil.isFalsyString(loader)) return result;

            let loaderFunc: GenerateLoader;
            const builtInLoaderPath = path.resolve(__dirname, './loaders', loader) + '.js';

            if (fs.existsSync(builtInLoaderPath) && fs.statSync(builtInLoaderPath).isFile()) {
                loaderFunc = require(builtInLoaderPath) as GenerateLoader;
            } else {
                loaderFunc = require(
                    require.resolve(loader, {
                        paths: [process.cwd()],
                    }),
                ) as GenerateLoader;
            }

            if (typeof loaderFunc !== 'function' && typeof (loaderFunc as any)?.default === 'function') {
                loaderFunc = (loaderFunc as any).default as GenerateLoader;
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
            mode: 'production',
            output: {
                filename: '[name].js',
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
                ...(() => {
                    const result: any[] = [];
                    result.push(
                        new VirtualModulesPlugin(virtualEntries),
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
                    return result;
                })(),
            ],
        });

        compiler.run((error) => {
            if (error) {
                logger.error('Builder finished with error:', error);
            }
        });
    },
});
