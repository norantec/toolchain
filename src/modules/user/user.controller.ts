import { Method } from '../../decorators/method.decorator';
import { UserService } from './user.service';
import { EntityService } from '../../modules/entity/entity.service';
import { UserDAO } from '../../daos/user.dao.class';
import { CurrentUserId } from '../../decorators/current-user-id.decorator';
import { ApiController } from '../../decorators/api-controller.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
import { UserUpdatePasswordRequestDTO } from '../../dtos/user-update-password-request.dto.class';

@ApiController()
export class UserController {
    public constructor(
        private readonly userService: UserService,
        private readonly entityService: EntityService,
    ) {}

    @Method('normal')
    public async getDetail(@CurrentUserId() sessionUserId: string) {
        return await this.entityService.getDetail({
            DAOClass: UserDAO,
            locator: JSON.stringify({ id: sessionUserId }),
            sessionUserId,
        });
    }

    @Method('normal')
    public async update(
        @CurrentUserId() sessionUserId: string,
        @ReflectedBody() data: UserDAO,
        @IsAdmin() isAdmin: boolean,
    ) {
        return await this.userService.createOrUpdate({
            sessionUserId,
            data,
            checkPermissions: !isAdmin,
            allowUpdate: true,
        });
    }

    @Method('normal')
    public async updatePassword(
        @CurrentUserId() sessionUserId: string,
        @ReflectedBody() body: UserUpdatePasswordRequestDTO,
        @IsAdmin() isAdmin: boolean,
    ) {
        return await this.userService.updatePassword({
            sessionUserId,
            checkPermissions: !isAdmin,
            password: body?.password,
            originalPassword: body?.originalPassword,
            locator: body?.locator,
        });
    }
}
