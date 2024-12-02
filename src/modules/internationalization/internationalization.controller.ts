import {
    Body,
    Req,
} from '@nestjs/common';
import { type Request } from 'express';
import { InternationalizationService } from './internationalization.service';
import { Method } from 'src/decorators/method.decorator';
import { BaseController } from 'src/common/base.controller';
import { ApiController } from 'src/decorators/api-controller.decorator';
import { DynamicConfigItemVO } from 'src/vos/dynamic-config-item.vo.class';
import { ResultVO } from 'src/vos/result.vo.class';
import { ResponseVO } from 'src/vos/response.vo.class';
import { Mapping } from 'src/decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { TransformPipe } from 'src/pipes/transform.pipe';

class InternationalizationGetRequestVO {
    @Mapping()
    @ApiProperty({ isArray: true })
    public patterns: string[];
}

@ApiController()
export class InternationalizationController extends BaseController {
    public constructor(private readonly internationalizationService: InternationalizationService) {
        super();
    }

    @Method(null, null, 'normal')
    public async onUpdate(
        @Body() data: any,
        @Req() request: Request,
    ): Promise<ResponseVO<ResultVO>> {
        return new ResponseVO({
            data: await this.internationalizationService.onUpdate(data, request),
        });
    }

    @Method(InternationalizationGetRequestVO, DynamicConfigItemVO, 'normal')
    public async get(@Body(TransformPipe(InternationalizationGetRequestVO)) body: InternationalizationGetRequestVO): Promise<ResponseVO<DynamicConfigItemVO>> {
        return new ResponseVO({
            data: Object.values(await this.internationalizationService.get(body?.patterns, false)),
        });
    }
}
