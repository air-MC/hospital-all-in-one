
import { CareCategory } from '@prisma/client';

export class CreateCareItemDto {
    carePlanId: string;
    category: CareCategory;
    title: string;
    description?: string;
    scheduledAt: string; // ISO DateTime
}
