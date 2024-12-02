import { HttpException } from '@nestjs/common';
import { CommonExceptionUtil } from '../utilities/common-exception-util.class';

export class Exception<T extends keyof M, M> {
    public constructor(
        private readonly customExceptionHandler?: (code: T) => typeof HttpException,
    ) {}

    public create(code: T, context: M[T]) {
        return CommonExceptionUtil.create<T, M>(code, context, this.customExceptionHandler?.bind(this));
    }
}
