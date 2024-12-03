import { Octokit } from 'octokit';
import * as semver from 'semver';
import { StringUtil } from '../../utilities/string-util.class';
import { Command } from 'commander';
import { ClassType } from '../../types/class-type.type';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as _ from 'lodash';

const BUMP_TYPE = {
    ALPHA: 'alpha',
    BETA: 'beta',
    RELEASE: 'release',
};
const ERROR_CODE = {
    BumpTypeMismatch: 'BUMP_TYPE_MISMATCH',
    IllegalNewPackageVersion: 'ILLEGAL_NEW_PACKAGE_VERSION',
    IllegalCurrentPackageVersion: 'ILLEGAL_CURRENT_PACKAGE_VERSION',
};

const logger = {
    error: (...args) => console.error('[error]', ...args),
    info: (...args) => console.log('[info]', ...args),
    warn: (...args) => console.log('[warn]', ...args),
};

export enum BumpType {
    ALPHA = 'alpha',
    BETA = 'beta',
    RELEASE = 'release',
}

export abstract class Adapter {
    public static extendCommand(command: Command) {
        return command;
    };
    public static formatCommandInputs(inputs: Record<string, string | boolean>) {
        return inputs;
    }
    public abstract getVersions(packageName: string): string[] | Promise<string[]>;
}

export class GitHubAdapter extends Adapter implements Adapter {
    public static extendCommand(command: Command) {
        command.requiredOption('--adapter.token <string>', 'GitHub token');
        command.requiredOption('--adapter.owner <string>', 'GitHub owner name');
        command.requiredOption('--adapter.is-org', 'GitHub owner is organization');
        return command;
    }

    public constructor(private readonly options: {
        owner: string;
        token: string;
        isOrg?: boolean;
    }) {
        super();
    }

    public async getVersions(packageName: string) {
        const octokit = new Octokit({
            auth: this.options.token,
            log: {
                debug: () => {},
                info: () => {},
                error: () => {},
                warn: () => {},
            },
        });
    
        try {
            const response = await octokit.request(`GET /${this.options.isOrg ? 'orgs' : 'users'}/{owner}/packages/npm/{package_name}/versions`, {
                owner: this.options.owner,
                package_name: packageName.split('/').pop(),
            });
            const versions = response.data.map((pkg) => pkg.name);
    
            if (!Array.isArray(versions)) {
                return [];
            }
    
            return versions.sort((version1, version2) => semver.compare(version2, version1));
        } catch (error) {
            console.log(error);
            return [];
        }
    }
}

export interface BumpOptions {
    adapter: Adapter;
    packageName: string;
    logger?: typeof logger;
    onError?: (error: Error) => void;
}

export class Bump {
    public static generateCommand(adapters?: { [key: string]: ClassType<Adapter> }) {
        const command = new Command('bump');
        const adapterMap = {
            ...adapters,
            github: GitHubAdapter,
        };

        Object.entries(adapterMap).forEach(([key, AdapterClass]) => {
            let subCommand = new Command(key);
            subCommand = typeof AdapterClass.extendCommand === 'function' ? AdapterClass.extendCommand(subCommand) : subCommand;

            command
                .addCommand(
                    subCommand
                        .requiredOption('-p, --package-name <package-name>', 'NPM package name')
                        .requiredOption('-t, --type <type>', 'Bump type, e.g. alpha/beta/release')
                        .action(async (options) => {
                            const rawAdapterOptions = Object.entries(options).reduce((result, [key, value]) => {
                                const currentResult = { ...result };
                                if (key.startsWith('adapter.')) {
                                    _.set(currentResult, key.replace(/^adapter\./g, ''), value);
                                }
                                return currentResult;
                            }, {});
                            const adapterOptions = typeof AdapterClass.formatCommandInputs === 'function'
                                ? AdapterClass.formatCommandInputs(rawAdapterOptions)
                                : rawAdapterOptions;
                            const adapter = new AdapterClass(adapterOptions as any);
                            const bump = new Bump({
                                adapter,
                                packageName: options?.packageName,
                                onError: (error) => {
                                    console.error(error);
                                    process.exit(1);
                                },
                            });
                            const packageVersion = fs.readJsonSync(path.join(process.cwd(), 'package.json'))?.version;
                            const newVersion = await bump.bump(options.type, packageVersion);
                            fs.writeJsonSync(
                                path.join(process.cwd(), 'package.json'),
                                {
                                    ...fs.readJsonSync(path.join(process.cwd(), 'package.json')),
                                    version: newVersion,
                                },
                                {
                                    encoding: 'utf-8',
                                    spaces: 4,
                                },
                            );
                            console.log(`Bump ${options.packageName} to ${newVersion} successfully`);
                        }),
                );
        });

        return command;
    }

    private logger: typeof logger;

    public constructor(private readonly options: BumpOptions) {
        this.logger = options.logger ?? logger;
    }

    public async bump(type: BumpType, packageVersion: string) {
        if (StringUtil.isFalsyString(packageVersion) || semver.valid(packageVersion) === null) {
            this.logger.error('Package version is illegal');
            this.options?.onError?.(new Error(ERROR_CODE.IllegalCurrentPackageVersion));
            return;
        }

        if (!Object.values(BUMP_TYPE).includes(type)) {
            this.logger.error(`Bump type is illegal, supported ${Object.values(BUMP_TYPE).join('/')}, but got: ${type}`);
            this.options?.onError?.(new Error(ERROR_CODE.BumpTypeMismatch));
            return;
        }

        const versions = await this.options.adapter.getVersions(this.options.packageName);
        const latestVersion = versions[0];
        const currentVersion = this.getFormalReleaseVersion(packageVersion);
        let newVersion: string;

        if ((!semver.valid(latestVersion) || semver.prerelease(latestVersion) === null) && !semver.valid(currentVersion)) {
            this.logger.error(`Illegal current version from package.json: ${currentVersion}`);
            this.options?.onError?.(new Error(ERROR_CODE.IllegalCurrentPackageVersion));
            return;
        }

        if (!semver.valid(latestVersion)) {
            newVersion = currentVersion;
        } else if (semver.prerelease(latestVersion) === null) {
            const legalNewVersionList = [
                semver.inc(latestVersion, 'patch'),
                semver.inc(latestVersion, 'minor'),
                semver.inc(latestVersion, 'major'),
            ];

            if (!legalNewVersionList.includes(currentVersion)) {
                this.logger.error(`Illegal current version from package.json: ${currentVersion}, supported versions: ${legalNewVersionList.join('/')}`);
                this.options?.onError?.(new Error(ERROR_CODE.IllegalCurrentPackageVersion));
                return;
            }

            newVersion = currentVersion;
        } else {
            newVersion = latestVersion;
        }

        switch (type) {
            case BUMP_TYPE.RELEASE: {
                if (semver.prerelease(newVersion) !== null) {
                    newVersion = semver.inc(newVersion, 'patch');
                }
                break;
            }
            case BUMP_TYPE.ALPHA:
            case BUMP_TYPE.BETA: {
                if (semver.prerelease(newVersion) !== null) {
                    newVersion = semver.inc(newVersion, 'prerelease', type);
                } else {
                    newVersion = `${newVersion}-${type}.0`;
                }
                break;
            }
        }

        return newVersion;
    }

    private getFormalReleaseVersion(version) {
        const parsed = semver.parse(version);
    
        if (!parsed) {
            return null;
        }
    
        return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    }
}
