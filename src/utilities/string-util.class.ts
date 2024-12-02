import { v4 as uuidv4 } from 'uuid';

export class StringUtil {
    public static isFalsyString(value: any, connector: 'AND' | 'OR' = 'AND') {
        const stringList = Array.isArray(value)
            ? value
            : [value];

        const checkResultList = stringList.map((stringValue) => typeof stringValue === 'string' && stringValue.length > 0);

        if (connector === 'AND') {
            return checkResultList.some((result) => !result);
        }

        if (connector === 'OR') {
            return checkResultList.every((result) => !result);
        }

        return true;
    }

    public static generateRandomText(length = 32, extraCharacters = '') {
        const seed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.concat(extraCharacters);
        let result = '';

        while (result.length < length) {
            result += seed.charAt(Math.floor(Math.random() * seed.length));
        }

        return result;
    }

    public static generateTempId() {
        const tempIds: string[] = [];
        while (true) {
            const currentTempId = uuidv4();
            if (tempIds.indexOf(currentTempId) === -1) {
                tempIds.push(currentTempId);
                return `temp$:${currentTempId}`;
            }
        }
    }

    public static extractTempId(idOrTempId: string) {
        if (!idOrTempId) {
            return null;
        }

        const regex = /^temp\$:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!regex.test(idOrTempId)) {
            return;
        }

        return /^temp\$:(.*)$/g.exec(idOrTempId)?.[1] || null;
    }
}
