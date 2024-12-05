import { Injectable } from '@nestjs/common';
import {
    RemoteRepo,
    RemoteRepoOptions,
} from '../../classes/remote-repo.class';
import { LoggerService } from '../logger/logger.service';
import { RepositoryService } from '../repository/repository.service';
import { EventService } from '../event/event.service';

@Injectable()
export class InternationalizationService extends RemoteRepo {
    public constructor(
        options: RemoteRepoOptions,
        loggerService: LoggerService,
        repositoryService: RepositoryService,
        eventService: EventService,
    ) {
        super(options, loggerService, repositoryService, eventService);
    }
}
