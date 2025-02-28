import * as memfs from 'memfs';
import * as winston from 'winston';
import * as webpack from 'webpack';
import * as path from 'path';
import { StringUtil } from '../../../utilities/string-util.class';
import * as originalFs from 'fs';
import * as originalFsPromises from 'fs/promises';
import { VMUtil } from '../../../utilities/vm-util.class';
import * as _ from 'lodash';

export class CompilePlugin {
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
