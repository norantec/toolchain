export class JSONUtil {
    public static parse(literal: string, onError?: (error: Error) => any) {
        try {
            return JSON.parse(literal);
        } catch (e) {
            return onError?.(e) ?? null;
        }
    }
}
