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

    async getDoctors(departmentId: string) {
        return this.prisma.doctor.findMany({
            where: { departmentId }
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

    async registerPatient(data: { name: string, phone: string, birthDate: string, gender: 'M' | 'F' }) {
        const normalized = data.phone.replace(/[^0-9]/g, '');
        console.log(`[HospitalService] Registering patient with normalized phone: ${normalized}`, data);
        try {
            return await this.prisma.patient.create({
                data: {
                    name: data.name,
                    phone: normalized,
                    birthDate: new Date(data.birthDate),
                    gender: data.gender
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
        return this.prisma.doctor.create({
            data: {
                name,
                departmentId
            }
        });
    }
}
