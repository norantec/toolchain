import { Injectable } from '@nestjs/common';
import * as OSS from 'ali-oss';
import { HeaderUtil } from '../../utilities/header-util.class';
import { FileDTO } from '../../dtos/file.dto.class';
import { StringUtil } from '../../utilities/string-util.class';
import { FileModuleOptions } from './file.interface';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileService {
    private ossClient: OSS;

    public constructor(private readonly options: FileModuleOptions) {
        this.ossClient = new OSS(this.options);
    }

    public async list(
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
                    const resultDTO = new FileDTO();

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

    public async upload(request: Request) {
        // const readable = new Readable();
        // const extension = await new Promise((resolve, reject) => {
        //     request.on('data', (chunk) => {
        //         const mimeType = chunk.toString().match(/^data:([^;]+);/)?.[1];
        //         const extension = mimeTypes.extension(mimeType);
        //         if (!extension) {
        //             reject(new Error('Cannot infer file extension from mime type'));
        //             return;
        //         }
        //         readable.push(Buffer.from(chunk.toString().replace(/^data:[^,]+,/, ''), 'base64'));
        //         resolve(extension);
        //     });
        // });

        const result = await this.ossClient.putStream(
            `${this.options.pathPrefix}/${uuidv4()}`,
            request,
        );

        // await new Promise((resolve, reject) => {
        //     request.on('data', (chunk) => {
        //         readable.push(chunk);
        //     });
        //     request.on('error', () => {
        //         readable.push(null);
        //         reject(new Error('Request error'));
        //     });
        //     request.on('end', () => {
        //         readable.push(null);
        //         resolve(null);
        //     });
        // });

        const fileDTO = new FileDTO();
        fileDTO.progress = 1;
        fileDTO.createdAt = result.res.headers['last-modified'];
        fileDTO.updatedAt = result.res.headers['last-modified'];
        fileDTO.name = result.name;
        fileDTO.mimeType = result.res.headers['content-type'];
        fileDTO.size = Number(result.res.headers['content-length']);
        fileDTO.url = `${this.options.staticPrefix}/${result.name}`;

        return fileDTO;
    }
}
