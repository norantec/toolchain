import { ApiPropertyOptional } from '@nestjs/swagger';
import { Mapping } from '../decorators/mapping.decorator';
import { IsEnum } from 'class-validator';

enum Type {
    HEADER = 'HEADER',
    OUTPUT = 'OUTPUT',
    EOF = 'EOF',
    BREAKPOINT_REQUEST = 'BREAKPOINT_REQUEST',
    ERROR = 'ERROR',
}

export class InvocationIncomingMessageVO {
    public static Type = Type;

    @Mapping()
    @ApiPropertyOptional()
    public invocationId: string;

    @Mapping()
    @ApiPropertyOptional()
    public sequence: number;

    @Mapping()
    @ApiPropertyOptional()
    @IsEnum(Type)
    public type: Type;

    @Mapping()
    @ApiPropertyOptional()
    public content: string;

    @Mapping()
    @ApiPropertyOptional()
    public errored: boolean;

    @Mapping()
    @ApiPropertyOptional()
    public clientTime: number;

    @Mapping()
    @ApiPropertyOptional()
    public serverTime: number;
}
