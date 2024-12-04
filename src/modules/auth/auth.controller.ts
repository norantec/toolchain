import { AuthService } from './auth.service';
import { ApiController } from '../../decorators/api-controller.decorator';
import { Method } from '../../decorators/method.decorator';
import { ReflectedBody } from '../../decorators/reflected-body.decorator';
import { AuthRequestCodeRequestDTO } from '../../dtos/auth-request-code-request.dto.class';
import { CurrentLocale } from '../../decorators/current-locale.decorator';
import { AuthExchangeAccessTokenByCodeRequestDTO } from '../../dtos/auth-exchange-access-token-by-code-request.dto.class';
import { AuthExchangeAccessTokenByPasswordRequestDTO } from '../../dtos/auth-exchange-access-token-by-password-request.dto.class';
import { AuthResetPasswordRequestDTO } from '../../dtos/auth-reset-password-request.dto.class';

@ApiController()
export class AuthController {
    public constructor(private readonly authService: AuthService) {}

    @Method('normal')
    public async requestCode (
        @ReflectedBody() body: AuthRequestCodeRequestDTO,
        @CurrentLocale() locale: string,
    ) {
        return await this.authService.requestAuthCode({
            email: body?.email,
            locale,
        });
    }

    @Method('normal')
    public async exchangeAccessTokenByCode(
        @ReflectedBody() body: AuthExchangeAccessTokenByCodeRequestDTO,
    ) {
        return await this.authService.exchangeAccessTokenByAuthCode({
            code: body?.code,
            email: body?.email,
        });
    }

    @Method('normal')
    public async exchangeAccessTokenByPassword(
        @ReflectedBody() body: AuthExchangeAccessTokenByPasswordRequestDTO,
    ) {
        return await this.authService.exchangeAccessTokenByPassword({
            password: body?.password,
            email: body?.email,
        });
    }

    @Method('normal')
    public async resetPassword(
        @ReflectedBody() body: AuthResetPasswordRequestDTO,
    ) {
        return await this.authService.resetPassword({
            password: body?.password,
            email: body?.email,
            code: body?.code,
        });
    }
}
