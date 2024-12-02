import { Mapping } from '../decorators/mapping.decorator';
import { JSONUtil } from '../utilities/json-util.class';
import { StringUtil } from '../utilities/string-util.class';
import { PaymentDuration } from '../enums/payment-duration.enum';
import { PlanRestrictionType } from '../enums/plan-restriction-type.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PlanVO {
    @Mapping()
    @ApiPropertyOptional()
    public productId: string;

    @Mapping()
    @ApiPropertyOptional()
    public identifier: string;

    @Mapping({ groups: [] })
    @ApiPropertyOptional()
    public isBuiltIn: boolean;

    @Mapping()
    @ApiPropertyOptional()
    public title: string;

    /**
     * @unit USD Cent
     */
    @Mapping()
    @ApiPropertyOptional()
    public dailyCost: string;

    /**
     * @unit USD Cent
     * @example {"1:months": 0.95,"3:months":0.92}
     */
    @Mapping()
    @ApiPropertyOptional()
    public durationRatio: string;

    /**
     * @example {"MEMBER_COUNT_LIMIT":5}
     */
    @Mapping()
    @ApiPropertyOptional()
    public restrictions: string;

    public getParsedRestrictions(): Record<string, number> {
        if (StringUtil.isFalsyString(this.restrictions)) {
            return {};
        }
        return Object
            .entries(JSONUtil.parse(this.restrictions))
            .reduce((result, [key, value]) => {
                if (
                    !(typeof value === 'number' && value >= 0) ||
                    !(Object.values(PlanRestrictionType) as string[]).includes(key)
                ) {
                    return result;
                }
                result[key] = value;
                return result;
            }, {});
    }

    public getParsedDurationRatio(): Record<string, number> {
        if (StringUtil.isFalsyString(this.durationRatio)) {
            return {};
        }
        return Object
            .entries(JSONUtil.parse(this.durationRatio))
            .reduce((result, [key, value]) => {
                const [timeAmountRaw, type] = key.split(':');
                const timeAmount = Number(timeAmountRaw);

                if (!(typeof value === 'number' && value > 0)) {
                    return result;
                }

                if (key === '-1::') {
                    result[key] = value;
                    return result;
                }

                if (
                    !(timeAmount > 0) ||
                    !(Object.values(PaymentDuration) as string[]).includes(type)
                ) {
                    return result;
                }

                result[key] = value;
                return result;
            }, {} as Record<string, number>);
    }
}
