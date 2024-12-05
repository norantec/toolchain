import { UseGuards } from '@nestjs/common';
import { Method } from '../../decorators/method.decorator';
import { FileService } from './file.service';
import { ScopeGuard } from '../../guards/scope.guard';
import { ApiController } from '../../decorators/api-controller.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
// import { FileGetMetadataListRequestDTO } from '../../dtos/file-get-metadata-list-request.dto.class';

@UseGuards(ScopeGuard)
@ApiController()
export class FileController {
    public constructor(private readonly fileService: FileService) {}

    @Method('normal')
    public async getMetadataList(
        @ReflectedBody() nameList: string[],
    ) {
        return await this.fileService.getMetadataList({
            nameList,
        });
    }
}
