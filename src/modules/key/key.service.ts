import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as crypto from 'crypto';
import { Transaction } from 'sequelize';
import { KeyDAO } from '../../daos/key.dao.class';
import { CheckerUtil } from '../../utilities/checker-util.class';
import { StringUtil } from '../../utilities/string-util.class';
import { EntityService } from '../entity/entity.service';
import { UserDAO } from '../../daos/user.dao.class';
import { CommonExceptionUtil } from '../../utilities/common-exception-util.class';
import { LocatorUtil } from '../../utilities/locator-util.class';
import { PaginationRequestDTO } from '../../dtos/pagination-request.dto.class';

@Injectable()
export class KeyService {
    public constructor(
        @InjectModel(KeyDAO)
        private readonly keyDAO: typeof KeyDAO,
        private readonly entityService: EntityService,
    ) {}

    public async validate(
        {
            id,
            secret,
            scopeIdentifier,
            checkScopeName = true,
        }: {
            id: string;
            secret: string;
            scopeIdentifier: string;
            checkScopeName?: boolean;
        },
    ) {
        try {
            CheckerUtil.check({
                id: () => StringUtil.isFalsyString(id),
                secret: () => StringUtil.isFalsyString(secret),
                scopeIdentifier: () => checkScopeName && StringUtil.isFalsyString(scopeIdentifier),
            });
        } catch (e) {
            return;
        }

        const dao = await this.keyDAO.findOne({
            where: {
                id,
                secret: crypto.createHash('md5').update(secret).digest('hex'),
            },
            include: [
                {
                    model: UserDAO,
                    as: 'user',
                    required: true,
                },
            ],
        });

        if (!dao) {
            return null;
        }

        if (
            (
                dao.get('expirationTime')?.getTime?.() > 0 &&
                dao.get('expirationTime')?.getTime?.() <= Date.now()
            ) ||
            dao.get('deprecated')
        ) {
            return;
        }

        return await this.entityService.getDetail({
            locator: JSON.stringify({ id: dao.get('userId') }),
            DAOClass: UserDAO,
            checkPermissions: false,
        });
    }

    public async createOrUpdate(
        {
            sessionUserId,
            deprecated = false,
            locator,
            expirationTime,
            scopePatterns,
            targetUserId: inputTargetUserId,
            checkPermissions = true,
            transaction: outerTransaction,
        }: {
            checkPermissions?: boolean;
            deprecated?: boolean;
            expirationTime?: Date;
            locator?: string;
            scopePatterns?: string;
            sessionUserId?: string;
            targetUserId?: string;
            transaction?: Transaction;
        },
    ) {
        const isUpdate = !StringUtil.isFalsyString(locator);
        const parsedLocator = LocatorUtil.parse(KeyDAO, locator, false);

        if ((expirationTime?.getTime?.() > 0) && expirationTime?.getTime?.() <= Date.now()) {
            throw CommonExceptionUtil.create(
                CommonExceptionUtil.Code.INVALID_PARAMS,
                {
                    params: [
                        'expirationTime',
                    ],
                },
            );
        }

        return await this.entityService.withTransaction({
            outerTransaction,
            callback: async (transaction) => {
                let dao: KeyDAO = isUpdate
                    ? await this.keyDAO.findOne({
                        where: {
                            ...parsedLocator,
                        },
                        transaction,
                    }).then((dao: KeyDAO) => {
                        if (!dao) {
                            return Promise.reject(CommonExceptionUtil.create(
                                CommonExceptionUtil.Code.NOTFOUND_ENTITY,
                                {
                                    locator,
                                },
                            ));
                        }
                        return dao;
                    })
                    : this.keyDAO.build();
                let targetUserId = sessionUserId;

                if (
                    !StringUtil.isFalsyString(inputTargetUserId) &&
                    !StringUtil.isFalsyString(sessionUserId) &&
                    inputTargetUserId !== sessionUserId
                ) {
                    if (checkPermissions) {
                        throw CommonExceptionUtil.create(
                            CommonExceptionUtil.Code.FORBIDDEN_ACCESS,
                            {},
                        );
                    } else {
                        targetUserId = inputTargetUserId;
                    }
                }

                let secret: string;

                if (isUpdate && typeof deprecated === 'boolean') {
                    dao.set('deprecated', deprecated);
                } else {
                    secret = StringUtil.generateRandomText();
                    dao.set('userId', targetUserId);
                    dao.set('expirationTime', expirationTime);
                    dao.set('secret', crypto.createHash('md5').update(secret).digest('hex'));
                }

                if (!StringUtil.isFalsyString(scopePatterns)) {
                    dao.set('scopePatterns', scopePatterns);
                }

                dao = await dao.save({ transaction });
                dao.set('secret', (isUpdate || typeof secret !== 'string' || !secret.length) ? null : secret);

                return dao;
            },
        });
    }

    public async list(
        {
            lastCursor,
            limit,
            sessionUserId,
            targetUserId,
            transaction: outerTransaction,
            search,
            checkPermissions = true,
        }: {
            sessionUserId: string;
            targetUserId: string;
            checkPermissions?: boolean;
            transaction?: Transaction;
        } & Partial<PaginationRequestDTO>,
    ) {
        CheckerUtil.check({
            sessionUserId: () => typeof sessionUserId !== 'string' || !sessionUserId.length,
        });

        return await this.entityService.withTransaction({
            outerTransaction,
            callback: async (transaction) => {
                if (
                    !StringUtil.isFalsyString(targetUserId) &&
                    !StringUtil.isFalsyString(sessionUserId) &&
                    sessionUserId !== targetUserId &&
                    checkPermissions
                ) {
                    throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_ACCESS, {});
                }

                const result = await this.entityService.pagination({
                    DAOClass: KeyDAO,
                    lastCursor,
                    limit,
                    search,
                    include: [
                        {
                            model: UserDAO,
                            required: true,
                            where: {
                                id: (targetUserId || sessionUserId),
                            },
                        },
                    ],
                    allowedSearchFields: [
                        'id',
                    ],
                    transaction,
                });

                result.data = result.data.map((item) => {
                    item.secret = null;
                    return item;
                });

                return result;
            },
        });
    }
}
