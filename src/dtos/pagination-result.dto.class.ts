export class PaginationResultDTO<T> {
    public data: T[];
    public hasNext: boolean;
    public nextCursor: string;
    public previousCursor: string;

    public constructor(initData?: Partial<T>) {
        Object.keys(initData ?? {}).forEach((key) => {
            this[key] = initData[key];
        });
    }
}
