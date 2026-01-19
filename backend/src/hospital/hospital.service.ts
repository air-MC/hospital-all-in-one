import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HospitalService {
    constructor(private prisma: PrismaService) { }

    async getDepartments() {
        return this.prisma.department.findMany({
            include: {
                doctors: true
            }
        });
    }

    async getDoctors(departmentId?: string) {
        return this.prisma.doctor.findMany({
            where: departmentId ? { departmentId } : {},
            include: {
                department: true
            }
        });
    }

    async findPatientByPhone(phone: string) {
        const normalized = phone.replace(/[^0-9]/g, '');
        console.log(`[HospitalService] Looking up patient. Input: ${phone}, Normalized: ${normalized}`);

        return this.prisma.patient.findFirst({
            where: {
                OR: [
                    { phone: normalized },
                    { phone: phone }
                ]
            }
        });
    }

    async registerPatient(data: { name: string, phone: string, birthDate: string, gender: 'M' | 'F', hospitalId?: string }) {
        const normalized = data.phone.replace(/[^0-9]/g, '');
        console.log(`[HospitalService] Registering patient with normalized phone: ${normalized}`, data);

        // Ensure hospital exists
        let hospitalId = data.hospitalId;
        if (!hospitalId) {
            const defaultHospital = await this.prisma.hospital.findFirst();
            if (defaultHospital) hospitalId = defaultHospital.id;
            else {
                // Create default if completely empty
                const newH = await this.prisma.hospital.create({ data: { name: 'Main Hospital' } });
                hospitalId = newH.id;
            }
        }

        try {
            return await this.prisma.patient.create({
                data: {
                    name: data.name,
                    phone: normalized,
                    birthDate: new Date(data.birthDate),
                    gender: data.gender,
                    hospitalId: hospitalId
                }
            });
        } catch (error) {
            console.error(`[HospitalService] Registration failed (possible duplicate phone):`, error);
            throw error;
        }
    }

    async searchPatients(query: string) {
        const normalizedQuery = query.replace(/[^0-9]/g, '');
        console.log(`[HospitalService] Searching patients for query: ${query} (normalized: ${normalizedQuery})`);
        return this.prisma.patient.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: normalizedQuery && normalizedQuery.length > 0 ? normalizedQuery : query } }
                ]
            },
            take: 20
        });
    }

    async createDepartment(name: string) {
        // Find existing hospital or create one for demo purposes
        let hospital = await this.prisma.hospital.findFirst();
        if (!hospital) {
            hospital = await this.prisma.hospital.create({
                data: {
                    name: 'Main Hospital',
                }
            });
        }

        return this.prisma.department.create({
            data: {
                name,
                hospitalId: hospital.id
            }
        });
    }

    async createDoctor(name: string, departmentId: string) {
        const dept = await this.prisma.department.findUnique({
            where: { id: departmentId }
        });
        if (!dept) throw new Error('Department not found');

        return this.prisma.doctor.create({
            data: {
                name,
                departmentId,
                hospitalId: dept.hospitalId
            }
        });
    }

    // --- Hospital Management ---
    async getHospitalInfo() {
        return this.prisma.hospital.findFirst();
    }

    async updateHospitalInfo(id: string, name: string) {
        return this.prisma.hospital.update({
            where: { id },
            data: { name }
        });
    }

    async updateHospitalStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED') {
        return this.prisma.hospital.update({
            where: { id },
            data: { status }
        });
    }

    async getDepartmentSchedules(departmentId: string) {
        return this.prisma.scheduleRule.findMany({
            where: { departmentId },
            orderBy: { dayOfWeek: 'asc' }
        });
    }

    async updateDepartmentSchedule(departmentId: string, schedules: any[]) {
        console.log(`[HospitalService] Updating schedules for Dept: ${departmentId}, Count: ${schedules.length}`);
        const results = [];
        for (const s of schedules) {
            try {
                // Ensure valid integers, fallback to defaults if NaN/invalid
                const slotDuration = Number(s.slotDuration) > 0 ? Number(s.slotDuration) : 30;
                const capacityPerSlot = Number(s.capacityPerSlot) > 0 ? Number(s.capacityPerSlot) : 3;

                console.log(`[HospitalService] Processing Day ${s.dayOfWeek}: Holiday=${s.isHoliday}, Duration=${slotDuration}, Cap=${capacityPerSlot}`);

                const rule = await this.prisma.scheduleRule.upsert({
                    where: {
                        departmentDayIndex: {
                            departmentId,
                            dayOfWeek: s.dayOfWeek
                        }
                    },
                    update: {
                        startTime: s.startTime || '09:00',
                        endTime: s.endTime || '18:00',
                        breakStart: s.breakStart || null,
                        breakEnd: s.breakEnd || null,
                        isHoliday: Boolean(s.isHoliday),
                        slotDuration: slotDuration,
                        capacityPerSlot: capacityPerSlot
                    },
                    create: {
                        departmentId,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime || '09:00',
                        endTime: s.endTime || '18:00',
                        breakStart: s.breakStart || null,
                        breakEnd: s.breakEnd || null,
                        isHoliday: Boolean(s.isHoliday),
                        slotDuration: slotDuration,
                        capacityPerSlot: capacityPerSlot
                    }
                });
                results.push(rule);
            } catch (err) {
                console.error(`[HospitalService] Error processing day ${s.dayOfWeek}:`, err);
                throw err; // Re-throw to inform client
            }
        }
        return results;
    }
}
