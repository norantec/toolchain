import { AuthGuard } from '@nestjs/passport';
import { Method } from '../../decorators/method.decorator';
import { UseGuards } from '../../decorators/use-guards.decorator';
import { UploadService } from './upload.service';
import { ApiController } from '../../decorators/api-controller.decorator';

@ApiController()
@UseGuards(AuthGuard())
export class UploadController {
    public constructor(private readonly uploadService: UploadService) {}

    @Method('normal')
    public async getCredential() {
        return await this.uploadService.getCredential();
    }
}
