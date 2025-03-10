import { Mapping } from '../decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { SearchOp } from '../enums/search-op.enum';

export class PaginationSearchItemDTO {
    @ApiProperty({
        enum: SearchOp,
    })
    @Mapping()
    public op: SearchOp;

    @ApiProperty()
    @Mapping()
    public value: string;
}
