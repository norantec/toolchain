import { Method } from '../../decorators/method.decorator';
import { FileService } from './file.service';
import { ApiController } from '../../decorators/api-controller.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';

@ApiController({ authStrategies: false })
export class FileController {
    public constructor(private readonly fileService: FileService) {}

    @Method('normal')
    public async list(
        @ReflectedBody() nameList: string[],
    ) {
        return await this.fileService.list({ nameList });
    }
}
