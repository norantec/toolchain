import {
    Global,
    Module,
} from '@nestjs/common';
import { MailService } from './mail.service';
import {
    MailModuleAsyncOptions,
    MailModuleOptions,
} from './mail.interface';

@Global()
@Module({})
export class MailModule {
    public static forRoot(options: MailModuleOptions) {
        return {
            module: MailModule,
            providers: [
                {
                    provide: MailService,
                    useFactory: () => new MailService(options),
                },
            ],
            exports: [MailService],
        };
    }

    public static forRootAsync(asyncOptions: MailModuleAsyncOptions) {
        return {
            module: MailModule,
            providers: [
                {
                    provide: MailService,
                    useFactory: async (...args) => {
                        const options = await asyncOptions.useFactory(...args);
                        return new MailService(options);
                    },
                    inject: asyncOptions.inject,
                },
            ],
            exports: [MailService],
        };
    }
}
