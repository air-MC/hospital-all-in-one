import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './jwt.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    async validate(payload: any) {
        // [Security] Block restricted accounts from using valid tokens
        if (payload.email === 'system@hospital.com') {
            throw new Error('Access denied for restricted account.');
        }

        // payload contains sub, email, hospitalId, role
        return {
            id: payload.sub,
            email: payload.email,
            hospitalId: payload.hospitalId,
            role: payload.role
        };
    }
}
