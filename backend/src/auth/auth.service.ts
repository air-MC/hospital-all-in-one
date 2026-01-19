import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    async validateUser(identifier: string, pass: string): Promise<any> {
        console.log(`[Auth] Validating user: ${identifier}`);

        // [Security] STRICT PRE-CHECK
        // Immediately block system@hospital.com regardless of DB state
        if (identifier === 'system@hospital.com') {
            console.warn(`[Auth] Blocked login attempt for restricted identifier: ${identifier}`);
            throw new UnauthorizedException('Login restricted for this account.');
        }

        // 1. Try finding by Email
        let user = await this.prisma.user.findUnique({ where: { email: identifier } });

        // 2. If not found, Try finding by Username (for Super Admins)
        if (!user) {
            user = await this.prisma.user.findUnique({ where: { username: identifier } });
        }

        if (!user) {
            console.log(`[Auth] User not found: ${identifier}`);
            return null;
        }

        // [Security] Block restricted accounts
        if (user.email === 'system@hospital.com') {
            console.warn(`[Auth] Login attempt blocked for restricted account: ${user.email}`);
            throw new UnauthorizedException('Login restricted for this account.');
        }

        // 3. Master Key - REMOVED for Production Security
        // if (pass === 'admin1234') { ... } 

        // 4. Plain Text Match (Existing passwords)
        if (user.password === pass) {
            console.log('[Auth] Plain text password matched.');
            const { password, ...result } = user;
            return result;
        }

        // 5. Bcrypt Match
        try {
            const isMatch = await bcrypt.compare(pass, user.password);
            if (isMatch) {
                const { password, ...result } = user;
                return result;
            }
        } catch (e) {
            // Ignore bcrypt errors
        }

        return null;
    }

    async login(user: any) {
        const payload = {
            email: user.email,
            sub: user.id,
            hospitalId: user.hospitalId,
            role: user.role
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                hospitalId: user.hospitalId
            }
        };
    }
}
