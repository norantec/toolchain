import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { z } from 'zod';
import { StringUtil } from '../../utilities/string-util.class';
import {
    Get,
    Paths,
} from 'type-fest';

export interface ServerConfigServiceOptions<T extends z.ZodObject<any>> {
    pathnameList: string[];
    schema: T;
    onError?: (error: Error) => void;
    onLog?: (message: string) => void;
}

@Injectable()
export class ServerConfigService<T extends z.ZodObject<any>> {
    private config: z.infer<T>;
    private loaded = false;

    public constructor(private readonly options: ServerConfigServiceOptions<T>) {
        this.load();
    }

    public get<Path extends string & Paths<z.infer<T>>>(path: Path): Get<z.infer<T>, Path> {
        if (StringUtil.isFalsyString(path)) {
            return null;
        }

        if (!this.loaded) {
            this.load();
        }

        const value = _.get(this.config, path);
        // if (
        //     value !== null &&
        //     ![
        //         'string',
        //         'boolean',
        //         'number',
        //         'bigint',
        //         'symbol',
        //     ].includes(typeof value)
        // ) {
        //     this.options.onError?.(new Error(`Invalid config value: ${value}`));
        // }

        return value;
    }

    private async load() {
        if (this.loaded) {
            return;
        }

        const pathnameList = this.options?.pathnameList;

        if (pathnameList.length === 0) {
            return;
        }

        let userConfig: z.infer<T> = {};

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
            this.config = this.options.schema.parse(userConfig) as z.infer<T>;
        } catch (e) {
            this.options.onError?.(e);
            return {};
        }

        this.loaded = true;
    }
}
