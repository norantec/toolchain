import { ModuleRef } from '@nestjs/core';
import { Constructor } from 'type-fest';
import { Request } from 'express';

interface AuthenticateReturn {
    identifier: string;
    forbidden?: boolean;
    nextToken?: string;
}

export interface Result extends AuthenticateReturn {
    AuthenticatorClass: Constructor<AuthAdapter>;
}

export abstract class AuthAdapter {
    public constructor(
        protected readonly request: Request,
        protected readonly ref: ModuleRef,
    ) {}
    public abstract match(): boolean;
    public abstract authenticate(): Promise<AuthenticateReturn | null>;
}
