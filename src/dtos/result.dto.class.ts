import { ApiPropertyOptional } from '@nestjs/swagger';
import { GROUP } from '../constants/group.constant';
import { Mapping } from '../decorators/mapping.decorator';
import { IsOptional } from 'class-validator';

export class ResultDTO {
    @Mapping()
    @ApiPropertyOptional()
    public id: string;

    @Mapping()
    @ApiPropertyOptional()
    public success: boolean;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public createdAt: number;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public updatedAt: number;
}
