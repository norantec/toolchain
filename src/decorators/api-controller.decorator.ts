import { Controller } from '@nestjs/common';
import { StringUtil } from '../utilities/string-util.class';
import { METADATA_NAMES } from '../constants/metadata-names.constant';

export const ApiController = (prefix?: string): ClassDecorator => {
    const finalPrefix = StringUtil.isFalsyString(prefix) ? '/api/v1' : prefix;
    return (target) => {
        Reflect.defineMetadata(METADATA_NAMES.CONTROLLER_PREFIX, finalPrefix, target);
        Controller(finalPrefix)(target);
    };
};
