import { ApiPropertyOptional } from '@nestjs/swagger';
import { GROUP } from '../constants/group.constant';
import { Mapping } from '../decorators/mapping.decorator';
import { IsOptional } from 'class-validator';

export class FileDTO {
    @Mapping()
    @ApiPropertyOptional()
    public size: number;

    @Mapping()
    @ApiPropertyOptional()
    public progress: number;

    @Mapping()
    @ApiPropertyOptional()
    public url: string;

    @Mapping()
    @ApiPropertyOptional()
    public name: string;

    @Mapping()
    @ApiPropertyOptional()
    public mimeType: string;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public createdAt: number;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public updatedAt: number;
}
