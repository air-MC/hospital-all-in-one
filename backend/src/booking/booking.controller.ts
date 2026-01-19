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
        // Parse YYYY-MM-DD manually to avoid timezone shifts
        const [year, month, day] = dto.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);

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
        @Query('date') dateStr: string,
        @Query('doctorId') doctorId?: string
    ) {
        if (!departmentId || !dateStr) {
            throw new BadRequestException('departmentId and date are required');
        }
        // Consistent parsing
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

        return this.bookingService.getAvailableSlots(departmentId, date, doctorId);
    }

    /**
     * Admin: Get Appointments for a specific date/dept
     */
    @Get('appointments')
    async getAppointments(
        @Query('departmentId') departmentId?: string,
        @Query('date') dateStr?: string,
        @Query('doctorId') doctorId?: string,
        @Query('patientId') patientId?: string
    ) {
        let date: Date | undefined;
        if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
        }
        return this.bookingService.getAppointments(departmentId, date, doctorId, patientId);
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

    /**
     * Admin: Walk-in Registration (현장 접수)
     * Finds the nearest available slot and books it immediately
     */
    @Post('walk-in')
    async walkInRegistration(
        @Body() dto: { patientId: string; departmentId: string; doctorId?: string },
        @Headers('idempotency-key') idempotencyKey: string,
    ) {
        console.log(`[BookingController] Walk-in registration for Patient: ${dto.patientId}, Dept: ${dto.departmentId}`);
        if (!idempotencyKey) {
            throw new BadRequestException('Idempotency-Key header is required');
        }
        if (!dto.patientId || !dto.departmentId) {
            throw new BadRequestException('patientId and departmentId are required');
        }
        return this.bookingService.walkInRegistration(dto.patientId, dto.departmentId, dto.doctorId, idempotencyKey);
    }

    /**
     * Admin: Get system notifications
     */
    @Get('notifications/admin')
    async getAdminNotifications() {
        return this.bookingService.getAdminNotifications();
    }

    /**
     * Admin: Mark notification as read
     */
    @Patch('notifications/:id/read')
    async markNotificationRead(@Param('id') id: string) {
        return this.bookingService.markNotificationRead(id);
    }

    @Patch('slots/:id/status')
    async updateSlotStatus(
        @Param('id') id: string,
        @Body('status') status: any
    ) {
        return this.bookingService.updateSlotStatus(id, status);
    }
}
