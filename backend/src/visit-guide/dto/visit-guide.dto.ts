import { IsString, IsOptional, IsEnum } from 'class-validator';
import { StepStatus, CareCategory } from '@prisma/client';

export class CreateVisitStepDto {
    @IsString()
    patientId: string;

    @IsString()
    @IsOptional()
    appointmentId?: string;

    @IsString()
    name: string;

    @IsString()
    location: string;

    @IsEnum(CareCategory)
    @IsOptional()
    category?: CareCategory;
}

export class UpdateStepStatusDto {
    @IsEnum(StepStatus)
    status: StepStatus;
}
