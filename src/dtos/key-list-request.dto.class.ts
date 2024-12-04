import { ApiPropertyOptional } from '@nestjs/swagger';
import { Mapping } from '../decorators/mapping.decorator';
import { PaginationRequestDTO } from './pagination-request.dto.class';

export class KeyListRequestDTO extends PaginationRequestDTO {
    @Mapping()
    @ApiPropertyOptional()
    public targetUserId: string;
}
