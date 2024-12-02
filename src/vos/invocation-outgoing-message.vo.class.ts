import { IsEnum } from 'class-validator';
import { Mapping } from '../decorators/mapping.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum Event {
    START = 'START',
    BREAKPOINT_RESPONSE = 'BREAKPOINT_RESPONSE',
    CANCEL = 'CANCEL',
}

export class InvocationOutgoingMessageVO {
    public static Event = Event;

    @Mapping()
    @ApiPropertyOptional()
    @IsEnum(Event)
    public event: Event;

    @Mapping()
    @ApiPropertyOptional()
    public invocationId: string;

    @Mapping()
    @ApiPropertyOptional()
    public content: string;
}
