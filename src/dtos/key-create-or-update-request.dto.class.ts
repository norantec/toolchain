import { Mapping } from '../decorators/mapping.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class KeyCreateOrUpdateRequestDTO {
    @Mapping()
    @ApiPropertyOptional()
    public locator: string;

    @Mapping()
    @ApiPropertyOptional()
    public deprecated: boolean;

    @Mapping()
    @ApiPropertyOptional()
    @Type(() => Date)
    public expirationTime: Date;

    @Mapping()
    @ApiPropertyOptional()
    public userId: string;

    @Mapping()
    @ApiPropertyOptional()
    public scopePatterns: string;
}
