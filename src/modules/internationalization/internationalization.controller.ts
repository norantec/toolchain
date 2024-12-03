import {
    Body,
    Req,
} from '@nestjs/common';
import { type Request } from 'express';
import { InternationalizationService } from './internationalization.service';
import { Method } from '../../decorators/method.decorator';
import { BaseController } from '../../common/base.controller';
import { ApiController } from '../../decorators/api-controller.decorator';
import { Mapping } from '../../decorators/mapping.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';

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

    @Method('normal')
    public async onUpdate(
        @Body() data: any,
        @Req() request: Request,
    ) {
        return await this.internationalizationService.onUpdate(data, request);
    }

    @Method('normal')
    public async get(@ReflectedBody() body: InternationalizationGetRequestVO) {
        return Object.values(await this.internationalizationService.get(body?.patterns, false));
    }
}
