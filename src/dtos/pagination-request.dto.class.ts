import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationSearchItemDTO } from './pagination-search-item.dto.class';
import { Mapping } from '../decorators/mapping.decorator';
import { Correlate } from '../decorators/correlate.decorator';

export class PaginationRequestDTO {
    @ApiPropertyOptional()
    @Mapping()
    public lastCursor: string;

    @ApiPropertyOptional({
        type: () => [[PaginationSearchItemDTO]],
    })
    @Mapping()
    @Correlate(() => PaginationSearchItemDTO)
    public search: PaginationSearchItemDTO[][];

    @ApiPropertyOptional()
    @Mapping()
    public limit: number;
}
