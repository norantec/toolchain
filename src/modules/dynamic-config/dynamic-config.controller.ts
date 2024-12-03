import {
    Body,
    Req,
} from '@nestjs/common';
import { type Request } from 'express';
import { DynamicConfigService } from './dynamic-config.service';
import { Method } from '../../decorators/method.decorator';
import { BaseController } from '../../common/base.controller';
import { ApiController } from '../../decorators/api-controller.decorator';
import { Mapping } from '../../decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';

class DynamicConfigGetRequestVO {
    @Mapping()
    @ApiProperty({ isArray: true })
    public patterns: string[];
}

@ApiController()
export class DynamicConfigController extends BaseController {
    public constructor(private readonly dynamicConfigService: DynamicConfigService) {
        super();
    }

    @Method('normal')
    public async onUpdate(
        @Body() data: any,
        @Req() request: Request,
    ) {
        return await this.dynamicConfigService.onUpdate(data, request);
    }

    @Method('normal')
    public async get(@ReflectedBody() body: DynamicConfigGetRequestVO) {
        return Object.values(await this.dynamicConfigService.get(body?.patterns, true));
    }
}
