import {
    PipeTransform,
    Injectable,
} from '@nestjs/common';
import * as _ from 'lodash';

@Injectable()
export class PermanentlyParseIntPipe implements PipeTransform {
    public transform(value: any) {
        const permanentParseInt = (value: any) => {
            if (_.isNull(value) || _.isUndefined(value)) {
                return undefined;
            }

            try {
                const newValue = parseInt(value, 10);
                return Number.isNaN(newValue) ? undefined : newValue;
            } catch (e) {
                return undefined;
            }
        };

        if (_.isNumber(value)) {
            return value;
        }

        if (_.isString(value)) {
            return permanentParseInt(value);
        }

        if (_.isArray(value)) {
            return value
                .map((item) => permanentParseInt(item))
                .filter((item) => _.isNumber(item));
        }

        return undefined;
    }
}
