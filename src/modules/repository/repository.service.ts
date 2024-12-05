import {
    Inject,
    Injectable,
} from '@nestjs/common';
import { Octokit } from 'octokit';
import axios from 'axios';
import AdmZip = require('adm-zip');
import { relative } from 'path';
import { RepositoryModuleOptions } from './repository.interface';
import { LoggerService } from '../logger/logger.service';

interface RepositoryConfig {
    owner: string;
    name: string;
}

@Injectable()
export class RepositoryService {
    @Inject(LoggerService)
    private readonly loggerService: LoggerService;

    private readonly client = new Octokit({
        auth: this?.options?.accessToken,
    });
    private readonly authorAndCommitterData = {
        name: this.options?.authorName,
        email: this.options?.authorEmail,
    };

    public constructor(private readonly options: RepositoryModuleOptions) {}

    public create(config: RepositoryConfig) {
        const ensureRepository = async () => {
            const {
                owner,
                name,
            } = config;

            try {
                await this.client.rest.repos.createInOrg({
                    org: owner,
                    name,
                });
            } catch (e) {}
        };

        const getFileContent = async (path: string, branch = 'master') => {
            const {
                owner,
                name,
            } = config;

            let content = await this.client.rest.repos.getContent({
                owner,
                repo: name,
                path,
                ref: `heads/${branch}`,
            });

            if (Array.isArray(content)) {
                content = content[0];
            }

            if (!content) {
                return null;
            }

            let {
                size,
                content: fileContent,
                sha,
            } = (content?.data || {}) as any;

            try {
                fileContent = Buffer.from(fileContent, 'base64').toString();
            } catch (e) {}

            return {
                size,
                sha,
                content: fileContent,
            };
        };

        const createOrUpdateFile = async (path: string, content: string, branch = 'master') => {
            const {
                owner,
                name,
            } = config;
            let fileSha: string;

            try {
                fileSha = (await getFileContent(path, branch))?.sha;
            } catch (e) {}

            try {
                const result = await this.client.rest.repos.createOrUpdateFileContents({
                    message: `Create or update ${path}`,
                    content: Buffer.from(content).toString('base64'),
                    owner,
                    repo: name,
                    path,
                    ...(fileSha ? { sha: fileSha } : {}),
                    branch,
                    author: this.authorAndCommitterData,
                    committer: this.authorAndCommitterData,
                });
                return result.data?.commit?.sha;
            } catch (e) {
                this.loggerService.error(e?.message);
                this.loggerService.error(e?.stack);
            }
        };

        const fetchRepositoryContent = async (ref: string) => {
            const {
                name,
                owner,
            } = config;

            try {
                const { data: buffer } = await axios.get(
                    `https://api.github.com/repos/${owner}/${name}/zipball/${ref}`,
                    {
                        headers: {
                            Authorization: `Bearer ${this.options.accessToken}`,
                        },
                        responseType: 'arraybuffer',
                    },
                );
                const zip = new AdmZip(buffer);
                const firstDirectory = zip.getEntries().find((entry) => entry.isDirectory)?.entryName;

                return zip
                    .getEntries()
                    .filter((entry) => !entry.isDirectory)
                    .map((entry) => {
                        return {
                            pathname: relative(firstDirectory, entry.entryName),
                            content: entry.getData().toString(),
                        };
                    });
            } catch (e) {
                this.loggerService.error(e?.message);
                this.loggerService.error(e?.stack);
            }
        };

        return {
            ensureRepository: ensureRepository.bind(this) as typeof ensureRepository,
            getFileContent: getFileContent.bind(this) as typeof getFileContent,
            createOrUpdateFile: createOrUpdateFile.bind(this) as typeof createOrUpdateFile,
            fetchRepositoryContent: fetchRepositoryContent.bind(this) as typeof fetchRepositoryContent,
        };
    }

    public createFromId(repositoryId: string) {
        const [
            owner,
            name,
        ] = (repositoryId || '').split('/');
        return this.create({
            owner,
            name,
        });
    }
}
