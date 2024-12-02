import {
    Global,
    Module,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserDAO } from 'src/daos/user.dao.class';

@Global()
@Module({
    imports: [
        SequelizeModule.forFeature([
            UserDAO,
        ]),
    ],
    providers: [UserService],
    controllers: [UserController],
    exports: [UserService],
})
export class UserModule {}
