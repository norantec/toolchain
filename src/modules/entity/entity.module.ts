import {
    Global,
    Module,
} from '@nestjs/common';
import { EntityService } from './entity.service';

@Global()
@Module({
    providers: [EntityService],
    exports: [EntityService],
})
export class EntityModule {}
