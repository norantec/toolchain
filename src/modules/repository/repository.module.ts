import {
    DynamicModule,
    Global,
    Module,
} from '@nestjs/common';
import { RepositoryService } from './repository.service';
import {
    RepositoryModuleAsyncOptions,
    RepositoryModuleOptions,
} from './repository.interface';
import { LoggerService } from '../logger/logger.service';
import * as _ from 'lodash';

@Global()
@Module({})
export class RepositoryModule {
    public static forRoot(options: RepositoryModuleOptions): DynamicModule {
        return {
            module: RepositoryModule,
            providers: [
                {
                    provide: RepositoryService,
                    useFactory: (loggerService: LoggerService) => new RepositoryService(options, loggerService),
                    inject: [LoggerService],
                },
            ],
            exports: [RepositoryService],
        };
    }

    public static async forRootAsync(asyncOptions: RepositoryModuleAsyncOptions): Promise<DynamicModule> {
        return {
            module: RepositoryModule,
            providers: [
                {
                    provide: RepositoryService,
                    useFactory: async (...args: any[]) => {
                        const options = await asyncOptions.useFactory(...args.slice(0, -1));
                        return new RepositoryService(options, _.last(args));
                    },
                    inject: (Array.isArray(asyncOptions.inject) ? asyncOptions.inject : []).concat([
                        LoggerService,
                    ]),
                },
            ],
            exports: [RepositoryService],
        };
    }
}
