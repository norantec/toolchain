import { Command } from 'commander';
import { CommandFactory } from '../../factories/command.factory';
import * as yup from 'yup';
import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as fs from 'fs-extra';
import { Paths } from 'type-fest';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { StringUtil } from '../../utilities/string-util.class';
import * as handlebars from 'handlebars';
import * as webpack from 'webpack';
import { CatchNotFoundPlugin } from '../../webpack/plugins/catch-not-found-plugin';
import { CleanNonJSFilePlugin } from '../../webpack/plugins/clean-non-js-file-plugin';
import VirtualModulesPlugin = require('webpack-virtual-modules');
import { ForceWriteBundlePlugin } from '../../webpack/plugins/force-write-bundle-plugin';
import { CompilePlugin } from '../../webpack/plugins/compile-plugin';
import * as memfs from 'memfs';
import { VirtualFilePlugin } from '../../webpack/plugins/virtual-file-plugin';
import { AutoRunPlugin } from '../../webpack/plugins/auto-run-plugin';
import * as chokidar from 'chokidar';
import * as ignore from 'ignore';
import { RunOncePlugin } from '../../webpack/plugins/run-once-plugin';
import { SCHEMA as SDK_UTIL_SCHEMA } from '../../utilities/sdk-util.class';

export enum RunType {
    WATCH = 'watch',
    BUNDLE = 'bundle',
    SDK = 'sdk',
}

export type RunTypeValue = `${RunType}`;

const BASIC_CONFIG_SCHEMA = yup.object({
    compiler: yup.string().optional().default('typescript'),
    clean: yup.boolean().optional().default(true),
    entry: yup.string().required().default('src/main.ts'),
    tsProject: yup.string().optional().default('tsconfig.json'),
});

const BASIC_CONFIG_CLEAN_SCHEMA = yup.object({
    compiler: yup.string().optional(),
    clean: yup.boolean().optional(),
    entry: yup.string().optional(),
    tsProject: yup.string().optional(),
});

type BasicConfig = yup.InferType<typeof BASIC_CONFIG_SCHEMA>;

export const CONFIG_SCHEMA = BASIC_CONFIG_SCHEMA.concat(
    yup.object().shape({
        preset: yup.string().optional().default('nt-bootstrap'),
        outputPath: yup.string().optional().default('dist'),
        sourceDir: yup.string().optional().default('./src'),
        workDir: yup.string().optional().default(process.cwd()),
        runtimeOptions: yup
            .object({
                [RunType.BUNDLE as 'bundle']: BASIC_CONFIG_CLEAN_SCHEMA.concat(
                    yup.object({
                        binary: yup.boolean().optional().default(false),
                        name: yup.string().required().default('index'),
                        outputFilename: yup.string().optional().default('[name].js'),
                    }),
                ).optional(),
                [RunType.WATCH as 'watch']: BASIC_CONFIG_CLEAN_SCHEMA.concat(
                    yup.object({
                        name: yup.string().required().default('index'),
                        outputFilename: yup.string().optional().default('[name].js'),
                    }),
                ).optional(),
                [RunType.SDK as 'sdk']: BASIC_CONFIG_CLEAN_SCHEMA.concat(SDK_UTIL_SCHEMA).optional(),
            })
            .optional(),
    }),
);

export type Config = yup.InferType<typeof CONFIG_SCHEMA>;

export const ServiceCommand = CommandFactory.create({
    schema: yup.object({
        config: yup.string().required(),
        runType: yup.string().oneOf(Object.values(RunType)).required(),
    }),
    context: {
        progress: '0.00',
        worker: null,
    } as {
        progress: string;
        worker: Worker;
    },
    register: ({ callback }) => {
        return new Command('service')
            .requiredOption('-c, --config <string>', 'Config file pathname')
            .requiredOption('-t, --run-type <string>', 'Run type')
            .action(callback);
    },
    run: ({ logger, options, context }) => {
        const volume = new memfs.Volume() as memfs.IFs;
        const { config: configFilePath, runType } = options;
        const configAbsolutePath = path.resolve(configFilePath);
        const config = CONFIG_SCHEMA.cast(fs.readJsonSync(configAbsolutePath));

        const getSpecifiedConfig = <T extends RunTypeValue>(runType: T): Config['runtimeOptions'][T] => {
            return config?.runtimeOptions?.[runType];
        };

        const getMergedConfigValue = <T extends RunType, P extends Paths<BasicConfig>>(
            runType: T,
            path: P,
        ): BasicConfig[P] => {
            const specifiedConfigValue = _.get(getSpecifiedConfig(runType), path) as BasicConfig[P];
            const basicConfigValue = _.get(config, path) as BasicConfig[P];
            return typeof specifiedConfigValue === 'undefined' ? basicConfigValue : specifiedConfigValue;
        };

        let name: string;
        const absoluteOutputPath = path.resolve(config.workDir, config.outputPath, runType);
        const absoluteRealEntryPath = path.resolve(config?.workDir, getMergedConfigValue(runType, 'entry'));
        const absoluteEntryPath = path.resolve(path.dirname(absoluteRealEntryPath), `tmp_${uuid()}.ts`);
        const virtualEntries = (() => {
            const result: Record<string, string> = {};

            if (
                StringUtil.isFalsyString(config?.preset) ||
                ![RunType.BUNDLE, RunType.WATCH, RunType.SDK].includes(runType)
            ) {
                return {
                    [absoluteEntryPath]: fs.readFileSync(absoluteRealEntryPath).toString(),
                };
            }

            let filePath: string;

            try {
                filePath = require.resolve(
                    path.resolve(__dirname, '../../../presets/nttc/service', config.preset, `${runType}.loader.hbs`),
                );
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {}

            if (StringUtil.isFalsyString(filePath)) {
                try {
                    filePath = require.resolve(path.join(config?.preset, `${runType}.loader.hbs`), {
                        paths: [process.cwd()],
                    });
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {}
            }

            if (StringUtil.isFalsyString(filePath)) {
                throw new Error(`Cannot find HBS file for '${config?.preset}' in ${process.cwd()}`);
            }

            let content: string;

            try {
                content = fs.readFileSync(filePath).toString();
                content = handlebars.compile(content, { noEscape: true })({
                    entry: getMergedConfigValue(runType, 'entry'),
                    absoluteEntry: absoluteRealEntryPath,
                    absoluteOutputPath,
                    config: _.merge({}, _.omit(config, ['runtimeOptions']), getSpecifiedConfig(runType)),
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {}

            if (StringUtil.isFalsyString(content)) {
                throw new Error(`Cannot load '${config?.preset}'`);
            }

            result[absoluteEntryPath] = content;

            return result;
        })();

        switch (runType) {
            case RunType.BUNDLE: {
                name = `${getSpecifiedConfig(runType)?.name}${getSpecifiedConfig(runType)?.binary ? `-${process.arch}` : ''}`;
                break;
            }
            case RunType.WATCH: {
                name = getSpecifiedConfig(runType)?.name;
                break;
            }
            case RunType.SDK: {
                name = `index${uuid().split('-')[0]}`;
                break;
            }
            default:
                break;
        }

        const compiler = webpack({
            cache: false,
            optimization: {
                minimize: false,
            },
            entry: {
                [name]: absoluteEntryPath,
            },
            target: 'node',
            mode: (() => {
                switch (runType) {
                    case RunType.WATCH:
                        return 'development';
                    default:
                        return 'production';
                }
            })(),
            output: {
                filename: (() => {
                    switch (runType) {
                        case RunType.SDK:
                            return '[name].js';
                        default:
                            return getSpecifiedConfig(runType)?.outputFilename;
                    }
                })(),
                path: absoluteOutputPath,
                libraryTarget: 'commonjs',
            },
            resolve: {
                extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
                alias: {
                    src: path.resolve(config?.workDir, config?.sourceDir),
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
                                compiler: require.resolve(getMergedConfigValue(runType, 'compiler'), {
                                    paths: [process.cwd()],
                                }),
                                configFile: path.resolve(getMergedConfigValue(runType, 'tsProject')),
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

                    result.push(new CleanNonJSFilePlugin(), new VirtualModulesPlugin(virtualEntries));

                    if (![RunType.SDK, RunType.WATCH].includes(runType)) {
                        result.push(new ForceWriteBundlePlugin(absoluteOutputPath));
                    }

                    if (runType === RunType.SDK) {
                        result.push(new RunOncePlugin(logger));
                    }

                    if (runType === RunType.WATCH) {
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

                    if (runType === RunType.BUNDLE && getSpecifiedConfig(runType)?.binary) {
                        result.push(new CompilePlugin(logger, absoluteOutputPath, volume));
                    }

                    return result;
                })(),
            ],
        });
        const runCompiler = () => {
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
                    runCompiler();
                });
            });
        };

        if (runType === RunType.WATCH) {
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

        if (getMergedConfigValue(runType, 'clean')) {
            logger?.info?.(`Cleaning output directory: ${absoluteOutputPath}`);
            _.attempt(() => fs.removeSync(absoluteOutputPath));
            logger?.info?.('Output directory cleaned');
        }

        runCompiler();
    },
});
