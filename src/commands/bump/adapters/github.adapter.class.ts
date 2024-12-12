import * as yup from 'yup';
import * as commander from 'commander';
import { BumpAdapterFactory } from '../bump-adapter-factory.class';
import { Octokit } from 'octokit';
import * as semver from 'semver';
import { StringUtil } from '../../../utilities/string-util.class';

export const GithubAdapter = BumpAdapterFactory.create({
    schema: yup.object().shape({
        token: yup.string().required(),
        owner: yup.string().required(),
        isOrg: yup.boolean().optional().default(false),
    }),
    register: () => {
        const subCommand = new commander.Command('github');
        subCommand
            .requiredOption('--token <string>', 'GitHub token')
            .requiredOption('--owner <string>', 'GitHub owner name')
            .option('--is-org', 'Current owner is an organization');
        return subCommand;
    },
    getVersions: async (logger, packageName, options) => {
        try {
            logger.verbose('Creating Octokit instance');
            const octokit = new Octokit({
                auth: options.token,
                log: {
                    debug: () => {},
                    info: () => {},
                    error: () => {},
                    warn: () => {},
                },
            });
            logger.verbose('Octokit instance created');
            logger.verbose(`Requesting versions for ${packageName}`);
            const route = `GET /${options.isOrg ? 'orgs' : 'users'}/{owner}/packages/npm/{package_name}/versions`;
            logger.verbose(`Using route: ${route}`);
            const response = await octokit.request(route, {
                owner: options.owner,
                package_name: packageName.split('/').pop(),
            });
            logger.verbose('Response received');

            if (!Array.isArray(response.data)) {
                logger.warn('Response is not an array, returning empty array...');
                return [];
            }

            return response.data
                .map((version) => version.name)
                .filter((version) => !StringUtil.isFalsyString(version))
                .sort((version1, version2) => semver.compare(version2, version1));
        } catch (error) {
            if (error?.status === 404) {
                logger.info(`No versions found for ${packageName}, it is a new package`);
                return [];
            }
            logger.error(`Failed to get versions for ${packageName}: ${error?.message}`);
            return null;
        }
    },
});
