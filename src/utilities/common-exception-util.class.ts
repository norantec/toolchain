import {
    BadRequestException,
    ForbiddenException,
    GatewayTimeoutException,
    HttpException,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ClassType } from '../types/class-type.type';
import { StringUtil } from './string-util.class';
import { TargetType } from '../enums/target-type.enum';

export enum CommonException {
    GENERIC = 'GENERIC',
    AUTH_NO_USERID = 'AUTH_NO_USERID',
    AUTH_NOT_LOGIN = 'AUTH_NOT_LOGIN',
    NOTFOUND_ENTITY = 'NOTFOUND_ENTITY',
    INVALID_SUBSCRIPTION_END_DATE = 'INVALID_SUBSCRIPTION_END_DATE',
    INVALID_SUBSCRIPTION_EXPIRATION = 'INVALID_SUBSCRIPTION_EXPIRATION',
    INVALID_PARAMS = 'INVALID_PARAMS',
    INVALID_CHECKERS = 'INVALID_CHECKERS',
    INVALID_TRANSACTION = 'INVALID_TRANSACTION',
    INVALID_DUPLICATION = 'INVALID_DUPLICATION',
    INVALID_TRANSFER = 'INVALID_TRANSFER',
    FORBIDDEN_USER_NOT_VERIFIED = 'FORBIDDEN_USER_NOT_VERIFIED',
    FORBIDDEN_INSUFFICIENT_KEY_SCOPE = 'FORBIDDEN_INSUFFICIENT_KEY_SCOPE',
    FORBIDDEN_INSUFFICIENT_SUBSCRIPTION = 'FORBIDDEN_INSUFFICIENT_SUBSCRIPTION',
    FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
    FORBIDDEN_TRANSFER = 'FORBIDDEN_TRANSFER',
    FORBIDDEN_OWNER_ONLY = 'FORBIDDEN_OWNER_ONLY',
    FORBIDDEN_AUTH_IN_PROGRESS = 'FORBIDDEN_AUTH_IN_PROGRESS',
    FORBIDDEN_AUTH_FAILED = 'FORBIDDEN_AUTH_FAILED',
    SERVER_GET_CONFIG_PRIMITIVE_VALUE_FAILURE = 'SERVER_GET_CONFIG_PRIMITIVE_VALUE_FAILURE',
    SERVER_ENTITY_PERMISSION_CHECK_NOT_REGISTERED = 'SERVER_ENTITY_PERMISSION_CHECK_NOT_REGISTERED',
    SERVER_SERIALIZATION_FAULT = 'SERVER_SERIALIZATION_FAULT',
}

export interface CommonExceptionMap {
    [CommonException.NOTFOUND_ENTITY]: {
        locator: string;
    };
    [CommonException.INVALID_PARAMS]: {
        params: string[];
    };
    [CommonException.INVALID_CHECKERS]: {
        checkerNames: string[];
    };
    [CommonException.FORBIDDEN_INSUFFICIENT_KEY_SCOPE]: {
        requestedScopes: string[];
    };
    [CommonException.FORBIDDEN_USER_NOT_VERIFIED]: {
        email?: string;
        id?: string;
    };
    [CommonException.FORBIDDEN_OWNER_ONLY]: {
        locator: string;
        targetType: TargetType;
    };
    [CommonException.INVALID_TRANSACTION]: {
        id: string;
    };
    [key: string]: {};
}

export type CreateExceptionFn = <T extends keyof CommonExceptionMap>(code: T, options: CommonExceptionMap[T]) => Error;

export class CommonExceptionUtil {
    public static Code = CommonException;

    public static create<T extends keyof M, M = CommonExceptionMap>(
        code: T,
        context: M[T],
        customExceptionHandler?: (code: T) => ClassType<HttpException>,
    ): Error {
        const createExceptionClass = (code: T) => {
            let ExceptionClass: ClassType<HttpException>;
            switch ((StringUtil.isFalsyString(code) ? '' : code).toString().split('_')[0]) {
                case 'AUTH':
                    ExceptionClass = UnauthorizedException;
                    break;
                case 'NOTFOUND':
                    ExceptionClass = NotFoundException;
                    break;
                case 'INVALID':
                    ExceptionClass = BadRequestException;
                    break;
                case 'TIMEOUT':
                    ExceptionClass = GatewayTimeoutException;
                    break;
                case 'FORBIDDEN':
                    ExceptionClass = ForbiddenException;
                    break;
                case 'PAYMENT':
                    ExceptionClass = ServiceUnavailableException;
                    break;
                case 'GENERIC':
                case 'SERVER':
                default:
                    ExceptionClass = customExceptionHandler?.(code) ?? InternalServerErrorException;
            }
            return ExceptionClass;
        };
        let Exception = createExceptionClass(code);
        return new Exception({
            code,
            data: context,
        });
    }

    public async withCatch<T = any>(
        {
            defaultValue = null,
            throwError = true,
            callback,
            onError,
        }: {
            defaultValue?: any;
            throwError?: boolean;
            callback: () => T | Promise<T>,
            onError?: (error: Error) => void;
        },
    ): Promise<T> {
        try {
            return await callback();
        } catch (e) {
            if (typeof onError === 'function') {
                onError(e);
            }

            if (!throwError) {
                return defaultValue;
            }

            throw e;
        }
    }
}
