import {
    Global,
    Module,
    DynamicModule,
} from '@nestjs/common';
import { InternationalizationService } from './internationalization.service';
import { InternationalizationController } from './internationalization.controller';
import { RemoteRepoOptions } from '../../classes/remote-repo.class';
import { LoggerService } from '../logger/logger.service';
import { RepositoryService } from '../repository/repository.service';
import { EventService } from '../event/event.service';
import * as _ from 'lodash';

export interface InternationalizationModuleAsyncOptions {
    useFactory: (...args: any[]) => RemoteRepoOptions | Promise<RemoteRepoOptions>;
    inject?: any[];
}

@Global()
@Module({})
export class InternationalizationModule {
    public static forRoot(options: RemoteRepoOptions): DynamicModule {
        return {
            module: InternationalizationModule,
            providers: [
                {
                    provide: InternationalizationService,
                    useFactory: (
                        loggerService: LoggerService,
                        repositoryService: RepositoryService,
                        eventService: EventService,
                    ) => new InternationalizationService(
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
            controllers: [InternationalizationController],
            exports: [InternationalizationService],
        };
    }

    public static forRootAsync(asyncOptions: InternationalizationModuleAsyncOptions): DynamicModule {
        return {
            module: InternationalizationModule,
            providers: [
                {
                    provide: InternationalizationService,
                    useFactory: async (...args: any[]) => {
                        const options = await asyncOptions.useFactory(...args.slice(0, -3));
                        return new InternationalizationService(
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
            controllers: [InternationalizationController],
            exports: [InternationalizationService],
        };
    }
}
