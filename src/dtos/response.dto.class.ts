import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import { PaginationDTO } from './pagination.dto.class';
import { ClassType } from '../types/class-type.type';
import { Mapping } from '../decorators/mapping.decorator';
import { Correlate } from '../decorators/correlate.decorator';

export class ResponseDTO<T extends ClassType> {
    @ApiProperty({ isArray: true })
    @Mapping({ hideOpenApiProperty: true })
    public data: T[];

    @ApiPropertyOptional({ type: () => PaginationDTO })
    @Mapping()
    @Correlate(() => PaginationDTO)
    public pagination?: PaginationDTO;

    @ApiPropertyOptional()
    @Mapping()
    public token?: string;
}
