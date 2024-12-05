import {
    // Req,
    UseGuards,
    // UseInterceptors,
} from '@nestjs/common';
import { Method } from '../../decorators/method.decorator';
import { FileService } from './file.service';
import { ScopeGuard } from '../../guards/scope.guard';
import { ApiController } from '../../decorators/api-controller.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
// import { Request } from 'express';
// import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(ScopeGuard)
@ApiController()
export class FileController {
    public constructor(private readonly fileService: FileService) {}

    @Method('normal')
    public async list(
        @ReflectedBody() nameList: string[],
    ) {
        return await this.fileService.list({ nameList });
    }
}
