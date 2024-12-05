import {
    Global,
    Module,
    DynamicModule,
} from '@nestjs/common';
import { DynamicConfigService } from './dynamic-config.service';
import { DynamicConfigController } from './dynamic-config.controller';
import { RemoteRepositoryOptions } from '../remote-repository/remote-repository.service';
import { LoggerService } from '../logger/logger.service';
import { RepositoryService } from '../repository/repository.service';
import { EventService } from '../event/event.service';
import * as _ from 'lodash';

export interface DynamicConfigModuleAsyncOptions {
    useFactory: (...args: any[]) => RemoteRepositoryOptions | Promise<RemoteRepositoryOptions>;
    inject?: any[];
}

@Global()
@Module({})
export class DynamicConfigModule {
    public static forRoot(options: RemoteRepositoryOptions): DynamicModule {
        return {
            module: DynamicConfigModule,
            providers: [
                {
                    provide: DynamicConfigService,
                    useFactory: (
                        loggerService: LoggerService,
                        repositoryService: RepositoryService,
                        eventService: EventService,
                    ) => new DynamicConfigService(
                        options,
                        loggerService,
                        repositoryService,
                        eventService,
                    ),
                    inject: [
                        LoggerService,
                        RepositoryService,
                        EventService,
                    ],
                },
            ],
            controllers: [DynamicConfigController],
            exports: [DynamicConfigService],
        };
    }

    public static forRootAsync(asyncOptions: DynamicConfigModuleAsyncOptions): DynamicModule {
        return {
            module: DynamicConfigModule,
            providers: [
                {
                    provide: DynamicConfigService,
                    useFactory: async (...args: any[]) => {
                        const options = await asyncOptions.useFactory(...args.slice(0, -3));
                        return new DynamicConfigService(
                            options,
                            _.last(args.slice(0, -2)),
                            _.last(args.slice(0, -1)),
                            _.last(args),
                        );
                    },
                    inject: (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []).concat([
                        LoggerService,
                        RepositoryService,
                        EventService,
                    ]),
                },
            ],
            controllers: [DynamicConfigController],
            exports: [DynamicConfigService],
        };
    }
}
