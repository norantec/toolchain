import { AuthGuard } from '@nestjs/passport';
import { BaseController } from '../../common/base.controller';
import { Method } from '../../decorators/method.decorator';
import { UseGuards } from '../../decorators/use-guards.decorator';
import { UploadService } from './upload.service';
import { ApiController } from '../../decorators/api-controller.decorator';

@ApiController()
@UseGuards(AuthGuard())
export class UploadController extends BaseController {
    public constructor(private readonly uploadService: UploadService) {
        super();
    }

    @Method('normal')
    public async getCredential() {
        return await this.uploadService.getCredential();
    }
}
