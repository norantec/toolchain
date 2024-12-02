import {
    Inject,
    Injectable,
} from '@nestjs/common';
import {
    REQUEST,
    HttpAdapterHost,
} from '@nestjs/core';
import { EventService } from '../modules/event/event.service';
import { type RequestWithExtraContext } from '../types/request-with-extra-context.type';

@Injectable()
export class BaseController {
    @Inject(REQUEST)
    protected readonly $request: RequestWithExtraContext;

    @Inject(HttpAdapterHost)
    protected readonly $httpAdapterHost: HttpAdapterHost;

    @Inject(EventService)
    protected readonly $eventService: EventService;
}
