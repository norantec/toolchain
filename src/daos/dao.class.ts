import { IsOptional } from 'class-validator';
import { GROUP } from '../constants/group.constant';
import { Mapping } from '../decorators/mapping.decorator';
import { ServerMapping } from '../decorators/server-mapping.decorator';
import { Model } from 'sequelize-typescript';
import { Locator } from '../decorators/locator.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DAO extends Model {
    @ServerMapping(({
        Column,
        UUIDV4,
        DataType,
    }) => Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: UUIDV4,
    }))
    @Locator()
    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    @ApiPropertyOptional()
    public id: string;

    @Mapping({ groups: [GROUP.REQUEST_ONLY] })
    public locator: string;

    @ServerMapping(({ CreatedAt }) => CreatedAt)
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        field: 'created_at',
        type: DataType.BIGINT,
    }))
    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    @ApiPropertyOptional()
    public createdAt: number;

    @ServerMapping(({ UpdatedAt }) => UpdatedAt)
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        field: 'updated_at',
        type: DataType.BIGINT,
    }))
    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    @ApiPropertyOptional()
    public updatedAt: number;
}
