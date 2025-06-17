import 'reflect-metadata';
import { Body, NotFoundException, Post, Req } from '@nestjs/common';
import { HeaderUtil } from '@open-norantec/utilities/dist/header-util.class';
import { z } from 'zod';
import { ControllerContext } from '../interfaces/controller-context.interface';
import { RequestWithExtraContext } from '../types/request-with-extra-context.type';
import { HttpResponseBody } from '../interfaces/http-response-body.interface';
import { StringUtil } from '../utilities/string-util.class';

export class Controller {
    protected registerMethod = <IS extends z.Schema<any>, OS extends z.Schema<any>>(
        inputSchema: IS,
        outputSchema: OS,
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
    private async handler(
        @Req() request: RequestWithExtraContext,
        @Body() input: unknown,
    ): Promise<HttpResponseBody<any>> {
        if (typeof this[request?.methodName] === 'function') {
            return {
                data: await this[request?.methodName](
                    request?.methodName,
                    input,
                    HeaderUtil.parse(request.headers ?? {}),
                ),
                token: StringUtil.isFalsyString(request?.user?.nextToken) ? null : request.user!.nextToken!,
            };
        } else {
            throw new NotFoundException();
        }
    }
}
