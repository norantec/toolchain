import { Body } from '@nestjs/common';
import { UseGuards } from '../../decorators/use-guards.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Method } from '../../decorators/method.decorator';
import { UserService } from './user.service';
import { BaseController } from '../../common/base.controller';
import { EntityService } from '../../modules/entity/entity.service';
import { UserDAO } from '../../daos/user.dao.class';
import { SerializableUtil } from '../../utilities/serializable-util.class';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ApiController } from '../../decorators/api-controller.decorator';
import { TransformPipe } from '../../pipes/transform.pipe';
import { IsAdmin } from '../../decorators/is-admin.decorator';
import { ResponseVO } from '../../vos/response.vo.class';
import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Mapping } from '../../decorators/mapping.decorator';

class UserUpdatePasswordRequestVO {
    @Mapping()
    @ApiProperty()
    public password: string;

    @Mapping()
    @ApiProperty()
    public locator: string;

    @Mapping()
    @ApiProperty()
    public originalPassword: string;
}

@UseGuards(AuthGuard())
@ApiController()
@ApiExtraModels(ResponseVO)
export class UserController extends BaseController {
    public constructor(
        private readonly userService: UserService,
        private readonly entityService: EntityService,
    ) {
        super();
    }

    @Method(null, UserDAO)
    public async getDetail(@CurrentUser() user: UserDAO): Promise<ResponseVO<UserDAO>> {
        return new ResponseVO({
            data: await this.entityService.getDetail({
                DAOClass: UserDAO,
                locator: JSON.stringify({ id: user?.id }),
                sessionUserId: user?.id,
            }).then((result) => SerializableUtil.plainToInstance(UserDAO, result.toJSON())),
        });
    }

    @Method(UserDAO, UserDAO)
    public async update(
        @CurrentUser() user: UserDAO,
        @Body(TransformPipe(UserDAO)) data: UserDAO,
        @IsAdmin() isAdmin: boolean,
    ): Promise<ResponseVO<UserDAO>> {
        return new ResponseVO({
            data: await this.userService.createOrUpdate({
                sessionUserId: user?.id,
                data,
                checkPermissions: !isAdmin,
                allowUpdate: true,
            }),
        });
    }

    @Method(UserUpdatePasswordRequestVO, UserDAO)
    public async updatePassword(
        @CurrentUser() user: UserDAO,
        @Body(TransformPipe(UserUpdatePasswordRequestVO)) body: UserUpdatePasswordRequestVO,
        @IsAdmin() isAdmin: boolean,
    ): Promise<ResponseVO<UserDAO>> {
        return new ResponseVO({
            data: await this.userService.updatePassword({
                sessionUserId: user?.id,
                checkPermissions: !isAdmin,
                password: body?.password,
                originalPassword: body?.originalPassword,
                locator: body?.locator,
            }),
        });
    }
}
