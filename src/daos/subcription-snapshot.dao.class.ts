import { Mapping } from '../decorators/mapping.decorator';
import { SubscriptionDAO } from './subscription.dao.class';
import { ServerMapping } from '../decorators/server-mapping.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';

@ServerMapping(({ Table }) => Table({
    modelName: 't__subscription_snapshots',
    indexes: [
        {
            name: 'unique_txn',
            unique: true,
            fields: [
                'txn',
            ],
        },
    ],
}))
export class SubscriptionSnapshotDAO extends SubscriptionDAO {
    @Mapping()
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        allowNull: false,
        field: 'ended_at',
        type: DataType.BIGINT,
    }))
    @ApiPropertyOptional()
    public endedAt: number;
}
