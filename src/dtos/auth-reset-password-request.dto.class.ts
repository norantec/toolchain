import { ApiProperty } from '@nestjs/swagger';
import { AuthRequestCodeRequestDTO } from './auth-request-code-request.dto.class';
import { Mapping } from '../decorators/mapping.decorator';

export class AuthResetPasswordRequestDTO extends AuthRequestCodeRequestDTO {
    @ApiProperty()
    @Mapping()
    public code: string;

    @ApiProperty()
    @Mapping()
    public password: string;
}
