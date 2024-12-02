import {
    Inject,
    Injectable,
} from '@nestjs/common';
import {
    WINSTON_MODULE_NEST_PROVIDER,
    WinstonLogger,
} from 'nest-winston';
import {
    NJRS_REQUEST,
    RequestScope,
} from 'nj-request-scope';
import { type RequestWithExtraContext } from 'src/types/request-with-extra-context.type';

@Injectable()
@RequestScope()
export class LoggerService {
    public static getTraceId = () => null;

    public constructor(
        @Inject(NJRS_REQUEST)
        private readonly request: RequestWithExtraContext,
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: WinstonLogger,
    ) {
        this?.logger?.setContext?.((LoggerService?.getTraceId?.() || this?.request?.requestTraceId) as string || 'Generic');
    }

    public log(message: any) {
        this?.logger?.log?.(message);
    }

    public error(message: any) {
        this?.logger?.error?.(message);
    }

    public warn(message: any) {
        this?.logger?.warn?.(message);
    }

    public debug(message: any) {
        this?.logger?.debug?.(message);
    }

    public verbose(message: any) {
        this?.logger?.verbose?.(message);
    }
}
