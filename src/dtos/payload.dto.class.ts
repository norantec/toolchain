import { ApiPropertyOptional } from '@nestjs/swagger';
import { GROUP } from '../constants/group.constant';
import { Mapping } from '../decorators/mapping.decorator';
import { IsOptional } from 'class-validator';

export class PayloadDTO {
    @Mapping()
    @ApiPropertyOptional()
    public id: string;

    @Mapping()
    @ApiPropertyOptional()
    public content: string;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public createdAt: number;
}
