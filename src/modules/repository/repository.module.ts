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

@Global()
@Module({})
export class RepositoryModule {
    public static forRoot(options: RepositoryModuleOptions): DynamicModule {
        return {
            module: RepositoryModule,
            providers: [
                {
                    provide: RepositoryService,
                    useFactory: () => new RepositoryService(options),
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
                        const options = await asyncOptions.useFactory(...args);
                        return new RepositoryService(options);
                    },
                    inject: asyncOptions.inject || [],
                },
            ],
            exports: [RepositoryService],
        };
    }
}
