import 'reflect-metadata';
import { Body, NotFoundException, Post, Req } from '@nestjs/common';
import { HeaderUtil } from '@open-norantec/utilities';
import { Request } from 'express';
import { z } from 'zod';
import { AuthAdapter } from '../abstract-classes/auth-adapter.abstract.class';
import { ControllerContext } from '../interfaces/controller-context.interface';

export class Controller {
    protected registerMethod = <IS extends z.Schema<any>, OS extends z.Schema<any>>(
        inputSchema: IS,
        outputSchema: OS,
        adapters: AuthAdapter[],
        callback: (
            input: z.infer<IS>,
            headers: ReturnType<typeof HeaderUtil.parse>,
            context: ControllerContext,
        ) => Promise<z.infer<OS>>,
    ): ((
        methodName: string,
        input: unknown,
        headers: ReturnType<typeof HeaderUtil.parse>,
    ) => Promise<{ request: z.infer<IS>; response: z.infer<OS> }>) => {
        return async (methodName, rawInput, headers) => {
            const context: ControllerContext = {
                methodName,
                userIdentifier: '',
            };
            const input = inputSchema.parse(rawInput);
            return {
                request: input,
                response: outputSchema.parse(await callback(input, headers, context)),
            };
        };
    };

    @Post('*')
    private async handler(@Req() request: Request, @Body() input: unknown) {
        const methodName = request.url.split('/').pop()!;
        if (typeof this[methodName] === 'function') {
            return await this[methodName](methodName, input, HeaderUtil.parse(request.headers ?? {}));
        } else {
            throw new NotFoundException();
        }
    }
}
