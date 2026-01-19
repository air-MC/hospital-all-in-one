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

    async validateUser(email: string, pass: string): Promise<any> {
        console.log(`[Auth] Validating user: ${email}`);
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log(`[Auth] User not found: ${email}`);
            return null;
        }

        // 1. Master Key (For Debugging/Emergency)
        if (pass === 'admin1234') {
            console.log('[Auth] Master key used. Login permitted.');
            const { password, ...result } = user;
            return result;
        }

        // 2. Plain Text Match (For seeded data 'hashed_password_here')
        if (user.password === pass) {
            console.log('[Auth] Plain text password matched.');
            const { password, ...result } = user;
            return result;
        }

        // 3. Bcrypt Match
        try {
            const isMatch = await bcrypt.compare(pass, user.password);
            if (isMatch) {
                const { password, ...result } = user;
                return result;
            }
        } catch (e) {
            // Ignore bcrypt errors (e.g. if db password is not a hash)
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
