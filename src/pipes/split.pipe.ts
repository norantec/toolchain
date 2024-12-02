import {
    Injectable,
    PipeTransform,
    Type,
    mixin,
} from '@nestjs/common';
import * as _ from 'lodash';

function createSplitPipe(splitter: string | RegExp = ',', limit?: number) {
    @Injectable()
    class SplitPipe implements PipeTransform {
        public transform(value: any) {
            if (typeof value !== 'string') {
                return [];
            }
            return value.split(splitter, limit);
        }
    }

    return mixin(SplitPipe);
}

export const SplitPipe: (splitter?: string | RegExp, limit?: number) => Type<PipeTransform> = _.memoize(createSplitPipe);
