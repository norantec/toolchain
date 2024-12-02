import {
    AES,
    enc,
    HmacSHA256,
} from 'crypto-js';
import { ClassType } from '../types/class-type.type';
import { StringUtil } from './string-util.class';
import { JSONUtil } from './json-util.class';
import { SerializableUtil } from './serializable-util.class';

export class CryptoUtil {
    public static createSignature(content: string, secret: string) {
        if (StringUtil.isFalsyString(content) || StringUtil.isFalsyString(secret)) {
            return '';
        }
        return HmacSHA256(content, secret).toString(enc.Hex);
    }

    public static decryptFromAESContent<T>(content: string, secret: string, DTOClass: ClassType<T>) {
        if (StringUtil.isFalsyString(content) || StringUtil.isFalsyString(secret) || !DTOClass) {
            return null;
        }

        const parsedContent = JSONUtil.parse(AES.decrypt(content, secret).toString(enc.Utf8));

        if (!parsedContent) {
            return null;
        }

        return SerializableUtil.plainToInstance(DTOClass, parsedContent);
    }

    public static encryptToAESContent(serializableInstance: any, secret: string) {
        if (StringUtil.isFalsyString(secret)) {
            return null;
        }
        return AES.encrypt(JSON.stringify(SerializableUtil.instanceToPlain(serializableInstance)), secret);
    }
}
