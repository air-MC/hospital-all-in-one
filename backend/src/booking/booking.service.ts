import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlotStatus } from '@prisma/client';
import { addMinutes, startOfDay, endOfDay, isBefore } from 'date-fns';

@Injectable()
export class BookingService {
    constructor(private prisma: PrismaService) { }

    async getAvailableSlots(departmentId: string, dateStr: string, doctorId?: string) {
        const date = new Date(dateStr);
        const start = startOfDay(date);
        const end = endOfDay(date);

        const whereClause: any = {
            departmentId,
            startDateTime: { gte: start, lte: end }
        };

        if (doctorId) {
            whereClause.doctorId = doctorId;
        }

        return this.prisma.slot.findMany({
            where: whereClause,
            orderBy: { startDateTime: 'asc' },
            select: {
                id: true,
                startDateTime: true,
                status: true,
                bookedCount: true,
                capacity: true
            }
        });
    }

    async generateDailySlots(departmentId: string, date: Date, doctorId?: string) {
        const dayOfWeek = date.getDay();
        const rule = await this.prisma.scheduleRule.findFirst({
            where: { departmentId, dayOfWeek }
        });

        if (!rule || rule.isHoliday) {
            return { count: 0, message: 'Holiday or no rules' };
        }

        const start = startOfDay(date);
        const end = endOfDay(date);
        await this.prisma.slot.deleteMany({
            where: {
                departmentId,
                ...(doctorId ? { doctorId } : {}),
                startDateTime: { gte: start, lte: end }
            }
        });

        let currentTime = this.parseTimeOnDate(date, rule.startTime);
        const endTime = this.parseTimeOnDate(date, rule.endTime);
        const breakStart = rule.breakStart ? this.parseTimeOnDate(date, rule.breakStart) : null;
        const breakEnd = rule.breakEnd ? this.parseTimeOnDate(date, rule.breakEnd) : null;

        const slotsToCreate = [];
        while (currentTime < endTime) {
            const isBreak = breakStart && breakEnd && (currentTime >= breakStart && currentTime < breakEnd);
            if (!isBreak) {
                slotsToCreate.push({
                    departmentId,
                    doctorId: doctorId || null,
                    startDateTime: currentTime,
                    endDateTime: addMinutes(currentTime, rule.slotDuration),
                    capacity: rule.capacityPerSlot,
                    bookedCount: 0,
                    status: SlotStatus.OPEN,
                    version: 0
                });
            }
            currentTime = addMinutes(currentTime, rule.slotDuration);
        }

        await this.prisma.slot.createMany({ data: slotsToCreate });
        return { count: slotsToCreate.length };
    }

    async bookSlotAtomic(slotId: string, patientId: string, idempotencyKey: string) {
        return await this.prisma.$transaction(async (tx) => {
            const existingAppt = await tx.appointment.findUnique({
                where: { idempotencyKey }
            });
            if (existingAppt) return existingAppt;

            const slot = await tx.slot.findUnique({
                where: { id: slotId }
            });

            if (!slot) throw new NotFoundException('Slot not found');

            if (isBefore(slot.startDateTime, new Date())) {
                throw new BadRequestException('Cannot book a past slot');
            }

            const patientAlreadyBooked = await tx.appointment.findFirst({
                where: { slotId, patientId, status: { not: 'CANCELLED' } }
            });
            if (patientAlreadyBooked) {
                throw new ConflictException('Patient already has a booking for this slot');
            }

            const updatedSlot = await tx.slot.update({
                where: { id: slotId },
                data: { bookedCount: { increment: 1 } }
            });

            if (updatedSlot.status !== 'OPEN' || updatedSlot.bookedCount > updatedSlot.capacity) {
                throw new ConflictException('Slot is no longer available');
            }

            if (updatedSlot.bookedCount === updatedSlot.capacity) {
                await tx.slot.update({
                    where: { id: slotId },
                    data: { status: 'FULL' }
                });
            }

            const appointment = await tx.appointment.create({
                data: { slotId, patientId, status: 'BOOKED', idempotencyKey }
            });

            await tx.auditLog.create({
                data: {
                    entityTable: 'Appointment',
                    entityId: appointment.id,
                    action: 'CREATE',
                    newValue: JSON.stringify(appointment)
                }
            });

            return appointment;
        });
    }

    async getAppointments(departmentId?: string, dateStr?: string, doctorId?: string) {
        const whereClause: any = {};
        if (dateStr && dateStr !== '') {
            const date = new Date(dateStr);
            const start = startOfDay(date);
            const end = endOfDay(date);
            whereClause.slot = { startDateTime: { gte: start, lte: end } };
        }
        if (departmentId && departmentId !== '') {
            whereClause.slot = { ...(whereClause.slot || {}), departmentId };
        }
        if (doctorId && doctorId !== '') {
            whereClause.slot = { ...(whereClause.slot || {}), doctorId };
        }

        return this.prisma.appointment.findMany({
            where: whereClause,
            include: {
                patient: true,
                slot: { include: { department: true, doctor: true } }
            },
            orderBy: { slot: { startDateTime: 'asc' } }
        });
    }

    async updateAppointmentStatus(id: string, status: any) {
        return this.prisma.$transaction(async (tx) => {
            const oldAppt = await tx.appointment.findUnique({ where: { id } });
            if (!oldAppt) throw new NotFoundException('Appointment not found');

            const appt = await tx.appointment.update({
                where: { id },
                data: { status },
                include: { patient: true, slot: { include: { department: true } } }
            });

            if (status === 'CANCELLED' && oldAppt.status !== 'CANCELLED') {
                await tx.slot.update({
                    where: { id: appt.slotId },
                    data: {
                        bookedCount: { decrement: 1 },
                        status: 'OPEN'
                    }
                });
            }

            if (status === 'CHECKED_IN') {
                const todayStart = startOfDay(new Date());
                const todayEnd = endOfDay(new Date());

                await tx.visitStep.deleteMany({
                    where: {
                        patientId: appt.patientId,
                        createdAt: { gte: todayStart, lte: todayEnd }
                    }
                });

                await tx.visitStep.create({
                    data: {
                        patientId: appt.patientId,
                        appointmentId: appt.id,
                        name: '내원 접수 완료',
                        location: '1F 원무과',
                        status: 'COMPLETED',
                        order: 1,
                        category: 'NOTICE'
                    }
                });

                await tx.visitStep.create({
                    data: {
                        patientId: appt.patientId,
                        appointmentId: appt.id,
                        name: `${appt.slot.department.name} 진료 대기`,
                        location: appt.slot.department.name,
                        status: 'PENDING',
                        order: 2,
                        category: 'TREATMENT'
                    }
                });
            }

            await tx.auditLog.create({
                data: {
                    entityTable: 'Appointment',
                    entityId: id,
                    action: 'STATUS_CHANGE',
                    oldValue: oldAppt.status,
                    newValue: status
                }
            });

            return appt;
        });
    }

    async getStats() {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const [totalAppts, checkedInAppts, activeSurgeries, recentLogs] = await Promise.all([
            this.prisma.appointment.count({
                where: { slot: { startDateTime: { gte: todayStart, lte: todayEnd } } }
            }),
            this.prisma.appointment.count({
                where: { status: 'CHECKED_IN', slot: { startDateTime: { gte: todayStart, lte: todayEnd } } }
            }),
            this.prisma.surgeryCase.count({
                where: { status: { in: ['ADMITTED', 'IN_SURGERY', 'POST_OP'] } }
            }),
            this.prisma.auditLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return {
            today: {
                totalAppointments: totalAppts,
                checkedIn: checkedInAppts,
                progress: totalAppts > 0 ? Math.round((checkedInAppts / totalAppts) * 100) : 0
            },
            activeSurgeries,
            recentActivity: recentLogs
        };
    }

    async getAuditLogs(limit: number = 50, offset: number = 0) {
        return this.prisma.auditLog.findMany({
            take: Number(limit),
            skip: Number(offset),
            orderBy: { createdAt: 'desc' },
            include: { actor: true }
        });
    }

    private parseTimeOnDate(date: Date, timeStr: string): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
    }
}
