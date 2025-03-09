import * as yup from 'yup';
import { CommandFactory } from '../../factories/command.factory';
import * as winston from 'winston';
import { BumpAdapter } from './bump-adapter-factory.class';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import { StringUtil } from '../../utilities/string-util.class';
import * as commander from 'commander';
import { BumpType } from '../../enums/bump-type.enum';
import { JSONUtil } from '../../utilities/json-util.class';
import * as handlebars from 'handlebars';

function getFormalReleaseVersion(version: string) {
    const parsed = semver.parse(version);
    if (!parsed) return null;
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
            logger?.error(
                `Illegal current version from package.json: ${currentVersion}, supported versions: ${legalNewVersionList.join('/')}`,
            );
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

export const BumpCommand = CommandFactory.create({
    schema: yup.object().shape({
        type: yup.string().required().oneOf(Object.values(BumpType)),
        config: yup.string().required(),
    }),
    context: {},
    register: ({ callback }) => {
        const command = new commander.Command('bump');

        command
            .requiredOption('-t, --type <string>', 'Bump type, e.g. alpha/beta/release')
            .requiredOption('-c, --config <string>', 'Config file pathname')
            .action(callback);

        return command;
    },
    run: async ({ logger, options: { type, config: configPath } }) => {
        const config = fs.readJsonSync(path.resolve(configPath));

        if (StringUtil.isFalsyString(config?.adapter)) {
            throw new Error('Adapter not specified');
        }

        const requireAdapter = (adapterPath: string): BumpAdapter => {
            const requiredAdapterModule = require(adapterPath);
            if (typeof requiredAdapterModule?.default === 'function')
                return requiredAdapterModule?.default as BumpAdapter;
            if (typeof requiredAdapterModule === 'function') return requiredAdapterModule as BumpAdapter;
            return null;
        };
        const loadAdapter = (adapterName: string): BumpAdapter => {
            let adapterPath = path.resolve(path.resolve(__dirname, './adapters'), `${adapterName}.adapter.js`);

            if (fs.existsSync(adapterPath) && fs.statSync(adapterPath).isFile()) {
                const result = requireAdapter(adapterPath);
                return result;
            }

            adapterPath = path.resolve(adapterName);

            if (fs.existsSync(adapterPath) && fs.statSync(adapterPath).isFile()) {
                return requireAdapter(adapterPath);
            }

            return null;
        };

        const adapter = loadAdapter(config.adapter);

        if (typeof adapter !== 'function') {
            throw new Error(`Cannot load adapter: '${config.adapter}'`);
        }

        const packageJson = fs.readJsonSync(path.resolve('package.json'));
        const packageName = packageJson.name;
        const packageVersion = packageJson.version;

        logger.info(`Got package name: ${packageName}, version: ${packageVersion}`);

        const versions = await adapter(logger)(
            packageName,
            JSONUtil.parse(
                handlebars.compile(JSON.stringify(config?.options ?? {}), { noEscape: true })({ env: process?.env }),
            ),
        );
        const newVersion = await bump(type, packageVersion, versions, logger);

        if (StringUtil.isFalsyString(newVersion)) {
            logger.error('Failed to bump package version');
            process.exit(1);
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
