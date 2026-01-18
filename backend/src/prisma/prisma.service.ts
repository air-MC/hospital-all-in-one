import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
        // We don't await $connect() here anymore to prevent startup crashes
        // Prisma will connect automatically on the first query
        console.log('💎 PrismaService initialized (lazy connection)');
    }
}
