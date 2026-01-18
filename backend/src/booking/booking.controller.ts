import { Controller, Get, Post, Patch, Body, Query, Headers, BadRequestException, Param } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateAppointmentDto, GenerateSlotsDto } from './dto/create-appointment.dto';

@Controller('booking')
export class BookingController {
    constructor(private readonly bookingService: BookingService) { }

    @Get('stats')
    async getStats() {
        return this.bookingService.getStats();
    }

    @Get('audit-logs')
    async getAuditLogs(
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        return this.bookingService.getAuditLogs(limit, offset);
    }

    /**
     * Admin: Generate Slots for a Department/Day
     */
    @Post('slots/generate')
    async generateSlots(@Body() dto: GenerateSlotsDto) {
        const date = new Date(dto.date);
        if (isNaN(date.getTime())) {
            throw new BadRequestException('Invalid date format');
        }
        return this.bookingService.generateDailySlots(dto.departmentId, date, dto.doctorId);
    }

    /**
     * Client: Get Available Slots
     */
    @Get('slots')
    async getSlots(
        @Query('departmentId') departmentId: string,
        @Query('date') date: string,
        @Query('doctorId') doctorId?: string
    ) {
        if (!departmentId || !date) {
            throw new BadRequestException('departmentId and date are required');
        }
        return this.bookingService.getAvailableSlots(departmentId, date, doctorId);
    }

    /**
     * Admin: Get Appointments for a specific date/dept
     */
    @Get('appointments')
    async getAppointments(
        @Query('departmentId') departmentId?: string,
        @Query('date') date?: string,
        @Query('doctorId') doctorId?: string
    ) {
        return this.bookingService.getAppointments(departmentId, date, doctorId);
    }

    @Patch('appointments/:id/status')
    async updateAppointmentStatus(
        @Param('id') id: string,
        @Body('status') status: string
    ) {
        return this.bookingService.updateAppointmentStatus(id, status);
    }

    /**
     * Client: Book a Slot (Atomic)
     * Requires Idempotency-Key
     */
    @Post('appointments')
    async createAppointment(
        @Body() dto: CreateAppointmentDto,
        @Headers('idempotency-key') idempotencyKey: string,
    ) {
        console.log(`[BookingController] Incoming Post for Slot: ${dto.slotId}, Patient: ${dto.patientId}, Key: ${idempotencyKey}`);
        if (!idempotencyKey) {
            throw new BadRequestException('Idempotency-Key header is required');
        }
        return this.bookingService.bookSlotAtomic(dto.slotId, dto.patientId, idempotencyKey);
    }
}
