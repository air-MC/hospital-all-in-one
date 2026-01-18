import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitStepDto, UpdateStepStatusDto } from './dto/visit-guide.dto';

@Injectable()
export class VisitGuideService {
    constructor(private prisma: PrismaService) { }

    async getSteps(patientId: string) {
        // Get steps for the current date window (widened for potential timezone issues)
        const today = new Date();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 1); // Yesterday

        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() + 1); // Tomorrow

        console.log(`[VisitGuide] Fetching steps for ${patientId} between ${start.toISOString()} and ${end.toISOString()}`);

        return this.prisma.visitStep.findMany({
            where: {
                patientId,
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: {
                order: 'asc'
            }
        });
    }

    async addStep(dto: CreateVisitStepDto) {
        console.log(`[VisitGuide] Adding step for ${dto.patientId}: ${dto.name}`);
        // Determine order
        const count = await this.prisma.visitStep.count({
            where: { patientId: dto.patientId }
        });

        return this.prisma.visitStep.create({
            data: {
                ...dto,
                order: count + 1
            }
        });
    }

    async updateStatus(id: string, dto: UpdateStepStatusDto) {
        return this.prisma.visitStep.update({
            where: { id },
            data: { status: dto.status }
        });
    }

    async deleteStep(id: string) {
        return this.prisma.visitStep.delete({
            where: { id }
        });
    }
}
