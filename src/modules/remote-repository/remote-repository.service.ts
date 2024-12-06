import {
    ForbiddenException,
    OnModuleInit,
} from '@nestjs/common';
import { type Request } from 'express';
import { RepositoryService } from '../repository/repository.service';
import { minimatch } from 'minimatch';
import * as path from 'path';
import * as fs from 'fs-extra';
import { plainToInstance } from 'class-transformer';
import { EventService } from '../event/event.service';
import { ResultDTO } from '../../dtos/result.dto.class';
import { RemoteRepositoryContentDTO } from '../../dtos/remote-repository-content.dto.class';
import { LoggerService } from '../logger/logger.service';
import { CryptoUtil } from '../../utilities/crypto-util.class';

interface ConfigFile {
    pathname: string;
    content: Record<string, any>;
}

export interface RemoteRepositoryOptions {
    eventName: string;
    devCacheFilePathname: string;
    repo: {
        id: string;
        ref: string;
    };
    webhookSecretValue: string;
    webhookSecretHeaderName: string;
}

export class RemoteRepositoryService implements OnModuleInit {
    private configFiles: ConfigFile[] = [];

    public constructor(
        private readonly options: RemoteRepositoryOptions,
        protected loggerService: LoggerService,
        protected repositoryService: RepositoryService,
        protected eventService: EventService,
    ) {
        if (
            process.env.NODE_ENV === 'development' &&
            fs.existsSync(this.options.devCacheFilePathname)
        ) {
            try {
                this.configFiles = JSON.parse(fs.readFileSync(this.options.devCacheFilePathname).toString());
            } catch (e) {}
        }
    }

    public onModuleInit() {
        this.fetch();
        setInterval(() => {
            this.fetch.call(this);
        }, 10 * 60 * 1000);
    }

    public async onUpdate(
        data: any,
        request: Request,
    ) {
        const startTimeStr = new Date().toISOString();
        this.loggerService.log('Got `push` event from webhook');

        if (!this.verifySignature(request)) {
            this.loggerService.error('Signature not match, returning...');
            throw new ForbiddenException();
        }

        const ref: string = data?.ref;

        this.loggerService.log(`Got ref: ${ref}, config ref: ${this.options?.repo?.ref}`);

        if (!ref || this.options?.repo?.ref !== ref) {
            this.loggerService.error(`Repo ref does not match, config: ${this.options?.repo?.ref}, incoming ref: ${ref}`);
            return plainToInstance(ResultDTO, {
                success: false,
                createdAt: startTimeStr,
                updatedAt: Date.now(),
            });
        }

        const { success } = await this.fetch();

        return plainToInstance(ResultDTO, {
            success,
            createdAt: startTimeStr,
            updatedAt: Date.now(),
        });
    }

    public get(patterns: string[], strictMode = false) {
        if (!Array.isArray(patterns) || patterns.some((item) => !item || typeof item !== 'string')) {
            return {};
        }

        const configJson = this.configFiles.find((file) => file.pathname === 'config.json');
        const files = this.configFiles.filter((item) => {
            return patterns.some((pattern) => {
                return minimatch(item.pathname, pattern + '.json') && (
                    strictMode
                        ? configJson?.content?.item?.publicFilePatterns?.some?.((publicFilePattern) => {
                            return minimatch(item.pathname, publicFilePattern + '.json');
                        })
                        : true
                );
            });
        });

        if (!files.length) {
            return {};
        }

        return files.reduce((result, file) => {
            const configItem = new RemoteRepositoryContentDTO();
            configItem.content = file.content;
            configItem.name = path.join(path.dirname(file.pathname), path.parse(file.pathname).name);
            result[configItem.name] = configItem;
            return result;
        }, {} as Record<string, RemoteRepositoryContentDTO>);
    }

    public async initDevCache() {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        if (fs.existsSync(this.options.devCacheFilePathname)) {
            return;
        }

        await this.fetch();
    }

    private async fetch() {
        try {
            const repositoryId = this.options?.repo?.id;
            const repositoryClient = this.repositoryService.createFromId(repositoryId);
            const remoteRepositoryFiles = await repositoryClient
                .fetchRepositoryContent(this.options?.repo?.ref)
                .then((files) => {
                    return files
                        .map((file) => {
                            let content: Record<string, any> = {};
                            try {
                                content = JSON.parse(file?.content);
                            } catch (e) {}
                            return {
                                ...file,
                                content,
                            };
                        })
                        .map((file) => {
                            return {
                                ...file,
                            } as ConfigFile;
                        });
                });

            this.configFiles = remoteRepositoryFiles;
            this.eventService.fire(this.options.eventName, {});

            if (process.env.NODE_ENV === 'development') {
                try {
                    this.writeDevCacheFile();
                } catch (e) {}
            }

            return {
                success: true,
            };
        } catch (e) {
            this.loggerService.error(e?.message);
            this.loggerService.error(e?.stack);
            return {
                success: false,
            };
        }
    }

    private writeDevCacheFile() {
        try {
            fs.mkdirpSync(path.dirname(this.options.devCacheFilePathname));
        } catch (e) {}

        if (fs.existsSync(this.options.devCacheFilePathname) && !fs.statSync(this.options.devCacheFilePathname).isFile()) {
            fs.remove(this.options.devCacheFilePathname);
        }

        if (
            !fs.existsSync(this.options.devCacheFilePathname) ||
            !fs.readFileSync(this.options.devCacheFilePathname).toString()?.length
        ) {
            fs.writeFileSync(
                this.options.devCacheFilePathname,
                JSON.stringify(this.configFiles, null, 4),
                {
                    encoding: 'utf-8',
                },
            );
        }
    }

    private verifySignature(req: Request) {
        const webhookSecretValue = this.options.webhookSecretValue;
        const webhookSecretHeader = this.options.webhookSecretHeaderName;
        const signature = CryptoUtil.createSignature(
            JSON.stringify(req.body),
            webhookSecretValue,
        );
        return `sha256=${signature}` === req.headers?.[webhookSecretHeader];
    }
}
