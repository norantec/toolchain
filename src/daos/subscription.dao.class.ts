import { Type } from 'class-transformer';
import { Correlate } from '../decorators/correlate.decorator';
import { Locator } from '../decorators/locator.decorator';
import { Mapping } from '../decorators/mapping.decorator';
import { ServerMapping } from '../decorators/server-mapping.decorator';
import { DAO } from './dao.class';
import { UserDAO } from './user.dao.class';
import { ApiPropertyOptional } from '@nestjs/swagger';

@ServerMapping(({ Table }) => Table({
    modelName: 't__subscriptions',
    indexes: [
        {
            name: 'unique_target',
            unique: true,
            fields: [
                'target',
            ],
        },
    ],
}))
export class SubscriptionDAO extends DAO {
    @Mapping()
    @Type(() => Date)
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        allowNull: false,
        field: 'expiration_time',
        type: DataType.DATE,
    }))
    @ApiPropertyOptional()
    public expirationTime: Date;

    /**
     * @unit USD Cent
     */
    @Mapping()
    @ServerMapping(({ Column }) => Column({
        field: 'paid_amount',
        allowNull: false,
    }))
    @ApiPropertyOptional()
    public paidAmount: string;

    @Mapping()
    @ServerMapping(({ Column }) => Column({
        field: 'target',
        allowNull: false,
    }))
    @ApiPropertyOptional()
    public target: string;

    /**
     * @unit USD Cent
     */
    @Mapping()
    @ServerMapping(({ Column }) => Column({
        field: 'remained_amount',
        allowNull: false,
    }))
    @ApiPropertyOptional()
    public remainedAmount: string;

    @Mapping()
    @Locator()
    @ServerMapping(({ Column }) => Column({
        allowNull: false,
    }))
    @ApiPropertyOptional()
    public txn: string;

    @Mapping()
    @Locator('plan_identifier')
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        field: 'plan_identifier',
        type: DataType.UUID,
        allowNull: false,
    }))
    @ApiPropertyOptional()
    public planIdentifier: string;

    @Mapping()
    @Locator()
    @Correlate(() => UserDAO)
    @ServerMapping(({ BelongsTo }) => BelongsTo(() => UserDAO))
    @ApiPropertyOptional({ type: () => UserDAO })
    public creator: UserDAO;

    @Mapping()
    @Locator('creator_id')
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        field: 'creator_id',
        type: DataType.UUID,
        allowNull: false,
    }))
    @ServerMapping(({ ForeignKey }) => ForeignKey(() => UserDAO))
    @ApiPropertyOptional()
    public creatorId: string;
}
