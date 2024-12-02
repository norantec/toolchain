import { Injectable } from '@nestjs/common';
import {
    RemoteRepo,
    RemoteRepoOptions,
} from '../../classes/remote-repo.class';

@Injectable()
export class InternationalizationService extends RemoteRepo {
    public constructor(options: RemoteRepoOptions) {
        super(options);
    }
}
