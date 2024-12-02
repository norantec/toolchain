import {
    DynamicModule,
    Global,
    Module,
} from '@nestjs/common';
import { ServerConfigService } from './server-config.service';
import { type z } from 'zod';
import {
    ServerConfigModuleOptions,
    ServerConfigModuleAsyncOptions,
} from './server-config.interface';

@Global()
@Module({})
export class ServerConfigModule {
    public static forRoot<S extends z.ZodObject<any>>(options: ServerConfigModuleOptions<S>): DynamicModule {
        return {
            module: ServerConfigModule,
            providers: [
                {
                    provide: ServerConfigService,
                    useFactory: () => new ServerConfigService(options),
                },
            ],
            exports: [ServerConfigService],
        };
    }

    public static forRootAsync<S extends z.ZodObject<any>>(asyncOptions: ServerConfigModuleAsyncOptions<S>): DynamicModule {
        return {
            module: ServerConfigModule,
            providers: [
                {
                    provide: ServerConfigService,
                    useFactory: async (...args: any[]) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new ServerConfigService(options);
                    },
                    inject: asyncOptions.inject || [],
                },
            ],
            exports: [ServerConfigService],
        };
    }
}
