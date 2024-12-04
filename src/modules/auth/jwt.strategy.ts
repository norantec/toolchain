import {
    forwardRef,
    Inject,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
    Strategy as BaseStrategy,
    ExtractJwt,
} from 'passport-jwt';
import { EntityService } from '../entity/entity.service';
import { AuthModuleOptions } from './auth.interface';
import { StringUtil } from '../../utilities/string-util.class';
import { UserDAO } from '../../daos/user.dao.class';

type JsonValue = string | number | boolean;

interface JsonObject {
    [k: string]: JsonValue | JsonValue[] | JsonObject;
}

interface JwtPayload extends JsonObject {
    /** Issuer (who created and signed this token) */
    iss?: string;
    /** Subject (whom the token refers to) */
    sub?: string;
    /** Audience (who or what the token is intended for) */
    aud?: string[];
    /** Issued at (seconds since Unix epoch) */
    iat?: number;
    /** Expiration time (seconds since Unix epoch) */
    exp?: number;
    /** Authorization party (the party to which this token was issued) */
    azp?: string;
    /** Token scope (what the token has access to) */
    scope?: string;
    /** User permissions in current audience */
    permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(BaseStrategy) {
    @Inject(forwardRef(() => EntityService))
    private readonly entityService: EntityService;

    public constructor(options: AuthModuleOptions) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: options?.jwt?.audience,
            issuer: options?.jwt?.issuer,
            ignoreExpiration: options?.jwt?.ignoreExpiration,
            secretOrKey: options?.jwt?.secret,
        });
    }

    public async validate(payload: JwtPayload) {
        const {
            sub: userId,
            exp: tokenExpirationSeconds,
        } = payload;

        if (StringUtil.isFalsyString(userId)) {
            throw new UnauthorizedException();
        }

        return await this.entityService.getDetail({
            DAOClass: UserDAO,
            locator: JSON.stringify({ id: userId }),
        }).then((dao) => {
            dao.tokenExpirationTime = new Date(tokenExpirationSeconds * 1000);
            return dao;
        });
    }
}
