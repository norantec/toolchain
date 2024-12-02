import {
    Global,
    Module,
} from '@nestjs/common';
import { ContextService } from './context.service';
import { RequestScopeModule } from 'nj-request-scope';

@Global()
@Module({
    imports: [RequestScopeModule],
    providers: [ContextService],
    exports: [ContextService],
})
export class ContextModule {}
