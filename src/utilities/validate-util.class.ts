import { StringUtil } from './string-util.class';

export class ValidateUtil {
    public static isValidIPv4Address(address: string) {
        if (StringUtil.isFalsyString(address)) return false;
        return (
            /^(\d{1,3}\.){3}\d{1,3}$/.test(address || '') &&
            address!.split('.').every((segment) => Number(segment) >= 0 && Number(segment) <= 255)
        );
    }
}
