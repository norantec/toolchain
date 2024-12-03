import { AppGuard } from '../guards/app.guard';
import { UseGuards as OriginalUseGuards } from '@nestjs/common';
import { ScopeGuard } from '../guards/scope.guard';

export function UseGuards(...guards: any[]) {
    return OriginalUseGuards(ScopeGuard, ...guards, AppGuard);
}
