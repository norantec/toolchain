/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-this-alias */
import * as webpack from 'webpack';
import { resolve as pathResolve } from 'path';
import { Command } from 'commander';
import * as yup from 'yup';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';

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

class AutoRunPlugin {
    public constructor(private options: { parallel?: boolean } = {}) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapAsync('AutoRunPlugin', (compilation: webpack.Compilation, callback) => {
            // 获取第一个输出文件
            const assets = compilation.getAssets();
            if (assets.length === 0) {
                console.warn('no output file');
                callback();
                return;
            }

            const firstAsset = assets[0];
            const outputPath = pathResolve(compilation.options.output.path, firstAsset.name);

            // 使用 Node.js 的 child_process 来执行文件
            const child = spawn('node', [outputPath], {
                stdio: 'inherit',
            });

            if (!this.options.parallel) {
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

const schema = yup.object().shape({
    clean: yup.boolean().optional().default(true),
    entry: yup.string().required().default('src/main.ts'),
    name: yup.string().required().default('index'),
    outputFilename: yup.string().optional().default('[name].js'),
    outputPath: yup.string().optional().default('dist'),
    tsProject: yup.string().optional().default('tsconfig.json'),
    workDir: yup.string().optional().default(process.cwd()),
});

export type BuildOptions = yup.InferType<typeof schema>;

export class Build {
    public static generateCommand() {
        return new Command('build')
            .option('--clean', 'Clean output directory')
            .option('--entry <string>', 'Pathname to script')
            .option('--name <string>', 'Name of the output file')
            .option('--output-filename <string>', 'Output filename')
            .option('--output-path <string>', 'Output path')
            .option('--ts-project <string>', 'TypeScript project file pathname')
            .option('--work-dir <string>', 'Work directory')
            .option('--watch', 'Watch mode')
            .action(async ({ watch, ...inputOptions }) => {
                const options = schema.cast(inputOptions);
                options.workDir = options.workDir === process.cwd() ? options.workDir : pathResolve(process.cwd(), options.workDir);
                if (watch) {
                    new Build(options).watch();
                } else {
                    new Build(options).run();
                }
            });
    }

    private configuration: webpack.Configuration;

    public constructor(private readonly options: BuildOptions) {
        this.configuration = {
            optimization: {
                minimize: false,
            },
            entry: this.options?.entry,
            target: 'node',
            mode: 'production',
            output: {
                filename: this.options.outputFilename,
                path: pathResolve(this.options.workDir, this.options.outputPath),
                libraryTarget: 'commonjs',
            },
            resolve: {
                extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
                alias: {
                    src: pathResolve(this.options.workDir, './src'),
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
                                configFile: pathResolve(this.options.workDir, './tsconfig.json'),
                            },
                        },
                        exclude: /node_modules/,
                    },
                ],
            },
            plugins: [
                new webpack.ProgressPlugin(),
            ],
        };
    }

    public run() {
        if (this.options.clean) {
            fs.removeSync(this.configuration.output.path);
        }
        webpack(this.configuration).run(() => {});
    }

    public watch() {
        webpack({
            ...this.configuration,
            plugins: [
                ...this.configuration.plugins,
                // new ShellPlugin.default({
                //     onBuildEnd: () => {
                //         return {
                //             scripts: ['node '],
                //             blocking: false,
                //             parallel: true,
                //         };
                //     },
                // }),
                new AutoRunPlugin({
                    parallel: true,
                }),
            ],
        }).watch({}, (err, stats) => {
            if (err) {
                console.error(err);
            } else {
                console.log(stats.toString({ colors: true }));
            }
        });
    }
}
