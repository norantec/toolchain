import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import * as crypto from 'crypto';
import { CommonExceptionUtil } from 'src/utilities/common-exception-util.class';
import { UserDAO } from 'src/daos/user.dao.class';
import {
    Includeable,
    Transaction,
    WhereOptions,
} from 'sequelize';
import { EntityService } from 'src/modules/entity/entity.service';
import { StringUtil } from 'src/utilities/string-util.class';
import { SerializableUtil } from 'src/utilities/serializable-util.class';
import { CheckerUtil } from 'src/utilities/checker-util.class';
import { PaginationRequestVO } from 'src/vos/pagination-request.vo.class';

@Injectable()
export class UserService {
    public constructor(
        private readonly entityService: EntityService,
    ) {}

    public async list(
        {
            lastCursor,
            limit,
            search,
            transaction: outerTransaction,
            include,
            where,
        }: {
            include?: Includeable | Includeable[];
            where?: WhereOptions;
            transaction?: Transaction;
        } & Partial<PaginationRequestVO>,
    ) {
        return await this.entityService.withTransaction({
            outerTransaction,
            callback: async (transaction) => {
                const result = await this.entityService.pagination<UserDAO>({
                    DAOClass: UserDAO,
                    lastCursor,
                    search,
                    limit,
                    where,
                    transaction,
                    include,
                    allowedSearchFields: [
                        'id',
                        'email',
                        'firstName',
                        'lastName',
                        'fullName',
                    ],
                });

                return result;
            },
        });
    }

    public async createOrUpdate(
        {
            data,
            sessionUserId,
            transaction: outerTransaction,
            allowUpdate = false,
            checkPermissions = true,
        }: {
            data: Partial<UserDAO>;
            allowUpdate?: boolean;
            checkPermissions?: boolean;
            sessionUserId?: string;
            transaction?: Transaction;
        },
    ) {
        CheckerUtil.check({
            data: () => StringUtil.isFalsyString(data?.email),
        });

        return await this.entityService.withTransaction({
            outerTransaction,
            callback: (transaction) => this.entityService.createOrUpdate({
                sessionUserId,
                checkPermissions,
                transaction,
                DAOClass: UserDAO,
                findOptions: {
                    where: {
                        email: data.email,
                    },
                },
                createFields: {
                    email: data.email,
                },
                updateFields: allowUpdate
                    ? _.pick(
                        SerializableUtil.instanceToPlain(data),
                        [
                            'imageUrl',
                            'birthDate',
                            'firstName',
                            'fullName',
                            'lastName',
                        ],
                    )
                    : {},
            }),
        });
    }

    public async updatePassword(
        {
            checkPermissions = true,
            sessionUserId,
            locator,
            password,
            transaction,
            originalPassword,
            throwError = true,
        }: {
            locator: string;
            password: string;
            checkPermissions?: boolean;
            originalPassword?: string;
            sessionUserId?: string;
            throwError?: boolean;
            transaction?: Transaction;
        },
    ) {
        CheckerUtil.check({
            locator: () => StringUtil.isFalsyString(locator),
            sessionUserId: () => StringUtil.isFalsyString(sessionUserId),
            password: () => StringUtil.isFalsyString(password) || password.length < 8,
        });

        const userDAO = await this.entityService.getDetail({
            transaction,
            locator: StringUtil.isFalsyString(locator) ? locator : `id(${sessionUserId});`,
            checkPermissions: false,
            DAOClass: UserDAO,
            throwError,
        });

        if (checkPermissions && userDAO.get('id') !== sessionUserId) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_ACCESS, {});
        }

        if (!StringUtil.isFalsyString(userDAO.get('password')) && StringUtil.isFalsyString(originalPassword)) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_PARAMS,
                {
                    params: [
                        'originalPassword',
                    ],
                },
            );
        }

        if (
            !StringUtil.isFalsyString(userDAO.get('password')) &&
            crypto.createHash('md5').update(originalPassword).digest('hex') !== userDAO.get('password')
        ) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_AUTH_FAILED, {});
        }

        userDAO.set('password', crypto.createHash('md5').update(password).digest('hex'));
        await userDAO.save({ transaction });

        return userDAO;
    }
}
