import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import { AutoInit } from './auto-init.vo.class';
import { PaginationVO } from 'src/vos/pagination.vo.class';
import { SerializableUtil } from 'src/utilities/serializable-util.class';

export class ResponseVO<T> extends AutoInit<ResponseVO<T>> {
    @ApiProperty({ isArray: true })
    public data: T[];

    @ApiPropertyOptional({ type: () => PaginationVO })
    public pagination?: Required<PaginationVO>;

    @ApiPropertyOptional()
    public token: string;

    public constructor(initData: {
        data: T | T[];
        pagination?: PaginationVO;
    }) {
        super({
            ...(
                initData?.pagination
                    ? {
                        pagination: SerializableUtil.instanceToPlain(initData?.pagination) as Required<PaginationVO>,
                    }
                    : {}
            ),
            data: Array.isArray(initData?.data)
                ? initData?.data?.map?.((data) => SerializableUtil.instanceToPlain(data)) as T[]
                : [SerializableUtil.instanceToPlain(initData?.data)] as T[],
        });
    }
}
