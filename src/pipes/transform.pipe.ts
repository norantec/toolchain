import {
    ArgumentMetadata,
    Injectable,
    mixin,
    PipeTransform,
    Type,
    ValidationPipe,
} from '@nestjs/common';
import { memoize } from 'lodash';

function createTransformPipe<T>(itemType: Type<T>): Type<PipeTransform> {
    @Injectable()
    class MixinTransformArrayDTOPipe extends ValidationPipe implements PipeTransform {
        public constructor() {
            super({
                transform: true,
                transformOptions: {
                    excludeExtraneousValues: true,
                    enableImplicitConversion: true,
                },
                forbidUnknownValues: true,
            });
        }

        public transform(values: T[], metadata: ArgumentMetadata): Promise<any[]> {
            if (!Array.isArray(values)) {
                return super.transform(
                    values,
                    {
                        ...metadata,
                        metatype: itemType,
                    },
                );
            }
            return Promise.all(values.map((value) => super.transform(
                value,
                {
                    ...metadata,
                    metatype: itemType,
                },
            )));
        }
    }
    return mixin(MixinTransformArrayDTOPipe);
}

export const TransformPipe: <T>(itemType: Type<T>) => Type<PipeTransform> = memoize(createTransformPipe);
