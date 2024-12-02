import {
    Global,
    Module,
} from '@nestjs/common';
import { StreamingService } from './streaming.service';
import {
    StreamingModuleOptions,
    StreamingModuleAsyncOptions,
} from './streaming.interface';

@Global()
@Module({})
export class StreamingModule {
    public static forRoot(options?: StreamingModuleOptions) {
        return {
            module: StreamingModule,
            providers: [
                {
                    provide: StreamingService,
                    useFactory: () => new StreamingService(options),
                },
            ],
            exports: [StreamingService],
        };
    }

    public static forRootAsync(asyncOptions?: StreamingModuleAsyncOptions) {
        return {
            module: StreamingModule,
            providers: [
                {
                    provide: StreamingService,
                    useFactory: async (...args: any[]) => new StreamingService(await asyncOptions?.useFactory?.(...args)),
                    inject: asyncOptions?.inject,
                },
            ],
            exports: [StreamingService],
        };
    }
}
