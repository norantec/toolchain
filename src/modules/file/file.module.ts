import {
    DynamicModule,
    Global,
    Module,
} from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import {
    FileModuleAsyncOptions,
    FileModuleOptions,
} from './file.interface';

@Global()
@Module({})
export class FileModule {
    public static forRoot(options: FileModuleOptions): DynamicModule {
        return {
            module: FileModule,
            providers: [
                {
                    provide: FileService,
                    useFactory: () => new FileService(options),
                },
            ],
            controllers: [FileController],
            exports: [FileService],
        };
    }

    public static forRootAsync(asyncOptions: FileModuleAsyncOptions) {
        return {
            module: FileModule,
            providers: [
                {
                    provide: FileService,
                    useFactory: async (...args: any[]) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new FileService(options);
                    },
                    inject: asyncOptions.inject || [],
                },
            ],
            controllers: [FileController],
            exports: [FileService],
        };
    }
}
