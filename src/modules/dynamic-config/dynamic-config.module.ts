import {
    Global,
    Module,
    DynamicModule,
} from '@nestjs/common';
import { DynamicConfigService } from './dynamic-config.service';
import { DynamicConfigController } from './dynamic-config.controller';
import { RemoteRepoOptions } from 'src/classes/remote-repo.class';

export interface DynamicConfigModuleAsyncOptions {
    useFactory: (...args: any[]) => RemoteRepoOptions | Promise<RemoteRepoOptions>;
    inject?: any[];
}

@Global()
@Module({})
export class DynamicConfigModule {
    public static forRoot(options: RemoteRepoOptions): DynamicModule {
        return {
            module: DynamicConfigModule,
            providers: [
                {
                    provide: DynamicConfigService,
                    useFactory: () => new DynamicConfigService(options),
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
                        const options = await asyncOptions.useFactory(...args);
                        return new DynamicConfigService(options);
                    },
                    inject: asyncOptions.inject || [],
                },
            ],
            controllers: [DynamicConfigController], 
            exports: [DynamicConfigService],
        };
    }
}
