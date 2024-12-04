import { ApiPropertyOptional } from '@nestjs/swagger';
import { GROUP } from '../constants/group.constant';
import { Mapping } from '../decorators/mapping.decorator';
import { IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AuthExchangeDTO {
    @Mapping()
    @ApiPropertyOptional()
    public id: string;

    @Mapping()
    @ApiPropertyOptional()
    public accessToken: string;

    @Mapping()
    @ApiPropertyOptional()
    public refreshToken: string;

    @Mapping()
    @ApiPropertyOptional()
    @Type(() => Date)
    public expirationTime: Date;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public createdAt: number;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public updatedAt: number;
}
