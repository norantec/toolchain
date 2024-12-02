import { AuthGuard } from '@nestjs/passport';
import { BaseController } from 'src/common/base.controller';
import { Method } from 'src/decorators/method.decorator';
import { UseGuards } from 'src/decorators/use-guards.decorator';
import { UploadService } from './upload.service';
import { ApiController } from 'src/decorators/api-controller.decorator';
import { UploadCredentialVO } from 'src/vos/upload-credential.vo.class';
import { ResponseVO } from 'src/vos/response.vo.class';

@ApiController()
@UseGuards(AuthGuard())
export class UploadController extends BaseController {
    public constructor(private readonly uploadService: UploadService) {
        super();
    }

    @Method(null, UploadCredentialVO, 'normal')
    public async getCredential(): Promise<ResponseVO<UploadCredentialVO>> {
        return new ResponseVO({
            data: await this.uploadService.getCredential(),
        });
    }
}
