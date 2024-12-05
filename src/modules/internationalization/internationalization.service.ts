import { Injectable } from '@nestjs/common';
import {
    RemoteRepositoryService,
    RemoteRepositoryOptions,
} from '../remote-repository/remote-repository.service';
import { LoggerService } from '../logger/logger.service';
import { RepositoryService } from '../repository/repository.service';
import { EventService } from '../event/event.service';

@Injectable()
export class InternationalizationService extends RemoteRepositoryService {
    public constructor(
        options: RemoteRepositoryOptions,
        loggerService: LoggerService,
        repositoryService: RepositoryService,
        eventService: EventService,
    ) {
        super(options, loggerService, repositoryService, eventService);
    }
}
