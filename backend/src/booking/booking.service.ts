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
                capacity: true,
                doctor: { select: { name: true } }
            }
        });
    }

    async generateDailySlots(departmentId: string, date: Date, doctorId?: string) {
        const dayOfWeek = date.getDay();
        console.log(`[BookingService] Generating slots for Dept: ${departmentId}, Doctor: ${doctorId || 'ALL'}, Date: ${date.toISOString()}, DayOfWeek: ${dayOfWeek}`);

        // Priority 1: Doctor-specific schedule (if doctorId provided)
        // Priority 2: Department default schedule (doctorId = null)
        let dbRule = null;

        if (doctorId) {
            // Try to find doctor-specific schedule first
            dbRule = await this.prisma.scheduleRule.findFirst({
                where: { departmentId, doctorId, dayOfWeek }
            });
            console.log(`[BookingService] Doctor-specific rule: ${dbRule ? 'FOUND' : 'NOT FOUND'}`);
        }

        // If no doctor-specific rule, use department default
        if (!dbRule) {
            dbRule = await this.prisma.scheduleRule.findFirst({
                where: { departmentId, doctorId: null, dayOfWeek }
            });
            console.log(`[BookingService] Department default rule: ${dbRule ? 'FOUND' : 'NOT FOUND'}`);
        }

        // Force non-null type by using default object if dbRule is missing
        const finalRule: any = dbRule || {
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
        };

        if (!dbRule) {
            console.warn(`[BookingService] No ScheduleRule found for Dept: ${departmentId}, Doctor: ${doctorId || 'DEFAULT'}, DayOfWeek: ${dayOfWeek}. Using FALLBACK rule.`);
        }

        if (finalRule.isHoliday) {
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

        let currentTime = this.parseTimeOnDate(date, finalRule.startTime);
        const endTime = this.parseTimeOnDate(date, finalRule.endTime);
        const breakStart = finalRule.breakStart ? this.parseTimeOnDate(date, finalRule.breakStart) : null;
        const breakEnd = finalRule.breakEnd ? this.parseTimeOnDate(date, finalRule.breakEnd) : null;

        const slotsToCreate = [];
        while (currentTime < endTime) {
            const isBreak = breakStart && breakEnd && (currentTime >= breakStart && currentTime < breakEnd);
            if (!isBreak) {
                slotsToCreate.push({
                    departmentId,
                    doctorId: doctorId || null,
                    startDateTime: currentTime,
                    endDateTime: addMinutes(currentTime, finalRule.slotDuration),
                    capacity: finalRule.capacityPerSlot,
                    bookedCount: 0,
                    status: SlotStatus.OPEN,
                    version: 0
                });
            }
            currentTime = addMinutes(currentTime, finalRule.slotDuration);
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

            console.log(`[BookingService] Booking process started - Slot: ${slotId}, Patient: ${patientId}, Key: ${idempotencyKey}`);

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
            console.log(`[BookingService] Fetching patient details for ID: ${patientId}`);
            const patient = await tx.patient.findUnique({ where: { id: patientId } });
            if (!patient) {
                console.error(`[BookingService] ❌ Patient not found: ${patientId}`);
                throw new NotFoundException('Patient not found');
            }
            console.log(`[BookingService] Patient found: ${patient.name}, Hospital: ${patient.hospitalId}`);


            if (updatedSlot.bookedCount === updatedSlot.capacity) {
                await tx.slot.update({
                    where: { id: slotId },
                    data: { status: 'FULL' }
                });
                console.log(`[BookingService] Slot marked as FULL`);
            }

            console.log(`[BookingService] Creating appointment record...`);
            const appointment = await tx.appointment.create({
                data: {
                    slotId,
                    patientId,
                    status: 'BOOKED',
                    idempotencyKey,
                    hospitalId: patient.hospitalId,
                    doctorsId: slot.doctorId || null
                }
            });
            console.log(`[BookingService] ✅ Appointment record created: ${appointment.id}`);

            try {
                console.log(`[BookingService] Creating audit log...`);
                await tx.auditLog.create({
                    data: {
                        entityTable: 'Appointment',
                        entityId: appointment.id,
                        action: 'CREATE',
                        newValue: `Appointment created for patient ${patient.name} in slot ${slotId}`,
                        hospitalId: patient.hospitalId
                    }
                });
                console.log(`[BookingService] Audit log created.`);
            } catch (auditError) {
                console.error(`[BookingService] ⚠️ Audit log creation failed:`, auditError);
            }

            // Create admin notification for new appointment
            try {
                console.log(`[BookingService] Preparing admin notification...`);
                const slotWithDetails = await tx.slot.findUnique({
                    where: { id: slotId },
                    include: { department: true }
                });

                if (slotWithDetails && slotWithDetails.department) {
                    const st = slotWithDetails.startDateTime;
                    const formattedTime = `${st.getMonth() + 1}/${st.getDate()} ${st.getHours()}:${String(st.getMinutes()).padStart(2, '0')}`;

                    await tx.notification.create({
                        data: {
                            patientId: 'SYSTEM',
                            type: 'BOOKING_CONFIRMED',
                            title: '🔔 신규 외래 예약',
                            message: `${patient.name} 환자 - ${slotWithDetails.department.name} (${formattedTime})`,
                            triggerId: appointment.id
                        }
                    });
                    console.log(`[BookingService] Admin notification created.`);
                }
            } catch (notiError) {
                console.error(`[BookingService] ⚠️ Notification creation failed:`, notiError);
            }

            console.log(`[BookingService] 🏁 Transaction success for appointment: ${appointment.id}`);
            return appointment;
        });
    }

    async getAppointments(departmentId?: string, date?: Date, doctorId?: string, patientId?: string) {
        const whereClause: any = {};

        if (patientId) {
            whereClause.patientId = patientId;
        }
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
                        status: 'OPEN' // Always reopen if cancelled
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

    /**
     * Walk-in Registration: Find nearest available slot and book it
     */
    async walkInRegistration(patientId: string, departmentId: string, doctorId: string | undefined, idempotencyKey: string) {
        console.log(`[BookingService] Walk-in registration - Patient: ${patientId}, Dept: ${departmentId}, Doctor: ${doctorId || 'any'}`);

        // Get current time in KST
        const now = new Date();
        const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

        // Find available slots starting from now
        const whereClause: any = {
            departmentId,
            status: 'OPEN',
            startDateTime: {
                gte: kstNow  // Only future slots
            }
        };

        if (doctorId) {
            whereClause.doctorId = doctorId;
        }

        // Find the nearest available slot
        const availableSlot = await this.prisma.slot.findFirst({
            where: whereClause,
            orderBy: { startDateTime: 'asc' },  // Nearest first
            include: {
                department: true,
                doctor: true
            }
        });

        if (!availableSlot) {
            throw new Error('No available slots found for walk-in registration. Please generate slots or try a different department.');
        }

        console.log(`[BookingService] Found available slot: ${availableSlot.id} at ${availableSlot.startDateTime}`);

        // Book the slot using existing atomic booking logic
        return this.bookSlotAtomic(availableSlot.id, patientId, idempotencyKey);
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
        const kstDateStr = `${year}-${month}-${day}T${timeStr}:00+09:00`;
        return new Date(kstDateStr);
    }

    async getAdminNotifications() {
        // Get system notifications (patientId = 'SYSTEM')
        return this.prisma.notification.findMany({
            where: { patientId: 'SYSTEM' },
            orderBy: { sentAt: 'desc' },
            take: 50
        });
    }

    async markNotificationRead(id: string) {
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }
    async updateSlotStatus(id: string, status: SlotStatus) {
        return this.prisma.slot.update({
            where: { id },
            data: { status }
        });
    }
}
