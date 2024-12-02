import { Injectable } from '@nestjs/common';
import { STS } from 'ali-oss';
import { v4 as uuid } from 'uuid';
import { UploadCredentialVO } from '../../vos/upload-credential.vo.class';
import { StringUtil } from '../../utilities/string-util.class';
import { UploadModuleOptions } from './upload.interface';

@Injectable()
export class UploadService {
    private stsClient: STS;
    private credential: UploadCredentialVO;

    public constructor(private readonly options: UploadModuleOptions) {
        this.stsClient = new STS({
            accessKeyId: this.options?.accessKeyId,
            accessKeySecret: this.options?.accessKeySecret,
        });
    }

    public async getCredential() {
        if (
            (this.credential instanceof UploadCredentialVO) &&
            !StringUtil.isFalsyString(this.credential.accessKeyId) &&
            !StringUtil.isFalsyString(this.credential.accessKeySecret) &&
            !StringUtil.isFalsyString(this.credential.securityToken) &&
            this.credential?.expirationTime - Date.now() >= 60000
        ) {
            return this.credential;
        }

        const id = uuid();
        const result = await this.stsClient.assumeRole(this.options?.roleArn, '', 3600);
        const uploadCredentialVO = new UploadCredentialVO();

        uploadCredentialVO.id = id;
        uploadCredentialVO.accessKeyId = result?.credentials?.AccessKeyId;
        uploadCredentialVO.accessKeySecret = result?.credentials?.AccessKeySecret;
        uploadCredentialVO.securityToken = result?.credentials?.SecurityToken;
        uploadCredentialVO.expirationTime = new Date(result?.credentials?.Expiration).getTime();
        uploadCredentialVO.createdAt = Date.now();
        uploadCredentialVO.updatedAt = Date.now();

        this.credential = uploadCredentialVO;

        return uploadCredentialVO;
    }
}
