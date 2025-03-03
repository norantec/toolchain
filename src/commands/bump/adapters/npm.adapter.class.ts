import * as yup from 'yup';
import * as commander from 'commander';
import { BumpAdapterFactory } from '../bump-adapter-factory.class';
import * as semver from 'semver';
import { StringUtil } from '../../../utilities/string-util.class';
import * as axios from 'axios';

export const NpmAdapter = BumpAdapterFactory.create({
    schema: yup.object().shape({
        token: yup.string().optional(),
        registry: yup.string().required().default('https://registry.npmjs.org'),
    }),
    register: () => {
        const subCommand = new commander.Command('npm');
        subCommand.option('--token <string>', 'NPM token').option('--registry <string>', 'NPM registry');
        return subCommand;
    },
    getVersions: async (logger, packageName, options) => {
        try {
            logger.verbose(`Requesting versions for ${packageName}`);
            const URL = `${options.registry}/${packageName}`;
            logger.verbose(`Using URL: ${URL}`);
            let versions = await axios.default
                .get(URL, {
                    headers: {
                        ...(!StringUtil.isFalsyString(options.token)
                            ? { Authorization: `Bearer ${options.token}` }
                            : {}),
                    },
                    responseType: 'json',
                })
                .then((response) => {
                    return Object.keys(response.data?.versions ?? {});
                });
            logger.verbose('Response received');

            if (!Array.isArray(versions)) {
                logger.warn('Response is not an array, returning empty array...');
                return [];
            }

            versions = versions
                .filter((version) => !StringUtil.isFalsyString(version))
                .sort((version1, version2) => semver.compare(version2, version1));

            logger.verbose(`Versions: ${versions.join(', ')}`);

            return versions;
        } catch (error) {
            if (error?.status === 404) {
                logger.info(`No versions found for ${packageName}, it is a new package`);
                return [];
            }
            logger.error(`Failed to get versions for ${packageName}: ${error?.message}`);
            process.exit(1);
        }
    },
});
