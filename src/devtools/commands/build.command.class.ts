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
import { CommandFactory } from './command-factory.class';

class CatchNotFoundPlugin {
    public apply(resolver) {
        const resolve = resolver.resolve;
        resolver.resolve = function (context, path, request, resolveContext, callback) {
            const self = this;
            resolve.call(self, context, path, request, resolveContext, (error, innerPath, result) => {
                const notfoundPathname = pathResolve(__dirname, '../../../') + `/preserved/@@notfound.js?${request}`;
                if (result) {
                    return callback(null, innerPath, result);
                };
                if (error && !error.message.startsWith('Can\'t resolve')) {
                    return callback(error);
                }
                // Allow .js resolutions to .tsx? from .tsx?
                if (request.endsWith('.js') && context.issuer && (context.issuer.endsWith('.ts') || context.issuer.endsWith('.tsx'))) {
                    return resolve.call(self, context, path, request.slice(0, -3), resolveContext, (error1, innerPath, result) => {
                        if (result) return callback(null, innerPath, result);
                        if (error1 && !error1.message.startsWith('Can\'t resolve'))
                            return callback(error1);
                        // make not found errors runtime errors
                        callback(null, notfoundPathname, request);
                    });
                }
                console.warn('notfound:', context.issuer, request);
                // make not found errors runtime errors
                callback(null, notfoundPathname, request);
            });
        };
    }
}

interface AutoRunPluginOptions {
    parallel?: boolean;
    onAfterStart?: (childProcess: childProcess.ChildProcess) => void | Promise<void>;
    onBeforeStart?: () => void | Promise<void>;
}

class AutoRunPlugin {
    public constructor(private options: AutoRunPluginOptions = {}) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapAsync('AutoRunPlugin', async (compilation: webpack.Compilation, callback) => {
            const assets = compilation.getAssets();

            if (assets.length === 0) {
                console.warn('no output file');
                callback();
                return;
            }

            const bundledScriptFile = assets?.find?.((item) => item?.name?.endsWith?.('.js'))?.name;

            if (StringUtil.isFalsyString(bundledScriptFile)) {
                console.warn('no output file');
                callback();
                return;
            }

            const outputPath = pathResolve(compilation.options.output.path, bundledScriptFile);

            console.log('prepared to run file:', outputPath);

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
                        console.error(`process exit with code: ${code}`);
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
    public apply(compiler) {
        compiler.hooks.compilation.tap('CleanPlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: 'CleanPlugin',
                    stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
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
    register: (command, callback) => {
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
    run: (logger, options, context) => {
        const {
            watch,
            clean,
            ...webpackOptions
        } = options;
        const compiler = webpack({
            optimization: {
                minimize: false,
            },
            entry: {
                [webpackOptions.name]: pathResolve(webpackOptions.workDir, webpackOptions.entry),
            },
            target: 'node',
            mode: 'production',
            output: {
                filename: webpackOptions.outputFilename,
                path: pathResolve(webpackOptions.workDir, webpackOptions.outputPath),
                libraryTarget: 'commonjs',
            },
            resolve: {
                extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
                alias: {
                    src: pathResolve(webpackOptions.workDir, './src'),
                    UNKNOWN: false,
                },
                plugins: [
                    new CatchNotFoundPlugin(),
                ],
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
                new webpack.ProgressPlugin(),
                new CleanPlugin(),
                ...(!watch ? [] : [
                    new AutoRunPlugin({
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
                ]),
            ],
        });

        if (watch) {
            compiler.watch({}, (err, stats) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(stats.toString({ colors: true }));
                }
            });
        } else {
            if (clean) {
                fs.removeSync(compiler.options.output.path);
            }
            compiler.run(() => {});
        }
    },
});
