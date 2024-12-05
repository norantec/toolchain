import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as EventEmitter from 'events';
import { CheckerUtil } from '../../utilities/checker-util.class';
import { StringUtil } from '../../utilities/string-util.class';
import { StreamingModuleOptions } from './streaming.interface';
import { CryptoUtil } from '../../utilities/crypto-util.class';

const PUSH_DATA = Symbol('');

@Injectable()
export class StreamingService {
    private readonly emitter = new EventEmitter();

    public constructor(private readonly options?: StreamingModuleOptions) {}

    public async create(
        {
            sessionUserId,
            response,
        }: {
            response: Response;
            sessionUserId: string;
        },
    ) {
        CheckerUtil.check({
            sessionUserId: () => StringUtil.isFalsyString(sessionUserId),
            response: () => !response,
        });

        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');

        response.on('close', () => {
            this.emitter.off(PUSH_DATA, handler);
            response.end();
        });

        const handler = (message: string) => {
            if (StringUtil.isFalsyString(message)) {
                return;
            }
            response.write(`data: ${this.encrypt(message)}\n\n`);
        };

        this.emitter.on(PUSH_DATA, handler);
    }

    public async push(
        {
            collectionId,
            message,
        }: {
            collectionId: string;
            message: string;
        },
    ) {
        CheckerUtil.check({
            collectionId: () => StringUtil.isFalsyString(collectionId),
            message: () => StringUtil.isFalsyString(message),
        });
        this.emitter.emit(PUSH_DATA, message);
    }

    private encrypt(content: string) {
        if (StringUtil.isFalsyString(this.options?.secret)) {
            return content;
        }
        return CryptoUtil.encryptToAESContent(content, this.options?.secret);
    }
}
