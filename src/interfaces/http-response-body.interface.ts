export interface HttpResponseBody<T> {
    data: T;
    token: string | null;
}
