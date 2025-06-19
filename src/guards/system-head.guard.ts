import 'reflect-metadata';
import { CanActivate, Injectable } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { RequestWithExtraContext } from '../types/request-with-extra-context.type';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { HEADERS } from '../constants/headers.constant';
import { ModuleRef } from '@nestjs/core';
import { AUTH_ADAPTERS } from '../decorators/auth-adapters.decorator';
import { Constructor } from 'type-fest';
import { AuthAdapter } from '../abstract-classes/auth-adapter.abstract.class';

@Injectable()
export class SystemHeadGuard implements CanActivate {
    public constructor(protected readonly ref: ModuleRef) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const traceId = uuidv4();
        const request: RequestWithExtraContext = context.switchToHttp().getRequest();
        const response: Response = context.switchToHttp().getResponse();
        const ControllerClass = context.getClass();

        request.traceId = traceId;
        request.methodName = request.url.split('/').pop()!;
        response.setHeader(HEADERS.TRACE_ID, traceId);

        const authAdapters: Constructor<AuthAdapter>[] = Reflect.getMetadata(
            AUTH_ADAPTERS,
            ControllerClass.prototype,
            request.methodName,
        );

        if (Array.isArray(authAdapters) && authAdapters.length > 0) {
            for (const AuthAdapterClass of authAdapters) {
                const adapter = new AuthAdapterClass(request, this.ref);
                if (!adapter.match()) continue;
                const authenticateResult = await adapter.authenticate();
                if (!authenticateResult) return false;
                request.user = {
                    AuthenticatorClass: AuthAdapterClass,
                    ...authenticateResult,
                };
                break;
            }
        }

        return true;
    }
}
