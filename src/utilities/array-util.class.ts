export class ArrayUtil {
    public static checkUnique<T>(
        data: Array<T>,
        validator: (item: T) => Array<string | number | boolean | null | undefined>,
    ) {
        if (!data || !Array.isArray(data)) {
            return;
        }

        const values = [] as Array<Array<string | number | boolean | null | undefined>>;

        for (const item of data) {
            const currentValue = validator(item);

            if (!Array.isArray(currentValue)) {
                continue;
            }

            const exist = values.some((checkValue) => {
                for (const [index, value] of checkValue.entries()) {
                    if (currentValue[index] !== value) {
                        return false;
                    }
                }
                return true;
            });

            if (exist) {
                return false;
            }

            values.push(currentValue);
        }

        return true;
    }

    public static getPositiveIndexValue(length: number, index: number) {
        if (!length || !index) {
            return index;
        }

        let result = index;

        while (result < 0) {
            result = length + result;
        }

        return result;
    }

    public static traverse<R, T>(array: Array<T | Array<T>>, transformer?: (item: T) => R): Array<R | Array<R>> {
        if (!Array.isArray(array)) {
            return [];
        }

        const result = [] as Array<R | Array<R>>;

        for (const item of array) {
            if (Array.isArray(item)) {
                result.push(ArrayUtil.traverse(item, transformer) as Array<R>);
            } else {
                result.push(typeof transformer === 'function' ? transformer(item) : (item as unknown as R));
            }
        }

        return result;
    }
}
