import {
    Body,
    Req,
} from '@nestjs/common';
import { type Request } from 'express';
import { InternationalizationService } from './internationalization.service';
import { Method } from '../../decorators/method.decorator';
import { ApiController } from '../../decorators/api-controller.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
import { InternationalizationGetRequestDTO } from '../../dtos/internationalization-get-request.dto.class';

@ApiController()
export class InternationalizationController {
    public constructor(private readonly internationalizationService: InternationalizationService) {}

    @Method('normal')
    public async onUpdate(
        @Body() data: any,
        @Req() request: Request,
    ) {
        return await this.internationalizationService.onUpdate(data, request);
    }

    @Method('normal')
    public async get(@ReflectedBody() body: InternationalizationGetRequestDTO) {
        return Object.values(await this.internationalizationService.get(body?.patterns, false));
    }
}
