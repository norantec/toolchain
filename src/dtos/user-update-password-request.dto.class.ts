import { Mapping } from '../decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class UserUpdatePasswordRequestDTO {
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
