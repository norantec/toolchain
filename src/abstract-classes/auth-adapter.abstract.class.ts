export abstract class AuthAdapter {
    public constructor(protected readonly request: Request) {}
    public abstract authenticate(): Promise<{ identifier: string; forbidden?: boolean; nextToken?: string } | null>;
}
