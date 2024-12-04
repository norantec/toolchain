import {forwardRef, 
    Inject,
    Injectable,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { UserDAO } from '../../daos/user.dao.class';
import { AuthCodeDTO } from '../../dtos/auth-code.dto.class';
import { MailService } from '../mail/mail.service';
import { EntityService } from '../entity/entity.service';
// import { LoggerService } from '../logger/logger.service';
import { CheckerUtil } from '../../utilities/checker-util.class';
import { StringUtil } from '../../utilities/string-util.class';
import { CommonExceptionUtil } from '../../utilities/common-exception-util.class';
import { AuthModuleOptions } from './auth.interface';
import { ResultDTO } from '../../dtos/result.dto.class';
import { AuthExchangeDTO } from '../../dtos/auth-exchange.dto.class';

interface AuthCodeItem {
    code: string;
    data: AuthCodeDTO;
    timerId: NodeJS.Timer;
}

@Injectable()
export class AuthService {
    private readonly authCodeMap = new Map<string, AuthCodeItem>();

    @Inject(forwardRef(() => MailService))
    private readonly mailService: MailService;

    @Inject(forwardRef(() => EntityService))
    private readonly entityService: EntityService;

    // @Inject(LoggerService)
    // private readonly loggerService: LoggerService;

    public constructor(private readonly options: AuthModuleOptions) {}

    public async requestAuthCode(
        {
            email,
            locale,
        }: {
            email: string;
            locale?: string;
        },
    ) {
        CheckerUtil.check({
            email: () => StringUtil.isFalsyString(email),
        });

        const existedRecord = this.authCodeMap.get(email);

        if (existedRecord?.data?.nextUnlockTime?.getTime?.() > 0 && Date.now() < existedRecord?.data?.nextUnlockTime?.getTime?.()) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_AUTH_IN_PROGRESS, {});
        }

        const result = new AuthCodeDTO();
        result.id = uuid();
        result.createdAt = Date.now();
        const expirationMinutes = this.options.codeExpirationMinutes;
        const code = StringUtil.generateRandomText(12).toUpperCase();
        const mailSendResult = await this.mailService.send({
            messageId: 'requestSignInCode',
            to: email,
            bodyContext: {
                code,
                expirationMinutes,
            },
            locale,
        });
        const expirationMilliseconds = expirationMinutes * 60 * 1000;
        result.updatedAt = Date.now();

        if (!mailSendResult.success) {
            result.nextUnlockTime = null;
            return result;
        }

        result.nextUnlockTime = new Date(result.updatedAt + this.options.codeResendDelay);
        this.authCodeMap.set(email, {
            code,
            data: result,
            timerId: setTimeout(() => {
                this.authCodeMap.delete(email);
            }, expirationMilliseconds),
        });

        return result;
    }

    public async exchangeAccessTokenByAuthCode(
        {
            code,
            email,
        }: {
            code: string;
            email: string;
        },
    ) {
        this.validateAuthCode({
            code,
            email,
        });
        try {
            const userId = await this.entityService.createOrUpdate({
                DAOClass: UserDAO,
                findOptions: {
                    where: {
                        email,
                    },
                },
                createFields: {
                    email,
                },
                updateFields: {},
                checkPermissions: false,
            }).then((dao) => dao.get('id'));
            return this.signJwt({ userId });
        } catch (e) {
            // this.loggerService.error(e?.message);
            // this.loggerService.error(e?.stack);
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.GENERIC, {});
        }
    }

    public async exchangeAccessTokenByPassword(
        {
            password,
            email,
        }: {
            password: string;
            email: string;
        },
    ) {
        CheckerUtil.check({
            password: () => StringUtil.isFalsyString(password),
            email: () => StringUtil.isFalsyString(email),
        });
        try {
            const {
                userId,
                passwordHash,
            } = await this.entityService.getDetail({
                DAOClass: UserDAO,
                locator: JSON.stringify({
                    email,
                }),
            }).then((dao) => {
                if (!dao) {
                    return Promise.reject(CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_AUTH_FAILED, {}));
                }
                return {
                    userId: dao.get('id'),
                    passwordHash: dao.get('password'),
                };
            });

            if (crypto.createHash('md5').update(password).digest('hex') !== passwordHash) {
                throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_AUTH_FAILED, {});
            }

            return this.signJwt({ userId });
        } catch (e) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_AUTH_FAILED, {});
        }
    }

    public async resetPassword(
        {
            code,
            email,
            password,
        }: {
            code: string;
            email: string;
            password: string;
        },
    ) {
        CheckerUtil.check({
            password: () => StringUtil.isFalsyString(password) || password.length < 8,
        });

        const result = new ResultDTO();
        result.createdAt = Date.now();

        try {
            this.validateAuthCode({
                code,
                email,
            });
        } catch (e) {
            result.success = false;
            return result;
        }

        try {
            const dao = await this.entityService.getDetail({
                DAOClass: UserDAO,
                locator: JSON.stringify({
                    email,
                }),
            }).then((dao) => {
                if (!dao) {
                    return Promise.reject(CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_AUTH_FAILED, {}));
                }
                return dao;
            });
            dao.set('password', crypto.createHash('md5').update(password).digest('hex'));
            await dao.save();
            result.success = true;
        } catch (e) {
            result.success = false;
            return result;
        }

        result.updatedAt = Date.now();
        return result;
    }

    public signJwt(
        {
            userId,
        }: {
            userId: string;
        },
    ) {
        CheckerUtil.check({
            userId: () => StringUtil.isFalsyString(userId),
        });
        const result = new AuthExchangeDTO();
        result.id = uuid();
        result.createdAt = Date.now();
        const expirationDays = this.options?.jwt?.expirationDays;
        const accessToken = jwt.sign(
            {
                sub: userId,
            },
            this.options?.jwt?.secret,
            {
                audience: this.options?.jwt?.audience,
                expiresIn: `${expirationDays}d`,
                issuer: this.options?.jwt?.issuer,
            },
        );
        result.accessToken = accessToken;
        result.expirationTime = moment().add(expirationDays, 'days').toDate();
        result.updatedAt = Date.now();
        return result;
    }

    private validateAuthCode(
        {
            code,
            email,
        }: {
            code: string;
            email: string;
        },
    ) {
        CheckerUtil.check({
            code: () => StringUtil.isFalsyString(code),
            email: () => StringUtil.isFalsyString(email),
        });

        const authCodeItem = this.authCodeMap.get(email);

        if (!(authCodeItem?.data instanceof AuthCodeDTO) || authCodeItem?.code !== code) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_AUTH_FAILED, {});
        }

        try {
            clearTimeout(authCodeItem?.timerId);
            this.authCodeMap.delete(email);
        } catch (e) {}
    }
}
