import * as yup from 'yup';
import * as commander from 'commander';
import { BumpAdapterFactory } from '../bump-adapter-factory.class';
import { Octokit } from 'octokit';
import * as semver from 'semver';

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
            const octokit = new Octokit({
                auth: options.token,
                log: {
                    debug: () => {},
                    info: () => {},
                    error: () => {},
                    warn: () => {},
                },
            });
            const response = await octokit.request(`GET /${options.isOrg ? 'orgs' : 'users'}/{owner}/packages/npm/{package_name}/versions`, {
                owner: options.owner,
                package_name: packageName.split('/').pop(),
            });
            const versions = response.data.map((pkg) => pkg.name);

            if (!Array.isArray(versions)) {
                return [];
            }

            return versions.sort((version1, version2) => semver.compare(version2, version1));
        } catch (error) {
            if (error?.status === 404) {
                return [];
            }
            logger.error(`Failed to get versions for ${packageName}: ${error?.message}`);
            return null;
        }
    },
});
