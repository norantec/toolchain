import 'reflect-metadata';
import { AppGuard } from 'src/guards/app.guard';
import { UseGuards as OriginalUseGuards } from '@nestjs/common';
import { ScopeGuard } from 'src/guards/scope.guard';

export function UseGuards(...guards: any[]) {
    return OriginalUseGuards(ScopeGuard, ...guards, AppGuard);
}
