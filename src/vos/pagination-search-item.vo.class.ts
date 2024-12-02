import { Mapping } from 'src/decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { SearchOp } from 'src/enums/search-op.enum';

export class PaginationSearchItemVO {
    @ApiProperty({
        enum: SearchOp,
    })
    @Mapping()
    public op: SearchOp;

    @ApiProperty()
    @Mapping()
    public value: string;
}
