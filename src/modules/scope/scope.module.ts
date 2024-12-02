import {
    Global,
    Module,
} from '@nestjs/common';
import { ScopeService } from './scope.service';

export interface ScopeModuleOptions {
    onLog?: (message: string) => void;
}

export interface ScopeModuleAsyncOptions {
    useFactory: (...args: any[]) => Promise<ScopeModuleOptions>;
    inject?: any[];
}

@Global()
@Module({})
export class ScopeModule {
    public static forRoot(options: ScopeModuleOptions) {
        return {
            module: ScopeModule,
            providers: [
                {
                    provide: ScopeService,
                    useFactory: () => new ScopeService(options?.onLog),
                },
            ],
            exports: [ScopeService],
        };
    }

    public static forRootAsync(asyncOptions: ScopeModuleAsyncOptions) {
        return {
            module: ScopeModule,
            providers: [
                {
                    provide: ScopeService,
                    useFactory: async (...args: any[]) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new ScopeService(options?.onLog);
                    },
                    inject: asyncOptions.inject || [],
                },
            ],
            exports: [ScopeService],
        };
    }
}
