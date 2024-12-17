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
import { NpmAdapter } from './adapters/npm.adapter.class';

export enum BumpType {
    ALPHA = 'alpha',
    BETA = 'beta',
    RELEASE = 'release',
}

function getFormalReleaseVersion(version: string) {
    const parsed = semver.parse(version);

    if (!parsed) {
        return null;
    }

    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

async function bump(type: BumpType, packageVersion: string, versions: string[], logger?: winston.Logger) {
    if (StringUtil.isFalsyString(packageVersion) || semver.valid(packageVersion) === null) {
        logger?.error('Package version is illegal');
        return;
    }

    if (!Object.values(BumpType).includes(type)) {
        logger?.error(`Bump type is illegal, supported ${Object.values(BumpType).join('/')}, but got: ${type}`);
        return;
    }

    const latestVersion = versions[0];
    const currentVersion = getFormalReleaseVersion(packageVersion);
    let newVersion: string;

    if ((!semver.valid(latestVersion) || semver.prerelease(latestVersion) === null) && !semver.valid(currentVersion)) {
        logger?.error(`Illegal current version from package.json: ${currentVersion}`);
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
            logger?.error(`Illegal current version from package.json: ${currentVersion}, supported versions: ${legalNewVersionList.join('/')}`);
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
        adapters: [
            GithubAdapter,
            NpmAdapter,
        ] as BumpAdapter[],
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
    },
    run: async ({
        context,
        logger,
        options: { type },
    }) => {
        const adapter = context.adapter;

        if (!adapter) {
            throw new Error('Adapter not found');
        }

        const packageJson = fs.readJsonSync(path.resolve('package.json'));
        const packageName = packageJson.name;
        const packageVersion = packageJson.version;

        logger.info(`Got package name: ${packageName}, version: ${packageVersion}`);

        const versions = await adapter.getVersions(packageName, context.rawOptions);
        const newVersion = await bump(type, packageVersion, versions, logger);

        if (StringUtil.isFalsyString(newVersion)) {
            logger.error('Failed to bump package version');
            return;
        }

        logger.info(`Got new version: ${newVersion}`);

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

        logger.info(`Bumped ${packageName} to ${newVersion} successfully`);
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
