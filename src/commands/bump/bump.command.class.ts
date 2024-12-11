import * as yup from 'yup';
import { CommandFactory } from '../command-factory.class';
import { GithubAdapter } from './adapters/github.adapter.class';
import * as winston from 'winston';
import { BumpAdapter } from './bump-adapter-factory.class';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import { StringUtil } from '../../utilities/string-util.class';
import * as commander from 'commander';

export enum BumpType {
    ALPHA = 'alpha',
    BETA = 'beta',
    RELEASE = 'release',
}

// const ERROR_CODE = {
//     BumpTypeMismatch: 'BUMP_TYPE_MISMATCH',
//     IllegalNewPackageVersion: 'ILLEGAL_NEW_PACKAGE_VERSION',
//     IllegalCurrentPackageVersion: 'ILLEGAL_CURRENT_PACKAGE_VERSION',
// };

// export abstract class Adapter {
//     // public static extendCommand(command: commander.Command) {
//     //     return command;
//     // };
//     // public static formatCommandInputs(inputs: Record<string, string | boolean>) {
//     //     return inputs;
//     // }
//     public abstract getVersions(packageName: string): string[] | Promise<string[]>;
// }

// export class GitHubAdapter extends Adapter implements Adapter {
//     public static extendCommand(command: commander.Command) {
//         command.requiredOption('--adapter.token <string>', 'GitHub token');
//         command.requiredOption('--adapter.owner <string>', 'GitHub owner name');
//         command.requiredOption('--adapter.is-org', 'GitHub owner is organization');
//         return command;
//     }

//     public constructor(private readonly options: {
//         owner: string;
//         token: string;
//         isOrg?: boolean;
//     }) {
//         super();
//     }

//     public async getVersions(packageName: string) {
//         const octokit = new Octokit({
//             auth: this.options.token,
//             log: {
//                 debug: () => {},
//                 info: () => {},
//                 error: () => {},
//                 warn: () => {},
//             },
//         });

//         try {
//             const response = await octokit.request(`GET /${this.options.isOrg ? 'orgs' : 'users'}/{owner}/packages/npm/{package_name}/versions`, {
//                 owner: this.options.owner,
//                 package_name: packageName.split('/').pop(),
//             });
//             const versions = response.data.map((pkg) => pkg.name);

//             if (!Array.isArray(versions)) {
//                 return [];
//             }

//             return versions.sort((version1, version2) => semver.compare(version2, version1));
//         } catch (error) {
//             console.log(error);
//             return [];
//         }
//     }
// }

function getFormalReleaseVersion(version: string) {
    const parsed = semver.parse(version);

    if (!parsed) {
        return null;
    }

    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

async function bump(type: BumpType, packageVersion: string, versions: string[]) {
    if (StringUtil.isFalsyString(packageVersion) || semver.valid(packageVersion) === null) {
        // this.logger.error('Package version is illegal');
        // this.options?.onError?.(new Error(ERROR_CODE.IllegalCurrentPackageVersion));
        return;
    }

    if (!Object.values(BumpType).includes(type)) {
        // this.logger.error(`Bump type is illegal, supported ${Object.values(BUMP_TYPE).join('/')}, but got: ${type}`);
        // this.options?.onError?.(new Error(ERROR_CODE.BumpTypeMismatch));
        return;
    }

    const latestVersion = versions[0];
    const currentVersion = getFormalReleaseVersion(packageVersion);
    let newVersion: string;

    if ((!semver.valid(latestVersion) || semver.prerelease(latestVersion) === null) && !semver.valid(currentVersion)) {
        // this.logger.error(`Illegal current version from package.json: ${currentVersion}`);
        // this.options?.onError?.(new Error(ERROR_CODE.IllegalCurrentPackageVersion));
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
            // this.logger.error(`Illegal current version from package.json: ${currentVersion}, supported versions: ${legalNewVersionList.join('/')}`);
            // this.options?.onError?.(new Error(ERROR_CODE.IllegalCurrentPackageVersion));
            return;
        }

        newVersion = currentVersion;
    } else {
        newVersion = latestVersion;
    }

    switch (type) {
        case BumpType.RELEASE: {
            if (semver.prerelease(newVersion) !== null) {
                newVersion = semver.inc(newVersion, 'patch');
            }
            break;
        }
        case BumpType.ALPHA:
        case BumpType.BETA: {
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

const BaseBumpCommand = CommandFactory.create({
    schema: yup.object().shape({
        type: yup.string().required().oneOf(Object.values(BumpType)),
    }),
    context: {
        adapters: [GithubAdapter] as BumpAdapter[],
        adapter: null,
        rawOptions: {},
    } as {
        adapters?: BumpAdapter[];
        adapter?: InstanceType<BumpAdapter>;
        rawOptions?: Record<string, any>;
    },
    register: async ({
        logger,
        context,
        command,
        callback,
    }) => {
        const subCommand = new commander.Command('bump');

        // subCommand.argument(
        //     'type',
        //     'Bump type, e.g. alpha/beta/release',
        // );

        if (Array.isArray(context?.adapters)) {
            context.adapters.map((AdapterClass) => {
                const adapter = new AdapterClass(logger);
                const command = adapter.register();

                command
                    .requiredOption('-t, --type <type>', 'Bump type, e.g. alpha/beta/release')
                    .action((options) => {
                        context.adapter = adapter;
                        const {
                            type,
                            ...adapterOptions
                        } = options;
                        context.rawOptions = adapterOptions;
                        callback({ type });
                    });

                return command;
            }).forEach((command) => {
                subCommand.addCommand(command);
            });
        }

        command.addCommand(subCommand);
        // command.action((options) => {
        //     callback(options);
        // });
    },
    run: async ({
        context,
        options: { type },
    }) => {
        const adapter = context.adapter;

        if (!adapter) {
            throw new Error('Adapter not found');
        }

        const packageName = fs.readJsonSync(path.resolve('package.json'))?.name;
        const versions = await adapter.getVersions(packageName, context.rawOptions);
        const packageVersion = fs.readJsonSync(path.resolve('package.json'))?.version;
        const newVersion = await bump(type, packageVersion, versions);
        console.log(newVersion);
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
        console.log(`Bump ${packageName} to ${newVersion} successfully`);
    },
});

export class BumpCommand extends BaseBumpCommand {
    public constructor(logger: winston.Logger) {
        super(logger);
    }

    public addAdapters(adapters: BumpAdapter[]) {
        this.updateContext((context) => ({
            adapters: (Array.isArray(context?.adapters) ? context.adapters : []).concat(adapters),
        }));
    }
}
