import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import { PaginationDTO } from './pagination.dto.class';
import { ClassType } from '../types/class-type.type';
import { Mapping } from '../decorators/mapping.decorator';

export class ResponseDTO<T extends ClassType> {
    @ApiProperty({ isArray: true })
    @Mapping()
    public data: T[];

    @ApiPropertyOptional({ type: () => PaginationDTO })
    @Mapping()
    public pagination?: Required<PaginationDTO>;

    @ApiPropertyOptional()
    @Mapping()
    public token?: string;
}
