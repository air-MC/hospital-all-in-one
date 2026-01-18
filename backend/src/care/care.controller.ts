import { Controller, Post, Get, Patch, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { CareService } from './care.service';
import { CreateSurgeryDto } from './dto/create-surgery.dto';

@Controller('care')
export class CareController {
    constructor(private readonly careService: CareService) { }

    @Post('surgeries')
    async registerSurgery(@Body() dto: CreateSurgeryDto) {
        if (!dto.patientId || !dto.surgeryDate) {
            throw new BadRequestException('Missing required fields');
        }
        return this.careService.registerSurgery(dto);
    }

    @Get('items')
    async getDailyItems(
        @Query('patientId') patientId: string,
        @Query('date') date: string
    ) {
        if (!patientId || !date) {
            throw new BadRequestException('patientId and date are required');
        }
        return this.careService.getDailyCareItems(patientId, date);
    }

    @Get('plans/:id/items')
    async getCarePlanItems(@Param('id') id: string) {
        return this.careService.getCarePlanItems(id);
    }

    @Patch('items/:id/complete')
    async completeItem(@Param('id') id: string) {
        return this.careService.completeCareItem(id);
    }

    @Get('surgeries')
    async getSurgeries(@Query('patientId') patientId: string) {
        // Simple getter for demo
        return this.careService['prisma'].surgeryCase.findMany({
            where: patientId ? { patientId } : {},
            orderBy: { surgeryDate: 'desc' },
            include: { doctor: true, patient: true, carePlan: true }
        });
    }

    @Patch('surgeries/:id/reschedule')
    async reschedule(
        @Param('id') id: string,
        @Body('newDate') newDate: string
    ) {
        if (!newDate) throw new BadRequestException('newDate is required');
        return this.careService.rescheduleSurgery(id, newDate);
    }

    @Get('notifications')
    async getNotifications(@Query('patientId') patientId: string) {
        return this.careService.getNotifications(patientId);
    }

    @Patch('notifications/:id/read')
    async readNotification(@Param('id') id: string) {
        return this.careService.markNotificationRead(id);
    }

    @Post('items')
    async addItem(@Body() dto: any) {
        return this.careService.addCareItem(dto);
    }

    @Post('items/:id/delete') // Using POST for delete to keep it simple or DELETE method
    async deleteItem(@Param('id') id: string) {
        return this.careService.deleteCareItem(id);
    }

    @Get('overdue')
    async getOverdueItems(@Query('hospitalId') hospitalId: string) {
        return this.careService.getOverdueItems(hospitalId);
    }

    @Get('surgery-types')
    async getSurgeryTypes() {
        return this.careService.getSurgeryTypes();
    }

    @Patch('items/:id')
    async updateItem(@Param('id') id: string, @Body() body: any) {
        return this.careService.updateCareItem(id, body);
    }

    @Patch('surgeries/:id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: any
    ) {
        if (!status) throw new BadRequestException('Status is required');
        return this.careService.updateSurgeryStatus(id, status);
    }

    @Patch('surgeries/:id')
    async updateSurgery(
        @Param('id') id: string,
        @Body() body: any
    ) {
        // Generic update for roomNumber, diagnosis, etc.
        return this.careService.updateSurgery(id, body);
    }
}
