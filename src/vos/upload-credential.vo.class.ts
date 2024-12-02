import { Mapping } from '../decorators/mapping.decorator';
import { IsOptional } from 'class-validator';
import { GROUP } from '../constants/group.constant';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadCredentialVO {
    @Mapping()
    @ApiPropertyOptional()
    public id: string;

    @Mapping()
    @ApiPropertyOptional()
    public accessKeyId: string;

    @Mapping()
    @ApiPropertyOptional()
    public accessKeySecret: string;

    @Mapping()
    @ApiPropertyOptional()
    public securityToken: string;

    @Mapping()
    @ApiPropertyOptional()
    public expirationTime: number;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public createdAt: number;

    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @ApiPropertyOptional()
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    public updatedAt: number;
}
