import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingModule } from './booking/booking.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { CareModule } from './care/care.module';



import { HospitalModule } from './hospital/hospital.module';
import { VisitGuideModule } from './visit-guide/visit-guide.module';

@Module({
  imports: [
    PrismaModule,
    BookingModule,
    CareModule,
    HospitalModule,
    VisitGuideModule
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
