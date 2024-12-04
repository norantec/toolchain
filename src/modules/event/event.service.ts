import { Injectable } from '@nestjs/common';
// import { LoggerService } from '../logger/logger.service';
import { CheckerUtil } from '../../utilities/checker-util.class';
import { StringUtil } from '../../utilities/string-util.class';
import { SubEventId } from '../../types/sub-event-id.type';
import { AsyncEventData } from './event.interface';
type CallbackFunction<T = any> = (data?: T) => any;
type IdentifierGetterFunction<T = any> = (data?: T) => string;

@Injectable()
export class EventService {
    private readonly ASYNC_EVENT_SEND = 'system:event:async_event:send';
    private readonly eventHub = new Map<string, Map<string, CallbackFunction>>();
    private readonly acceptedEventsMap = new Map<string, Set<string>>();
    private readonly callbackIdentifierGetterMap = new Map<CallbackFunction, IdentifierGetterFunction>();

    // public constructor(
    //     private readonly loggerService: LoggerService,
    // ) {}

    public on<T>(eventId: string, callback: CallbackFunction<T>, identifierGetter?: IdentifierGetterFunction<T>): string {
        if (typeof identifierGetter === 'function') {
            this.callbackIdentifierGetterMap.set(callback, identifierGetter);
        }

        CheckerUtil.check({
            eventId: () => StringUtil.isFalsyString(eventId),
            callback: () => typeof callback !== 'function',
        });

        const uuid = StringUtil.generateRandomText();

        if (!(this.eventHub?.get(eventId) instanceof Map)) {
            this.eventHub.set(eventId, new Map<string, CallbackFunction>());
        }

        this.eventHub?.get(eventId).set(uuid, callback);
        // this.loggerService.log(`Event '${eventId}' was successfully attached`);

        return uuid;
    }

    public off(eventId: string, callback: string | CallbackFunction) {
        CheckerUtil.check({
            eventId: () => StringUtil.isFalsyString(eventId),
            callback: () => (typeof callback !== 'string' && typeof callback !== 'function') || !callback,
        });

        if (typeof callback === 'string') {
            this.eventHub?.get(eventId)?.delete(callback);
        } else if (typeof callback === 'function') {
            const callbackId = Array.from(this.eventHub?.get(eventId)?.entries()).find((pair) => {
                if (pair[1] === callback) {
                    return true;
                }
                return false;
            })?.[0];

            if (callbackId) {
                this.eventHub?.get(eventId)?.delete(callbackId);
            }
        }
    }

    public fire<T = any>(eventId: string, data?: T, callbackId?: string) {
        CheckerUtil.check({
            eventId: () => StringUtil.isFalsyString(eventId),
        });

        let callbacks: CallbackFunction<T>[] = [];

        if (typeof callbackId === 'string' && !callbackId) {
            callbacks = [this.eventHub?.get(eventId)?.get(callbackId)];
        } else {
            callbacks = Array.from(this.eventHub?.get(eventId)?.values() || []);
        }

        for (const callbackFn of callbacks.filter((callbackFn) => typeof callbackFn === 'function')) {
            const identifierGetter = this.callbackIdentifierGetterMap?.get(callbackFn);
            let identifier: any;

            if (typeof identifierGetter === 'function') {
                identifier = identifierGetter(data);

                if (this.checkIdentifierExists(eventId, identifier)) {
                    continue;
                }
            }

            const result = callbackFn(data);

            if (result && typeof identifierGetter === 'function') {
                this.acceptEventIdentifier(eventId, identifier);
            }
        }
    }

    public async asyncFire<T = any, R = any>(
        {
            sendData,
            subEventId,
            maxTimeout = 0,
            defaultValue,
        }: {
            sendData: T;
            subEventId: SubEventId;
            maxTimeout?: number;
            defaultValue?: R;
        },
    ): Promise<R> {
        CheckerUtil.check({
            subEventId: () => StringUtil.isFalsyString(subEventId),
        });
        return new Promise((resolve, reject) => {
            const uuid = `${StringUtil.generateRandomText(16)}@${new Date().getTime()}`;
            let timeoutId: NodeJS.Timeout;

            if (maxTimeout > 0) {
                timeoutId = setTimeout(() => {
                    resolve(defaultValue);
                }, maxTimeout);
            }

            this.fire<AsyncEventData<T, R>>(
                this.ASYNC_EVENT_SEND,
                {
                    uuid,
                    data: sendData,
                    subEventId,
                    resolve: (data) => {
                        clearTimeout(timeoutId);
                        resolve(data);
                    },
                    reject: (error) => {
                        clearTimeout(timeoutId);
                        reject(error);
                    },
                },
            );
        });
    }

    public asyncOn<T, R>(subEventId: SubEventId, callback: (data: AsyncEventData<T, R>) => void, identifierGetter?: IdentifierGetterFunction<AsyncEventData<T, R>>) {
        CheckerUtil.check({
            callback: () => !callback || typeof callback !== 'function',
            subEventId: () => StringUtil.isFalsyString(subEventId),
        });

        const handler: (data: AsyncEventData<T, R>) => void = (data) => {
            if (data.subEventId === subEventId) {
                callback(data);
            }
        };

        return this.on(this.ASYNC_EVENT_SEND, handler, identifierGetter);
    }

    public asyncOnce<T, R>(subEventId: SubEventId, callback: (data: AsyncEventData<T, R>) => void, identifierGetter?: IdentifierGetterFunction<AsyncEventData<T, R>>) {
        CheckerUtil.check({
            callback: () => !callback || typeof callback !== 'function',
            subEventId: () => StringUtil.isFalsyString(subEventId),
        });

        const onceCallback: (data: AsyncEventData<T, R>) => void = (data) => {
            if (data.subEventId === subEventId) {
                this.off(this.ASYNC_EVENT_SEND, onceCallback);
                callback(data);
            }
        };

        return this.on<AsyncEventData<T, R>>(this.ASYNC_EVENT_SEND, onceCallback, identifierGetter);
    }

    private checkIdentifierExists(eventId: string, identifier: string) {
        if (!identifier || !eventId) {
            return false;
        }

        if (this.acceptedEventsMap?.get(eventId)?.has(identifier)) {
            return true;
        }

        return false;
    }

    private acceptEventIdentifier(eventId: string, identifier: string) {
        if (!identifier || !eventId) {
            return false;
        }

        if (!(this.acceptedEventsMap?.get(eventId) instanceof Set)) {
            this.acceptedEventsMap.set(eventId, new Set<string>());
        }

        this.acceptedEventsMap?.get(eventId).add(identifier);

        return false;
    }
}
