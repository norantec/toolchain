import { Mapping } from '../decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class InternationalizationGetRequestDTO {
    @Mapping()
    @ApiProperty({ isArray: true })
    public patterns: string[];
}
