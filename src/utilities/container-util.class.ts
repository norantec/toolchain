import { ClassType } from '../types/class-type.type';
import { StringUtil } from './string-util.class';

const container = new Map<string, ClassType>();

export class ContainerUtil {
    public static register(value: ClassType) {
        if (StringUtil.isFalsyString(value?.name)) {
            return;
        }
        container.set(value?.name, value);
    }

    public static get(key: string): ClassType {
        return container.get(key);
    }
}
