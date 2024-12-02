import { AuthGuard } from '@nestjs/passport';
import { BaseController } from '../../common/base.controller';
import { Method } from '../../decorators/method.decorator';
import { UseGuards } from '../../decorators/use-guards.decorator';
import { UploadService } from './upload.service';
import { ApiController } from '../../decorators/api-controller.decorator';
import { UploadCredentialVO } from '../../vos/upload-credential.vo.class';
import { ResponseVO } from '../../vos/response.vo.class';

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
