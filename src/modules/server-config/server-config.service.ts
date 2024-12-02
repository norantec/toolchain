import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { z } from 'zod';
import { StringUtil } from '../../utilities/string-util.class';
import { Get } from 'type-fest';
import { ServerConfigModuleOptions } from './server-config.interface';

@Injectable()
export class ServerConfigService<S extends z.ZodObject<any> = any> {
    public static getConfigPathnameList: () => string[] = () => [];
    private config: z.infer<S>;
    private loaded = false;

    public constructor(private readonly options: ServerConfigModuleOptions<S>) {
        this.load();
    }

    public get<Path extends string>(path: Path): Get<z.infer<S>, Path> {
        if (StringUtil.isFalsyString(path)) {
            return null;
        }

        if (!this.loaded) {
            this.load();
        }

        const value = _.get(this.config, path);

        if (
            value !== null &&
            ![
                'string',
                'boolean',
                'number',
                'bigint',
                'symbol',
            ].includes(typeof value)
        ) {
            this.options.onError?.(new Error(`Invalid config value: ${value}`));
        }

        return value;
    }

    private async load() {
        if (this.loaded) {
            return;
        }

        const pathnameList = ServerConfigService.getConfigPathnameList();

        if (pathnameList.length === 0) {
            return;
        }

        let userConfig: z.infer<S> = {};

        pathnameList.forEach((pathname) => {
            const filePath = path.resolve(pathname?.startsWith?.('~' + path.sep) ? os.homedir() : process.cwd(), pathname);
            try {
                this.options.onLog?.(`Loading config file: ${filePath}`);
                userConfig = _.merge(
                    {},
                    userConfig,
                    JSON.parse(fs.readFileSync(filePath).toString()),
                );
                this.options.onLog?.(`Loaded config file: ${filePath}`);
            } catch (e) {
                this.options.onError?.(new Error(`Loading config file error: ${e?.message}`));
                return;
            }
        });

        try {
            this.config = this.options.schema.parse(userConfig) as z.infer<S>;
        } catch (e) {
            this.options.onError?.(new Error(`cast error: ${e} ${e?.stack}`));
            process.exit(1);
        }

        this.loaded = true;
    }
}
