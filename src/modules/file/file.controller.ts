import {
    Body,
    UseGuards,
} from '@nestjs/common';
import { Method } from 'src/decorators/method.decorator';
import { BaseController } from 'src/common/base.controller';
import { FileService } from './file.service';
import { ScopeGuard } from 'src/guards/scope.guard';
import { ApiController } from 'src/decorators/api-controller.decorator';
import { FileVO } from 'src/vos/file.vo.class';
import { ResponseVO } from 'src/vos/response.vo.class';
import { Mapping } from 'src/decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { TransformPipe } from 'src/pipes/transform.pipe';

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
