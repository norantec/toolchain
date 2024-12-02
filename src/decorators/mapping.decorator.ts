import {
    ExposeOptions,
    Expose as OriginalExpose,
} from 'class-transformer';
import { GROUP } from '../constants/group.constant';

export function Mapping(options: ExposeOptions = {}) {
    return OriginalExpose({
        ...options,
        ...(
            Array.isArray(options?.groups)
                ? {
                    groups: [GROUP.EXPOSE_ALL].concat(options.groups),
                }
                : {}
        ),
    } as ExposeOptions) as PropertyDecorator & ClassDecorator;
}
