export class AutoInit<T> {
    public constructor(initData?: Partial<T>) {
        Object.keys(initData ?? {}).forEach((key) => {
            this[key] = initData[key];
        });
    }
}
