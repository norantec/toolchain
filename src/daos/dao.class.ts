import { IsOptional } from 'class-validator';
import { GROUP } from '../constants/group.constant';
import { Mapping } from '../decorators/mapping.decorator';
import { ServerMapping } from '../decorators/server-mapping.decorator';
import { Model } from 'sequelize-typescript';
import { Locator } from '../decorators/locator.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
    @ServerMapping(({ Column }) => Column({ field: 'created_at' }))
    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    @ApiPropertyOptional()
    @Type(() => Date)
    public createdAt: Date;

    @ServerMapping(({ UpdatedAt }) => UpdatedAt)
    @ServerMapping(({ Column }) => Column({ field: 'updated_at' }))
    @Mapping({ groups: [GROUP.RESPONSE_ONLY] })
    @IsOptional({ groups: [GROUP.REQUEST_ONLY] })
    @ApiPropertyOptional()
    @Type(() => Date)
    public updatedAt: Date;

    public serialize() {
        return this.toJSON();
    }
}
