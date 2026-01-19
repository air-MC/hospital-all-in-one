import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlotStatus } from '@prisma/client';
import { addMinutes, startOfDay, endOfDay, isBefore } from 'date-fns';

@Injectable()
export class BookingService {
    constructor(private prisma: PrismaService) { }

    async getAvailableSlots(departmentId: string, date: Date, doctorId?: string) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Force KST Query Range
        const start = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
        const end = new Date(`${year}-${month}-${day}T23:59:59.999+09:00`);

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
        console.log(`[BookingService] Generating slots for Dept: ${departmentId}, Date: ${date.toISOString()}, DayOfWeek: ${dayOfWeek}`);

        let rule = await this.prisma.scheduleRule.findFirst({
            where: { departmentId, dayOfWeek }
        });

        if (!rule) {
            console.warn(`[BookingService] No ScheduleRule found for Dept: ${departmentId}, DayOfWeek: ${dayOfWeek}. Using DEFAULT rule.`);
            // Use Default Rule on the fly
            rule = {
                id: 'default',
                departmentId,
                dayOfWeek,
                startTime: '09:00',
                endTime: '18:00',
                breakStart: '12:00',
                breakEnd: '13:00',
                slotDuration: 30,
                capacityPerSlot: 3,
                isHoliday: false
            } as any;
        }

        if (rule.isHoliday) {
            return { count: 0, message: 'Holiday' };
        }

        const start = startOfDay(date);
        const end = endOfDay(date);

        // Check for existing appointments before deleting slots
        const appointmentsCount = await this.prisma.appointment.count({
            where: {
                slot: {
                    departmentId,
                    ...(doctorId ? { doctorId } : {}),
                    startDateTime: { gte: start, lte: end }
                }
            }
        });

        if (appointmentsCount > 0) {
            throw new ConflictException(`이미 예약이 ${appointmentsCount}건 존재하여 슬롯을 다시 생성할 수 없습니다.`);
        }

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

        console.log(`[BookingService] Creating ${slotsToCreate.length} slots...`);
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

            // [FIX] Get Patient's Hospital ID
            const patient = await tx.patient.findUnique({ where: { id: patientId } });
            if (!patient) throw new NotFoundException('Patient not found');


            if (updatedSlot.bookedCount === updatedSlot.capacity) {
                await tx.slot.update({
                    where: { id: slotId },
                    data: { status: 'FULL' }
                });
            }

            const appointment = await tx.appointment.create({
                data: {
                    slotId,
                    patientId,
                    status: 'BOOKED',
                    idempotencyKey,
                    hospitalId: patient.hospitalId // [FIX] Injected
                }
            });

            await tx.auditLog.create({
                data: {
                    entityTable: 'Appointment',
                    entityId: appointment.id,
                    action: 'CREATE',
                    newValue: JSON.stringify(appointment),
                    hospitalId: patient.hospitalId // [FIX] Injected
                }
            });

            return appointment;
        });
    }

    async getAppointments(departmentId?: string, date?: Date, doctorId?: string) {
        const whereClause: any = {};
        if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            // Force KST Query Range
            const start = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
            const end = new Date(`${year}-${month}-${day}T23:59:59.999+09:00`);

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
                    newValue: status,
                    hospitalId: oldAppt.hospitalId // [FIX] Preserved
                }
            });

            return appt;
        });
    }

    async getStats() {
        try {
            const todayStart = startOfDay(new Date());
            const todayEnd = endOfDay(new Date());
            console.log(`[BookingService] getStats called. Range: ${todayStart.toISOString()} - ${todayEnd.toISOString()}`);

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

            console.log(`[BookingService] getStats result - Total: ${totalAppts}, CheckedIn: ${checkedInAppts}, ActiveSurgeries: ${activeSurgeries}`);

            return {
                today: {
                    totalAppointments: totalAppts,
                    checkedIn: checkedInAppts,
                    progress: totalAppts > 0 ? Math.round((checkedInAppts / totalAppts) * 100) : 0
                },
                activeSurgeries,
                recentActivity: recentLogs
            };
        } catch (error) {
            console.error('[BookingService] Error in getStats:', error);
            throw error;
        }
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
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Force KST (UTC+9) interpretation
        // "2025-01-19T09:00:00+09:00" -> This creates the correct UTC timestamp for 9 AM KST
        const isoString = `${year}-${month}-${day}T${timeStr}:00+09:00`;
        return new Date(isoString);
    }
}
