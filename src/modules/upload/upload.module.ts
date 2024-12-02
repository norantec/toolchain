import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import {
    UploadModuleAsyncOptions,
    UploadModuleOptions,
} from './upload.interface';

@Module({})
export class UploadModule {
    public static forRoot(options: UploadModuleOptions) {
        return {
            module: UploadModule,
            providers: [
                {
                    provide: UploadService,
                    useFactory: () => new UploadService(options),
                },
            ],
            exports: [UploadService],
            controllers: [UploadController],
        };
    }

    public static forRootAsync(asyncOptions: UploadModuleAsyncOptions) {
        return {
            module: UploadModule,
            providers: [
                {
                    provide: UploadService,
                    useFactory: async (...args: any[]) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new UploadService(options);
                    },
                },
            ],
            exports: [UploadService],
            controllers: [UploadController],
        };
    }
}
