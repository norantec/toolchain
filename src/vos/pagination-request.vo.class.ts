import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationSearchItemVO } from './pagination-search-item.vo.class';
import { Mapping } from 'src/decorators/mapping.decorator';
import { Correlate } from 'src/decorators/correlate.decorator';

export class PaginationRequestVO {
    @ApiPropertyOptional()
    @Mapping()
    public lastCursor: string;

    @ApiPropertyOptional({
        type: () => [[PaginationSearchItemVO]],
    })
    @Mapping()
    @Correlate(() => PaginationSearchItemVO)
    public search: PaginationSearchItemVO[][];

    @ApiPropertyOptional()
    @Mapping()
    public limit: number;
}
