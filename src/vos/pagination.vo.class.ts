import { ApiPropertyOptional } from '@nestjs/swagger';
import { Mapping } from '../decorators/mapping.decorator';

export interface Pagination {
    hasNext: boolean;
    nextCursor?: string;
    previousCursor?: string;
}

export class PaginationVO implements Pagination {
    @Mapping()
    @ApiPropertyOptional()
    public hasNext: boolean;

    @Mapping()
    @ApiPropertyOptional()
    public nextCursor: string;

    @Mapping()
    @ApiPropertyOptional()
    public previousCursor: string;
}
