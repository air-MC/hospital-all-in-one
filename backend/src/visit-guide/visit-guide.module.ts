import { Module } from '@nestjs/common';
import { VisitGuideController } from './visit-guide.controller';
import { VisitGuideService } from './visit-guide.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [VisitGuideController],
    providers: [VisitGuideService],
})
export class VisitGuideModule { }
