import {
    Body,
    Req,
} from '@nestjs/common';
import { type Request } from 'express';
import { DynamicConfigService } from './dynamic-config.service';
import { Method } from 'src/decorators/method.decorator';
import { BaseController } from 'src/common/base.controller';
import { ApiController } from 'src/decorators/api-controller.decorator';
import { ResultVO } from 'src/vos/result.vo.class';
import { DynamicConfigItemVO } from 'src/vos/dynamic-config-item.vo.class';
import { ResponseVO } from 'src/vos/response.vo.class';
import { Mapping } from 'src/decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { TransformPipe } from 'src/pipes/transform.pipe';

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

    @Method(null, null, 'normal')
    public async onUpdate(
        @Body() data: any,
        @Req() request: Request,
    ): Promise<ResponseVO<ResultVO>> {
        return new ResponseVO({
            data: await this.dynamicConfigService.onUpdate(data, request),
        });
    }

    @Method(DynamicConfigGetRequestVO, DynamicConfigItemVO, 'normal')
    public async get(@Body(TransformPipe(DynamicConfigGetRequestVO)) body: DynamicConfigGetRequestVO): Promise<ResponseVO<DynamicConfigItemVO>> {
        return new ResponseVO({
            data: Object.values(await this.dynamicConfigService.get(body?.patterns, true)),
        });
    }
}
