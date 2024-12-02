import { ApiPropertyOptional } from '@nestjs/swagger';
import { Mapping } from '../decorators/mapping.decorator';

export class LanguageVO {
    @Mapping()
    @ApiPropertyOptional()
    public code: string;

    @Mapping()
    @ApiPropertyOptional()
    public englishName: string;

    @Mapping()
    @ApiPropertyOptional()
    public nativeName: string;
}
