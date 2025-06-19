import 'reflect-metadata';
import { Body, NotFoundException, Post, Req } from '@nestjs/common';
import { HeaderUtil } from '@open-norantec/utilities/dist/header-util.class';
import { z, ZodAny } from 'zod';
import { RequestWithExtraContext } from '../types/request-with-extra-context.type';
import { HttpResponseBody } from '../interfaces/http-response-body.interface';
import { StringUtil } from '../utilities/string-util.class';

export type MethodHandler<IS extends z.Schema<any>, OS extends z.Schema<any>> = (
    request: RequestWithExtraContext,
    input: unknown,
    headers: ReturnType<typeof HeaderUtil.parse>,
) => Promise<{ request: z.infer<IS>; response: z.infer<OS> }>;

export class Controller {
    protected registerMethod = <IS extends z.Schema<any>, OS extends z.Schema<any>>(
        inputSchema: IS,
        outputSchema: OS,
        callback: (
            input: z.infer<IS>,
            headers: ReturnType<typeof HeaderUtil.parse>,
            request: RequestWithExtraContext,
        ) => Promise<z.infer<OS>>,
    ): MethodHandler<IS, OS> => {
        return async (request, rawInput, headers) => {
            const input = inputSchema instanceof ZodAny ? rawInput : inputSchema.parse(rawInput);
            const responseData = await callback(input, headers, request);
            return {
                request: input,
                response: outputSchema instanceof ZodAny ? responseData : outputSchema.parse(responseData),
            };
        };
    };

    @Post('*')
    private async handler(
        @Req() request: RequestWithExtraContext,
        @Body() input: unknown,
    ): Promise<HttpResponseBody<any>> {
        const methodHandler: MethodHandler<z.Schema<any>, z.Schema<any>> = this[request?.methodName];
        if (typeof methodHandler === 'function') {
            return {
                data: await methodHandler(request, input, HeaderUtil.parse(request.headers ?? {})).then(
                    (response) => response?.response,
                ),
                token: StringUtil.isFalsyString(request?.user?.nextToken) ? null : request.user!.nextToken!,
            };
        } else {
            throw new NotFoundException();
        }
    }
}
