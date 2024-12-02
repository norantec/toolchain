import {
    Global,
    Module,
    DynamicModule,
} from '@nestjs/common';
import { InternationalizationService } from './internationalization.service';
import { InternationalizationController } from './internationalization.controller';
import { RemoteRepoOptions } from '../../classes/remote-repo.class';

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
                    useFactory: () => new InternationalizationService(options),
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
                        const options = await asyncOptions.useFactory(...args);
                        return new InternationalizationService(options);
                    },
                    inject: asyncOptions.inject || [],
                },
            ],
            controllers: [InternationalizationController],
            exports: [InternationalizationService],
        };
    }
}
