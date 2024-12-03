import { ApiProperty } from '@nestjs/swagger';
import { Mapping } from '../decorators/mapping.decorator';

export class FileGetMetadataListRequestDTO {
    @Mapping()
    @ApiProperty({ isArray: true })
    public nameList: string[];
}
