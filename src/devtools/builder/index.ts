/* eslint-disable @typescript-eslint/no-this-alias */
import * as webpack from 'webpack';
import * as path from 'path';
import { StringUtil } from '../../utilities/string-util.class';
import { Command } from 'commander';

class CatchNotFoundPlugin {
    public apply(resolver) {
        const resolve = resolver.resolve;
        resolver.resolve = function (context, path, request, resolveContext, callback) {
            const self = this;
            resolve.call(self, context, path, request, resolveContext, (error, innerPath, result) => {
                const notfoundPathname = path.resolve(__dirname, '../../preserved/@@notfound.js') + `?${request}`;
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
                // make not found errors runtime errors
                callback(null, notfoundPathname, request);
            });
        };
    }
}

export interface BuildOptions {
    entry: Record<string, string>;
    outputFilename?: string;
    outputPath?: string;
    tsProject?: string;
}

export class Builder {
    public static generateCommand() {
        return new Command('build')
            .requiredOption('--entries <string...>', 'Entry file pathname')
            .option('--output-filename <string>', 'Output filename')
            .option('--output-path <string>', 'Output path')
            .option('--ts-project <string>', 'TypeScript project file pathname')
            .action(async (inputOptions) => {
                const {
                    entries: rawEntries,
                    ...options
                } = inputOptions;
                const entry = Array.isArray(rawEntries)
                    ? rawEntries.reduce((result, value) => {
                        if (StringUtil.isFalsyString(value)) {
                            return result;
                        }
                        const [key, pathname] = value.split(':');
                        result[key] = path.resolve(process.cwd(), pathname);
                        return result;
                    }, {})
                    : {};
                new Builder({
                    ...options,
                    entry,
                }).run();
            });
    }

    public constructor(private readonly options: BuildOptions) {}

    public run() {
        webpack({
            optimization: {
                minimize: false,
            },
            entry: this.options?.entry,
            target: 'node',
            mode: 'production',
            output: {
                filename: StringUtil.isFalsyString(this.options?.outputFilename) ? '[name].js' : this.options.outputFilename,
                path: path.resolve(process.cwd(), StringUtil.isFalsyString(this.options?.outputPath) ? 'bundle' : this.options.outputPath),
                libraryTarget: 'commonjs',
            },
            resolve: {
                extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
                alias: {
                    src: path.resolve(__dirname, './src'),
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
                            loader: 'ts-loader',
                            options: {
                                configFile: path.resolve(
                                    process.cwd(),
                                    StringUtil.isFalsyString(this.options?.tsProject)
                                        ? 'tsconfig.build.json'
                                        : this.options.tsProject,
                                ),
                            },
                        },
                        exclude: /node_modules/,
                    },
                ],
            },
            plugins: [
                new webpack.ProgressPlugin(),
            ],
        });
    }
}
