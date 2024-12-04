import {
    forwardRef,
    Global,
    Module,
} from '@nestjs/common';
import { KeyService } from './key.service';
import { KeyController } from './key.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModule } from '../user/user.module';
import { KeyDAO } from '../../daos/key.dao.class';

@Global()
@Module({
    imports: [
        SequelizeModule.forFeature([
            KeyDAO,
        ]),
        forwardRef(() => UserModule),
    ],
    providers: [KeyService],
    exports: [KeyService],
    controllers: [
        KeyController,
    ],
})
export class KeyModule {}
