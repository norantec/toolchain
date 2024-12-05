import { Controller } from '@nestjs/common';
import { StringUtil } from '../utilities/string-util.class';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { UserDAO } from '../daos/user.dao.class';
import { KeyDAO } from '../daos/key.dao.class';
import { SubscriptionSnapshotDAO } from '../daos/subscription-snapshot.dao.class';
import { SubscriptionDAO } from '../daos/subscription.dao.class';
import { AuthCodeDTO } from '../dtos/auth-code.dto.class';
import { AuthExchangeAccessTokenByCodeRequestDTO } from '../dtos/auth-exchange-access-token-by-code-request.dto.class';
import { AuthExchangeAccessTokenByPasswordRequestDTO } from '../dtos/auth-exchange-access-token-by-password-request.dto.class';
import { AuthExchangeDTO } from '../dtos/auth-exchange.dto.class';
import { AuthRequestCodeRequestDTO } from '../dtos/auth-request-code-request.dto.class';
import { AuthResetPasswordRequestDTO } from '../dtos/auth-reset-password-request.dto.class';
import { DynamicConfigGetRequestDTO } from '../dtos/dynamic-config-get-request.dto.class';
import { DynamicConfigItemDTO } from '../dtos/dynamic-config-item.dto.class';
import { FileDTO } from '../dtos/file.dto.class';
import { InternationalizationGetRequestDTO } from '../dtos/internationalization-get-request.dto.class';
import { KeyCreateOrUpdateRequestDTO } from '../dtos/key-create-or-update-request.dto.class';
import { KeyListRequestDTO } from '../dtos/key-list-request.dto.class';
import { LanguageDTO } from '../dtos/language.dto.class';
import { PaginationRequestDTO } from '../dtos/pagination-request.dto.class';
import { PaginationResultDTO } from '../dtos/pagination-result.dto.class';
import { PaginationSearchItemDTO } from '../dtos/pagination-search-item.dto.class';
import { PaginationDTO } from '../dtos/pagination.dto.class';
import { PayloadDTO } from '../dtos/payload.dto.class';
import { PlanDTO } from '../dtos/plan.dto.class';
import { ResponseDTO } from '../dtos/response.dto.class';
import { ResultDTO } from '../dtos/result.dto.class';
import { UploadCredentialDTO } from '../dtos/upload-credential.dto.class';
import { UserUpdatePasswordRequestDTO } from '../dtos/user-update-password-request.dto.class';
import { ClassType } from '../types/class-type.type';
import { ApiExtraModels } from '@nestjs/swagger';
import { OpenApiUtil } from '../utilities/openapi-util.class';
import { DAOUtil } from '../utilities/dao-util.class';

const container = new Map<string, ClassType>();

export const ApiController = (prefix?: string): ClassDecorator => {
    const finalPrefix = StringUtil.isFalsyString(prefix) ? '/api/v1' : prefix;

    [
        [DAOUtil.getOriginalName(KeyDAO), OpenApiUtil.generateSchemaDTOFromModel(KeyDAO)],
        [DAOUtil.getOriginalName(SubscriptionSnapshotDAO), OpenApiUtil.generateSchemaDTOFromModel(SubscriptionSnapshotDAO)],
        [DAOUtil.getOriginalName(SubscriptionDAO), OpenApiUtil.generateSchemaDTOFromModel(SubscriptionDAO)],
        [DAOUtil.getOriginalName(UserDAO), OpenApiUtil.generateSchemaDTOFromModel(UserDAO)],
        [AuthCodeDTO.name, AuthCodeDTO],
        [AuthExchangeAccessTokenByCodeRequestDTO.name, AuthExchangeAccessTokenByCodeRequestDTO],
        [AuthExchangeAccessTokenByPasswordRequestDTO.name, AuthExchangeAccessTokenByPasswordRequestDTO],
        [AuthExchangeDTO.name, AuthExchangeDTO],
        [AuthRequestCodeRequestDTO.name, AuthRequestCodeRequestDTO],
        [AuthResetPasswordRequestDTO.name, AuthResetPasswordRequestDTO],
        [DynamicConfigGetRequestDTO.name, DynamicConfigGetRequestDTO],
        [DynamicConfigItemDTO.name, DynamicConfigItemDTO],
        [FileDTO.name, FileDTO],
        [InternationalizationGetRequestDTO.name, InternationalizationGetRequestDTO],
        [KeyCreateOrUpdateRequestDTO.name, KeyCreateOrUpdateRequestDTO],
        [KeyListRequestDTO.name, KeyListRequestDTO],
        [LanguageDTO.name, LanguageDTO],
        [PaginationRequestDTO.name, PaginationRequestDTO],
        [PaginationResultDTO.name, PaginationResultDTO],
        [PaginationSearchItemDTO.name, PaginationSearchItemDTO],
        [PaginationDTO.name, PaginationDTO],
        [PayloadDTO.name, PayloadDTO],
        [PlanDTO.name, PlanDTO],
        [ResponseDTO.name, ResponseDTO],
        [ResultDTO.name, ResultDTO],
        [UploadCredentialDTO.name, UploadCredentialDTO],
        [UserUpdatePasswordRequestDTO.name, UserUpdatePasswordRequestDTO],
    ].forEach(([key, model]) => {
        container.set(key, model);
    });

    return (target) => {
        Reflect.defineMetadata(METADATA_NAMES.CONTROLLER_PREFIX, finalPrefix, target);
        ApiExtraModels(...Array.from(container.values()))(target);
        Controller(finalPrefix)(target);
    };
};

ApiController.registerModel = (model: ClassType, key?: string) => {
    if (!model) {
        return;
    }
    container.set(StringUtil.isFalsyString(key) ? model.name : key, model);
};

ApiController.getModel = (key: string) => {
    return container.get(key);
};
