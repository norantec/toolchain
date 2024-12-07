import { KeyService } from './key.service';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { ApiController } from '../../decorators/api-controller.decorator';
import { Method } from '../../decorators/method.decorator';
import { CurrentUserId } from '../../decorators/current-user-id.decorator';
import { KeyListRequestDTO } from '../../dtos/key-list-request.dto.class';
import { KeyCreateOrUpdateRequestDTO } from '../../dtos/key-create-or-update-request.dto.class';

@ApiController()
export class KeyController {
    public constructor(
        private readonly keyService: KeyService,
    ) {}

    @Method()
    public async createOrUpdate(
        @CurrentUserId() sessionUserId: string,
        @ReflectedBody() data: KeyCreateOrUpdateRequestDTO,
        @IsAdmin() isAdmin: boolean,
    ) {
        return await this.keyService.createOrUpdate({
            checkPermissions: !isAdmin,
            sessionUserId,
            ...data,
        });
    }

    @Method()
    public async list(
        @CurrentUserId() sessionUserId: string,
        @ReflectedBody() body: KeyListRequestDTO,
        @IsAdmin() isAdmin: boolean,
    ) {
        return await this.keyService.list({
            checkPermissions: !isAdmin,
            sessionUserId,
            lastCursor: body?.lastCursor,
            limit: body?.limit,
            targetUserId: body?.targetUserId,
            search: body?.search,
        });
    }
}
