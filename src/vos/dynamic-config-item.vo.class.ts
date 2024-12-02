import { Transform } from 'class-transformer';
import { Mapping } from '../decorators/mapping.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export interface DynamicConfig {
    [key: string]: string | number | boolean | null | DynamicConfig | Array<string | number | boolean | null | DynamicConfig>;
};

export class DynamicConfigItemVO {
    @Mapping()
    @ApiPropertyOptional()
    public name: string;

    @Mapping()
    @ApiPropertyOptional()
    @Transform(({ value }) => {
        try {
            return JSON.parse(value);
        } catch (e) {
            return {};
        }
    }, {
        toClassOnly: true,
    })
    @Transform(({ value }) => {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return '{}';
        }
    }, {
        toPlainOnly: true,
    })
    public content: DynamicConfig;
}
