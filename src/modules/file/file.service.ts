import { Injectable } from '@nestjs/common';
import * as OSS from 'ali-oss';
import { HeaderUtil } from '../../utilities/header-util.class';
import { FileVO } from '../../vos/file.vo.class';
import { StringUtil } from '../../utilities/string-util.class';
import { FileModuleOptions } from './file.interface';

@Injectable()
export class FileService {
    private ossClient: OSS;

    public constructor(private readonly options: FileModuleOptions) {
        this.ossClient = new OSS(this.options);
    }

    public async getMetadataList(
        {
            nameList: inputNameList,
        }: {
            nameList: string[];
        },
    ) {
        const nameList = Array.isArray(inputNameList)
            ? inputNameList.filter((name) => !StringUtil.isFalsyString(name))
            : [];

        return await Promise.all(
            nameList
                .map((name) => {
                    return this.ossClient.head(`s/${name}`).then((result) => {
                        return {
                            name,
                            result,
                        };
                    }).catch(() => {
                        return Promise.resolve({
                            name,
                            result: null,
                        });
                    });
                }),
        ).then((resultList) => {
            return resultList
                .filter((item) => item?.result !== null)
                .map(({ name, result }) => {
                    const parsedHeaders = HeaderUtil.parse(result?.res?.headers ?? {});
                    const size = Number(parsedHeaders.getValue('content-length'));
                    const mimeType = parsedHeaders.getValue('content-type');
                    const time = new Date(parsedHeaders.getValue('last-modified')).getTime();
                    const resultDTO = new FileVO();

                    resultDTO.progress = 1;
                    resultDTO.createdAt = time;
                    resultDTO.updatedAt = time;
                    resultDTO.name = name;
                    resultDTO.mimeType = mimeType;
                    resultDTO.size = !Number.isNaN(size) ? size : undefined;
                    resultDTO.url = `${this.options.staticPrefix}/${name}`;

                    return resultDTO;
                });
        });
    }
}
