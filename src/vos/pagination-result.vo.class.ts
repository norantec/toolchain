import { AutoInit } from './auto-init.vo.class';

export class PaginationResultVO<T> extends AutoInit<T> {
    public data: T[];
    public hasNext: boolean;
    public nextCursor: string;
    public previousCursor: string;
}
