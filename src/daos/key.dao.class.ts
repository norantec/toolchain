import { ServerMapping } from '../decorators/server-mapping.decorator';
import { DAO } from './dao.class';
import { Mapping } from '../decorators/mapping.decorator';
import { Correlate } from '../decorators/correlate.decorator';
import { UserDAO } from './user.dao.class';
import { Locator } from '../decorators/locator.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtil } from '../utilities/string-util.class';
import { minimatch } from 'minimatch';

@ServerMapping(({ Table }) => Table({
    modelName: 't__keys',
}))
export class KeyDAO extends DAO {
    @ServerMapping(({ Column }) => Column)
    @ServerMapping(({ Index }) => Index({ unique: true }))
    @Mapping()
    @ApiPropertyOptional()
    public secret: string;

    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        field: 'expiration_time',
        type: DataType.BIGINT,
        defaultValue: null,
    }))
    @Mapping()
    @ApiPropertyOptional()
    public expirationTime: number;

    @ServerMapping(({ Column }) => Column({ defaultValue: false }))
    @Mapping()
    @ApiPropertyOptional()
    public deprecated: boolean;

    @ServerMapping(({ BelongsTo }) => BelongsTo(() => UserDAO))
    @Locator()
    @Correlate(() => UserDAO)
    @Mapping({ groups: [] })
    @ApiPropertyOptional({ type: () => UserDAO })
    public user: UserDAO;

    @ServerMapping(({ ForeignKey }) => ForeignKey(() => UserDAO))
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        allowNull: false,
        field: 'user_id',
        type: DataType.UUID,
    }))
    @Locator('user_id')
    @Mapping()
    @ApiPropertyOptional()
    public userId: string;

    @Mapping()
    @ServerMapping(({
        Column,
        DataType,
    }) => Column({
        type: DataType.TEXT('long'),
        field: 'scope_patterns',
    }))
    public scopePatterns: string;

    public matchScope(scopeIdentifier: string) {
        if (StringUtil.isFalsyString(scopeIdentifier)) {
            return false;
        }

        const parsedScopePatterns: string[] = StringUtil.isFalsyString(this.scopePatterns)
            ? []
            : this.scopePatterns.split(',').filter((scopePattern) => !StringUtil.isFalsyString(scopePattern));

        if (parsedScopePatterns.length === 0) {
            return true;
        }

        return parsedScopePatterns.some((scopePattern) => minimatch(scopeIdentifier, scopePattern));
    }
}
