export interface AsyncEventData<T = any, R = any> {
    data: T;
    uuid: string;
    subEventId: string | Symbol;
    resolve: (data: R | PromiseLike<R>) => void;
    reject: (error: Error) => void;
}
