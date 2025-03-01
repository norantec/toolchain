import * as webpack from 'webpack';
import { resolve as pathResolve } from 'path';
import { Command } from 'commander';
import { StringUtil } from '../../utilities/string-util.class';
import { CommandFactory } from '../command-factory.class';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { SCHEMA } from './sdk.constants';
import VirtualModulesPlugin = require('webpack-virtual-modules');
import { v4 as uuid } from 'uuid';
import { CatchNotFoundPlugin } from '../../webpack/plugins/catch-not-found-plugin';
import * as fs from 'fs-extra';
import * as yup from 'yup';
import { SDKOptions } from './sdk.types';
import { RunOncePlugin } from '../../webpack/plugins/run-once-plugin';

export const SDKCommand = CommandFactory.create({
    schema: yup.object({
        config: yup.string().required(),
    }),
    context: {
        progress: '0.00',
        worker: null,
    } as {
        progress: string;
        worker: Worker;
    },
    register: ({ command, callback }) => {
        command.addCommand(
            new Command('sdk').requiredOption('-c, --config <string>', 'Config file pathname').action(callback),
        );
    },
    run: ({ logger, options, context }) => {
        const { config: configFilePath } = options;
        const configAbsolutePath = path.resolve(configFilePath);
        const config: SDKOptions = SCHEMA.cast(fs.readJsonSync(configAbsolutePath));
        const name = `index${uuid().split('-')[0]}`;
        const workDir = path.resolve(path.dirname(configAbsolutePath), config.workDir);
        const absoluteOutputPath = pathResolve(workDir, config.outputPath);
        const absoluteRealEntryPath = pathResolve(workDir, config.entry);
        const absoluteEntryPath = pathResolve(path.dirname(absoluteRealEntryPath), `tmp_${uuid()}.ts`);
        const loaderCode = `
            import 'reflect-metadata';
            import { OpenApiUtil } from '@norantec/devkit/dist/utilities/open-api-util.class';
            import { SDKUtil } from '@norantec/devkit/dist/utilities/sdk-util.class';
            import { ApiController } from '@norantec/devkit/dist/decorators/api-controller.decorator';
            import ENTRY from '${path.resolve(config.entry)}';
            import * as fs from '@norantec/devkit/dist/lib/fs-extra';
            import * as path from 'path';
    
            async function bootstrap() {
                if (Array.isArray(ENTRY?.models)) {
                    ENTRY?.models?.forEach?.((model) => {
                        ApiController.registerModel(model);
                    });
                }
    
                await ENTRY?.onBeforeBootstrap?.();
    
                const fileMap = new SDKUtil({
                    packageName: '${config?.packageName}',
                    packageVersion: '${config?.packageVersion}',
                    registry: '${config?.registry}',
                    authorEmail: '${config?.authorEmail}',
                    authorName: '${config?.authorName}',
                    registry: '${config?.registry}',
                    document: new OpenApiUtil({
                        Class: ENTRY?.Module,
                        scopeIdentifierBlacklist: ENTRY?.scopeIdentifierBlacklist ?? [],
                    }).generateDocument(),
                }).generate() || {};

                try {
                    fs.removeSync('${absoluteEntryPath}');
                } catch (e) {}

                try {
                    fs.mkdirpSync('${absoluteEntryPath}');
                } catch (e) {}

                Object.entries(fileMap).forEach(([relativePath, content]) => {
                    const absolutePath = path.resolve('${absoluteOutputPath}', relativePath);
                    fs.mkdirpSync(path.dirname(absolutePath));
                    fs.writeFileSync(absolutePath, content, 'utf-8');
                });
            }
    
            bootstrap();
        `;
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
                    src: pathResolve(workDir, './src'),
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
                                compiler: require.resolve(config.compiler, { paths: [process.cwd()] }),
                                configFile: pathResolve(config.tsProject),
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
                        new VirtualModulesPlugin({
                            [absoluteEntryPath]: loaderCode,
                        }),
                    );
                    result.push(new RunOncePlugin(logger));
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
