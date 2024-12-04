import { ApiProperty } from '@nestjs/swagger';
import { Mapping } from '../decorators/mapping.decorator';

export class AuthRequestCodeRequestDTO {
    @ApiProperty()
    @Mapping()
    public email: string;
}
