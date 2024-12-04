import {
    Body,
    Req,
} from '@nestjs/common';
import { type Request } from 'express';
import { DynamicConfigService } from './dynamic-config.service';
import { Method } from '../../decorators/method.decorator';
import { ApiController } from '../../decorators/api-controller.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
import { DynamicConfigGetRequestDTO } from '../../dtos/dynamic-config-get-request.dto.class';
@ApiController()
export class DynamicConfigController {
    public constructor(private readonly dynamicConfigService: DynamicConfigService) {}

    @Method('normal')
    public async onUpdate(
        @Body() data: any,
        @Req() request: Request,
    ) {
        return await this.dynamicConfigService.onUpdate(data, request);
    }

    @Method('normal')
    public async get(@ReflectedBody() body: DynamicConfigGetRequestDTO) {
        return Object.values(await this.dynamicConfigService.get(body?.patterns, true));
    }
}
