import { UseGuards } from '../../decorators/use-guards.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Method } from '../../decorators/method.decorator';
import { UserService } from './user.service';
import { BaseController } from '../../common/base.controller';
import { EntityService } from '../../modules/entity/entity.service';
import { UserDAO } from '../../daos/user.dao.class';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ApiController } from '../../decorators/api-controller.decorator';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
import { UserUpdatePasswordRequestDTO } from '../../dtos/user-update-password-request.dto.class';

@UseGuards(AuthGuard())
@ApiController()
export class UserController extends BaseController {
    public constructor(
        private readonly userService: UserService,
        private readonly entityService: EntityService,
    ) {
        super();
    }

    @Method()
    public async getDetail(@CurrentUser() user: UserDAO) {
        return await this.entityService.getDetail({
            DAOClass: UserDAO,
            locator: JSON.stringify({ id: user?.id }),
            sessionUserId: user?.id,
        });
    }

    @Method()
    public async update(
        @CurrentUser() user: UserDAO,
        @ReflectedBody() data: UserDAO,
        @IsAdmin() isAdmin: boolean,
    ) {
        return await this.userService.createOrUpdate({
            sessionUserId: user?.id,
            data,
            checkPermissions: !isAdmin,
            allowUpdate: true,
        });
    }

    @Method()
    public async updatePassword(
        @CurrentUser() user: UserDAO,
        @ReflectedBody() body: UserUpdatePasswordRequestDTO,
        @IsAdmin() isAdmin: boolean,
    ) {
        return await this.userService.updatePassword({
            sessionUserId: user?.id,
            checkPermissions: !isAdmin,
            password: body?.password,
            originalPassword: body?.originalPassword,
            locator: body?.locator,
        });
    }
}
