import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
    Strategy as BaseStrategy,
    ExtractJwt,
} from 'passport-jwt';
import { EntityService } from '../entity/entity.service';
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

export interface JwtStrategyOptions {
    audience: string;
    expirationDays: number;
    issuer: string;
    secret: string;
    ignoreExpiration?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(BaseStrategy) {
    public constructor(
        options: JwtStrategyOptions,
        private readonly entityService: EntityService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: options?.audience,
            issuer: options?.issuer,
            ignoreExpiration: options?.ignoreExpiration,
            secretOrKey: options?.secret,
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
