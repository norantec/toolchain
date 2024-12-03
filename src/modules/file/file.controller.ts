import { UseGuards } from '@nestjs/common';
import { Method } from '../../decorators/method.decorator';
import { BaseController } from '../../common/base.controller';
import { FileService } from './file.service';
import { ScopeGuard } from '../../guards/scope.guard';
import { ApiController } from '../../decorators/api-controller.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
import { FileGetMetadataListRequestDTO } from '../../dtos/file-get-metadata-list-request.dto.class';

@UseGuards(ScopeGuard)
@ApiController()
export class FileController extends BaseController {
    public constructor(private readonly fileService: FileService) {
        super();
    }

    @Method('normal')
    public async getMetadataList(
        @ReflectedBody() body: FileGetMetadataListRequestDTO,
    ) {
        return await this.fileService.getMetadataList({
            nameList: body?.nameList,
        });
    }
}
