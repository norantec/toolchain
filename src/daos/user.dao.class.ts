import { IsOptional } from 'class-validator';
import { DAO } from './dao.class';
import { Mapping } from '../decorators/mapping.decorator';
import { ServerMapping } from '../decorators/server-mapping.decorator';
import { Correlate } from '../decorators/correlate.decorator';
import { Locator } from '../decorators/locator.decorator';
import { SubscriptionDAO } from './subscription.dao.class';
import { KeyDAO } from './key.dao.class';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

@ServerMapping(({ Table }) => Table({
    modelName: 't__users',
    indexes: [
        {
            name: 'unique_email',
            unique: true,
            fields: [
                'email',
            ],
        },
    ],
}))
export class UserDAO extends DAO {
    @ServerMapping(({ Column }) => Column({ field: 'birth_date' }))
    @Mapping()
    @IsOptional()
    @ApiPropertyOptional()
    public birthDate: string;

    @ServerMapping(({ Column }) => Column)
    @IsOptional()
    @Mapping()
    @ApiPropertyOptional()
    public active: boolean;

    @ServerMapping(({ Column }) => Column({ field: 'image_url' }))
    @IsOptional()
    @Mapping()
    @ApiPropertyOptional()
    public imageUrl: string;

    @ServerMapping(({ Column }) => Column({ allowNull: false }))
    @IsOptional()
    @Mapping()
    @ApiPropertyOptional()
    public email: string;

    @ServerMapping(({ Column }) => Column({ field: 'first_name' }))
    @IsOptional()
    @Mapping()
    @ApiPropertyOptional()
    public firstName: string;

    @ServerMapping(({ Column }) => Column({ field: 'last_name' }))
    @IsOptional()
    @Mapping()
    @ApiPropertyOptional()
    public lastName: string;

    @ServerMapping(({ Column }) => Column({ field: 'full_name' }))
    @IsOptional()
    @Mapping()
    @ApiPropertyOptional()
    public fullName: string;

    @ServerMapping(({ Column }) => Column)
    @IsOptional()
    @Mapping({ groups: [] })
    public password: string;

    @ServerMapping(({ Column }) => Column)
    @IsOptional()
    @Mapping()
    @ApiPropertyOptional()
    public verified: boolean;

    @ServerMapping(({ HasMany }) => HasMany(() => SubscriptionDAO, {
        as: 'subscriptions',
    }))
    @Mapping()
    @Locator()
    @Correlate(() => SubscriptionDAO)
    @ApiPropertyOptional({
        isArray: true,
        type: () => SubscriptionDAO,
    })
    public subscriptions: SubscriptionDAO[];

    @ServerMapping(({ HasMany }) => HasMany(() => KeyDAO, {
        as: 'keys',
    }))
    @Mapping()
    @Locator()
    @Correlate(() => KeyDAO)
    @ApiPropertyOptional({
        isArray: true,
        type: () => KeyDAO,
    })
    public keys: KeyDAO[];

    @Mapping({ groups: [] })
    @Type(() => Date)
    public tokenExpirationTime: Date;
}
