import { Constructor } from 'type-fest';
import { StringUtil } from './string-util.class';

const container: Array<[string, Constructor<any>]> = [];

export class ModelUtil {
    public static register(model: Constructor<any>, key?: string) {
        if (!model) {
            return;
        }
        container.push([StringUtil.isFalsyString(key) ? model.name : key, model]);
    }

    public static getModel(key: string) {
        return container.find(([k]) => k === key)?.[1];
    }

    public static getModelMap() {
        return container.reduce(
            (result, [key, value]: [string, Constructor<any>]) => {
                result[key] = value;
                return result;
            },
            {} as Record<string, Constructor<any>>,
        );
    }
}
