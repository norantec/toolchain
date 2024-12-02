import { DAO } from '../../daos/dao.class';
import { Injectable } from '@nestjs/common';
import {
    CreateOptions,
    FindOptions,
    Includeable,
    ModelStatic,
    Op,
    SaveOptions,
    Transaction,
    WhereOptions,
} from 'sequelize';
import { MakeNullishOptional } from 'sequelize/types/utils';
import { CheckerUtil } from '../../utilities/checker-util.class';
import { StringUtil } from '../../utilities/string-util.class';
import * as _ from 'lodash';
import { LocatorUtil } from '../../utilities/locator-util.class';
import { ClassType } from '../../types/class-type.type';
import { CommonExceptionUtil } from '../../utilities/common-exception-util.class';
import { UserDAO } from '../../daos/user.dao.class';
import { Sequelize } from 'sequelize-typescript';
import { PaginationResultVO } from '../../vos/pagination-result.vo.class';
import { PaginationRequestVO } from '../../vos/pagination-request.vo.class';
import { PaginationVO } from '../../vos/pagination.vo.class';
import { ResponseVO } from '../../vos/response.vo.class';

@Injectable()
export class EntityService {
    public constructor(private readonly sequelize: Sequelize) {}

    public async getDetail<A extends DAO>(
        {
            DAOClass,
            locator,
            transaction,
            throwError = true,
            checkPermissions = true,
            sessionUserId,
            includeOptions,
        }: {
            DAOClass: ClassType<A>;
            locator: string;
            checkPermissions?: boolean;
            includeOptions?: Includeable[];
            sessionUserId?: string;
            throwError?: boolean;
            transaction?: Transaction;
        },
    ): Promise<A> {
        CheckerUtil.check({
            locator: () => StringUtil.isFalsyString(locator),
            DAOClass: () => !DAOClass,
        });

        const dao = this.sequelize.getRepository(DAOClass);
        const result = await dao.findOne({
            transaction,
            where: LocatorUtil.parse(DAOClass, locator, throwError)?.result as any,
            include: includeOptions,
        }).then((findResult) => {
            if (!findResult) {
                if (throwError) {
                    return Promise.reject(CommonExceptionUtil.create(
                        CommonExceptionUtil.Code.NOTFOUND_ENTITY,
                        {
                            locator,
                        },
                    ));
                }
                return null;
            }
            return findResult;
        });

        if (
            checkPermissions &&
            !StringUtil.isFalsyString(sessionUserId) &&
            result !== null
        ) {
            try {
                switch (DAOClass?.name) {
                    case UserDAO.name: {
                        if (result.get('id') !== sessionUserId) {
                            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_ACCESS, {});
                        }
                        break;
                    }
                    default: {
                        throw CommonExceptionUtil.create(CommonExceptionUtil.Code.SERVER_ENTITY_PERMISSION_CHECK_NOT_REGISTERED, {});
                    }
                }
            } catch (e) {
                if (throwError) {
                    throw e;
                }
                return null;
            }
        }

        return result;
    }

    public async createOrUpdate<T extends DAO>(
        {
            findOptions,
            DAOClass,
            updateFields,
            createFields,
            transaction: outerTransaction,
            createOptions,
            saveOptions,
            sessionUserId,
            checkPermissions = true,
            throwError = true,
        }: {
            DAOClass: ClassType<T>;
            createFields: MakeNullishOptional<T>;
            updateFields: MakeNullishOptional<T>;
            checkPermissions?: boolean;
            createOptions?: Omit<CreateOptions<T>, 'transaction'>;
            findOptions?: Omit<FindOptions<T>, 'transaction'>;
            saveOptions?: Omit<SaveOptions<T>, 'transaction'>;
            sessionUserId?: string;
            throwError?: boolean;
            transaction?: Transaction;
        },
    ): Promise<T> {
        CheckerUtil.check({
            DAOClass: () => !DAOClass,
        });

        const dao = this.sequelize.getRepository(DAOClass);

        CheckerUtil.check({
            dao: () => !dao,
        });

        return await this.withTransaction({
            outerTransaction,
            callback: async (transaction) => {
                let queryResult = await dao.findOne({
                    ...(findOptions ?? {}),
                    transaction,
                });
                let created = false;

                if (!queryResult) {
                    queryResult = await dao.create(createFields, {
                        ...(Object.entries(createOptions ?? {}).reduce((result, [key, value]) => {
                            if (value !== undefined) {
                                result[key] = value;
                            }
                            return result;
                        }, {})),
                        transaction,
                    });
                    created = true;
                } else {
                    Object.entries(updateFields ?? {}).forEach(([key, value]) => {
                        if (value !== undefined) {
                            queryResult.set(key as any, value as any);
                        }
                    });

                    await queryResult.save({
                        ...(saveOptions ?? {}),
                        transaction,
                    });
                }

                queryResult = await queryResult.reload({
                    ...(findOptions ?? {}),
                    where: {
                        id: queryResult.get('id'),
                    },
                    transaction,
                });

                if (
                    checkPermissions &&
                    !StringUtil.isFalsyString(sessionUserId)
                ) {
                    try {
                        switch (DAOClass?.name) {
                            case UserDAO.name: {
                                if (!created && sessionUserId !== queryResult.get('id')) {
                                    throw CommonExceptionUtil.create(CommonExceptionUtil.Code.FORBIDDEN_ACCESS, {});
                                }
                                break;
                            }
                            default: {
                                throw CommonExceptionUtil.create(CommonExceptionUtil.Code.SERVER_ENTITY_PERMISSION_CHECK_NOT_REGISTERED, {});
                            }
                        }
                    } catch (e) {
                        if (throwError) {
                            throw e;
                        }
                        return null;
                    }
                }

                return queryResult;
            },
        });
    }

    public async pagination<A extends DAO>(
        {
            DAOClass,
            allowedSearchFields: inputAllowedSearchFields = [],
            createdAtField = 'createdAt',
            cursorField = 'id',
            include,
            lastCursor,
            limit = 20,
            orders: inputOrders = [],
            transaction: outerTransaction,
            search,
            where,
            subQuery = false,
            forceLimit = false,
        }: {
            DAOClass: ModelStatic<A>;
            allowedSearchFields?: string[];
            createdAtField?: string;
            cursorField?: string;
            forceLimit?: boolean;
            include?: Includeable | Includeable[];
            orders?: Array<[string, 'ASC' | 'DESC']>;
            subQuery?: boolean;
            transaction?: Transaction;
            where?: WhereOptions;
        } & Partial<PaginationRequestVO>,
    ): Promise<PaginationResultVO<A>> {
        CheckerUtil.check({
            DAOClass: () => !DAOClass,
        });

        const dao = this.sequelize.getRepository(DAOClass);

        CheckerUtil.check({
            dao: () => !dao,
        });

        const allowedSearchFields = inputAllowedSearchFields.concat([
            'id',
            'createdAt',
            'updatedAt',
        ]);

        return await this.withTransaction({
            outerTransaction,
            callback: async (transaction) => {
                let paginationLimit: number;
                const whereOptionsList: WhereOptions[] = [];

                if (where) {
                    whereOptionsList.push(where);
                }

                if (typeof limit === 'number' && limit > 0) {
                    paginationLimit = limit + 1;
                }

                if (forceLimit && (typeof paginationLimit !== 'number' || paginationLimit <= 0)) {
                    paginationLimit = 20;
                }

                if (lastCursor !== null && lastCursor !== undefined) {
                    const lastCursorDAO = await dao.findOne({
                        transaction,
                        where: {
                            [cursorField]: lastCursor,
                        } as any,
                    });

                    if (lastCursorDAO) {
                        const createdAt = lastCursorDAO?.get(createdAtField) as Date;
                        whereOptionsList.push({
                            [createdAtField]: {
                                [Op.lte]: createdAt,
                            },
                            [Op.or]: [
                                {
                                    [createdAtField]: {
                                        [Op.lt]: createdAt,
                                    },
                                },
                                {
                                    [cursorField]: {
                                        [Op.lt]: lastCursor,
                                    },
                                },
                            ],
                        });
                    }
                }

                if (search) {
                    const searchList = Array.isArray(search) ? search : [search];
                    const searchWhereOptionList: Array<Record<string, any>> = [];

                    searchList.forEach((searchListItem) => {
                        let searchWhereOptions: Record<string, any>;

                        if (_.isPlainObject(searchListItem) && Object.keys(searchListItem).length > 0) {
                            searchWhereOptions = Object.entries(searchListItem).reduce((result, [key, value]) => {
                                if (StringUtil.isFalsyString(key)) {
                                    return result;
                                }

                                const parsedValue = typeof value === 'string' ? value : value?.value;
                                let op: string;

                                if (StringUtil.isFalsyString(parsedValue) || allowedSearchFields.includes(parsedValue)) {
                                    return result;
                                }

                                if (typeof value !== 'string') {
                                    op = value.op;
                                }

                                result[key] = !StringUtil.isFalsyString(op) && Op[op]
                                    ? {
                                        [Op[op]]: op === 'like' && !StringUtil.isFalsyString(parsedValue)
                                            ? `%${parsedValue}%`
                                            : parsedValue,
                                    }
                                    : parsedValue;

                                return result;
                            }, {});
                        }

                        if (Object.keys(searchWhereOptions).length > 0) {
                            searchWhereOptionList.push(searchWhereOptions);
                        }
                    });

                    if (searchWhereOptionList.length > 0) {
                        whereOptionsList.push(
                            searchWhereOptionList.length === 1
                                ? searchWhereOptionList[0]
                                : {
                                    [Op.or]: searchWhereOptionList,
                                },
                        );
                    }
                }

                const orders = [
                    [createdAtField, 'DESC'],
                    [cursorField, 'DESC'],
                ].concat(inputOrders);

                const daoList = await dao.findAll({
                    transaction,
                    subQuery,
                    include,
                    ...(
                        typeof paginationLimit === 'number'
                            ? { limit: paginationLimit }
                            : {}
                    ),
                    ...(
                        whereOptionsList.length > 0
                            ? {
                                where: whereOptionsList.length > 1
                                    ? {
                                        [Op.and]: whereOptionsList,
                                    }
                                    : whereOptionsList[0],
                            }
                            : []
                    ),
                    order: orders as any,
                });

                const paginationResultVO = new PaginationResultVO<A>();
                paginationResultVO.data = daoList;
                paginationResultVO.hasNext = typeof paginationLimit === 'number' ? daoList.length === paginationLimit : false;

                if (typeof paginationLimit === 'number' && paginationResultVO.hasNext) {
                    paginationResultVO.data = paginationResultVO.data.slice(0, -1);
                }

                paginationResultVO.nextCursor = paginationResultVO.data?.[(paginationResultVO.data.length ?? 0) - 1]?.[cursorField] ?? null;
                paginationResultVO.previousCursor = lastCursor;

                return paginationResultVO;
            },
        });
    }

    public async withTransaction<T = any>(
        {
            callback,
            unmanaged = false,
            outerTransaction,
        }: {
            callback: (transaction: Transaction) => Promise<T>,
            unmanaged?: boolean;
            outerTransaction?: Transaction;
        },
    ) {
        if (typeof callback !== 'function') {
            return;
        }

        if (outerTransaction) {
            return await callback(outerTransaction);
        } else {
            if (!unmanaged) {
                return await this.sequelize.transaction(async (transaction) => {
                    return await callback(transaction);
                });
            } else {
                const unmanagedTransaction = await this.sequelize.transaction();
                try {
                    const result = await callback(unmanagedTransaction);
                    return result;
                } catch (e) {
                    await unmanagedTransaction.rollback();
                }
            }
        }
    }

    public async getParent<T extends DAO>(
        {
            idList: inputIdList = [],
            transaction,
            dao,
            idField = 'id',
            parentIdField = 'parent_id',
            findOptions = {},
            includeSelf = false,
        }: {
            dao: ModelStatic<T>;
            findOptions?: FindOptions<T>;
            idList: string[];
            idField?: string;
            includeSelf?: boolean;
            parentIdField?: string;
            transaction?: Transaction;
        },
    ) {
        if (!Array.isArray(inputIdList) || inputIdList.length === 0) {
            return [];
        }

        const cteQueryResult = await this.sequelize.query(
            `with recursive cte(current_id, current_parent_id) as (
                    select ${idField}, ${parentIdField} from ${dao.tableName} where ${idField} in (${inputIdList.map((id) => `'${id}'`).join(', ')})
                    union distinct
                    select ${idField}, ${parentIdField} from ${dao.tableName} t1 inner join cte t2 on t2.current_parent_id = t1.${idField}
                )
                select * from cte;`,
            {
                transaction,
            },
        );
        /**
         * with desc order
         */
        const idList = ((cteQueryResult?.[0] ?? []) as any[]).reverse().filter((item) => {
            if (includeSelf) {
                return true;
            }
            return !inputIdList.includes(item?.current_id);
        }).map((item) => item?.current_id).filter((id) => !StringUtil.isFalsyString(id));

        return await dao.findAll({
            ...findOptions,
            transaction,
            where: {
                [idField]: idList,
            } as any,
        }).then((daoList) => {
            return daoList.reduce((result, dao) => {
                result[dao.get(idField) as string] = dao;
                return result;
            }, {} as Record<string, T>);
        }).then((daoMap) => idList.map((id) => daoMap[id]).filter((dao) => !!dao));
    }

    public async getChildren<T extends DAO>(
        {
            idList: inputIdList = [],
            transaction,
            dao,
            idField = 'id',
            parentIdField = 'parent_id',
            findOptions = {},
            includeSelf = false,
        }: {
            dao: ModelStatic<T>;
            findOptions?: FindOptions<T>;
            idList: string[];
            idField?: string;
            includeSelf?: boolean;
            parentIdField?: string;
            transaction?: Transaction;
        },
    ) {
        if (!Array.isArray(inputIdList) || inputIdList.length === 0) {
            return [];
        }

        const cteQueryResult = await this.sequelize.query(
            `with recursive cte as (
                    select ${idField} from ${dao.tableName} where ${idField} in (${inputIdList.map((id) => `'${id}'`).join(', ')})
                    union distinct
                    select c2.${idField} from ${dao.tableName} c2 inner join cte c1 on c2.${parentIdField} = c1.${idField}
                )
                select * from cte;`,
            {
                transaction,
            },
        );
        const idList = ((cteQueryResult?.[0] ?? []) as any[])
            .map((value) => value?.id)
            .filter((value) => !StringUtil.isFalsyString(value))
            .filter((currentId) => {
                if (includeSelf) {
                    return true;
                }
                return !inputIdList.includes(currentId);
            });

        return await dao.findAll({
            ...findOptions,
            transaction,
            where: {
                [idField]: idList,
            } as any,
        });
    }

    public transformPaginationResultToResponse<T>(paginationResultVO: PaginationResultVO<T>): ResponseVO<T> {
        const paginationVO = new PaginationVO();
        paginationVO.hasNext = paginationResultVO.hasNext;
        paginationVO.previousCursor = paginationResultVO.previousCursor;
        paginationVO.nextCursor = paginationResultVO.nextCursor;
        return new ResponseVO<T>({
            data: paginationResultVO.data,
            pagination: paginationVO,
        });
    }
}
