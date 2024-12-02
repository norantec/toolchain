import {
    Body,
    UseGuards,
} from '@nestjs/common';
import { Method } from '../../decorators/method.decorator';
import { BaseController } from '../../common/base.controller';
import { FileService } from './file.service';
import { ScopeGuard } from '../../guards/scope.guard';
import { ApiController } from '../../decorators/api-controller.decorator';
import { FileVO } from '../../vos/file.vo.class';
import { ResponseVO } from '../../vos/response.vo.class';
import { Mapping } from '../../decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { TransformPipe } from '../../pipes/transform.pipe';

class FileGetMetadataListRequestVO {
    @Mapping()
    @ApiProperty({ isArray: true })
    public nameList: string[];
}

@UseGuards(ScopeGuard)
@ApiController()
export class FileController extends BaseController {
    public constructor(private readonly fileService: FileService) {
        super();
    }

    @Method(FileGetMetadataListRequestVO, FileVO, 'normal')
    public async getMetadataList(
        @Body(TransformPipe(FileGetMetadataListRequestVO)) body: FileGetMetadataListRequestVO,
    ): Promise<ResponseVO<FileVO>> {
        return new ResponseVO({
            data: await this.fileService.getMetadataList({
                nameList: body?.nameList,
            }),
        });
    }
}
