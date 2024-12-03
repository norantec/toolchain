import { ApiPropertyOptional } from '@nestjs/swagger';
import { GROUP } from '../constants/group.constant';
import { Mapping } from '../decorators/mapping.decorator';
import { IsOptional } from 'class-validator';

export class AuthCodeDTO {
    @Mapping()
    @ApiPropertyOptional()
    public id: string;

    @Mapping()
    @ApiPropertyOptional()
    public nextUnlockTimestamp: number;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    @ApiPropertyOptional()
    public createdAt: number;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    @ApiPropertyOptional()
    public updatedAt: number;
}
