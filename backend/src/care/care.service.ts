import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurgeryDto } from './dto/create-surgery.dto';
import { CareCategory, SurgeryStatus } from '@prisma/client';
import { addDays, subDays, parseISO, startOfDay } from 'date-fns';

@Injectable()
export class CareService {
    constructor(private prisma: PrismaService) { }

    /**
     * Registers a new Surgery Case and auto-generates a Care Plan.
     */
    async registerSurgery(dto: CreateSurgeryDto) {
        console.log("[CareService] registerSurgery START", dto);
        try {
            // 1. Validate Patient/Doctor
            const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
            if (!patient) {
                console.error("[CareService] Patient not found ID:", dto.patientId);
                throw new NotFoundException('Patient not found');
            }

            const doctor = await this.prisma.doctor.findUnique({ where: { id: dto.doctorId || 'doc_test_01' } });
            if (!doctor) {
                console.error("[CareService] Doctor not found ID:", dto.doctorId);
                throw new NotFoundException('Doctor not found (Internal Setup required)');
            }

            // 2. Resolve Surgery Type
            const surgeryType = await this.prisma.surgeryType.findUnique({ where: { id: dto.surgeryTypeId } });
            if (!surgeryType) {
                console.error("[CareService] Surgery Type not found ID:", dto.surgeryTypeId);
                throw new NotFoundException('Surgery Type not found');
            }

            // Date Parsing with Safety
            const sDate = new Date(dto.surgeryDate);
            if (isNaN(sDate.getTime())) throw new BadRequestException('Invalid surgery date');

            const admission = (dto.admissionDate && dto.admissionDate !== '')
                ? new Date(dto.admissionDate)
                : subDays(sDate, surgeryType.isAdmissionRequired ? 1 : 0);

            const discharge = (dto.dischargeDate && dto.dischargeDate !== '')
                ? new Date(dto.dischargeDate)
                : addDays(sDate, surgeryType.defaultStayDays);

            // 3. Create Surgery Case
            return await this.prisma.$transaction(async (tx) => {
                console.log("[CareService] Transaction step 1: SurgeryCase");
                const surgeryCase = await tx.surgeryCase.create({
                    data: {
                        patientId: dto.patientId,
                        doctorId: dto.doctorId || 'doc_test_01',
                        surgeryTypeId: dto.surgeryTypeId,
                        surgeryDate: sDate,
                        admissionDate: admission,
                        dischargeDate: discharge,
                        status: 'CONFIRMED',
                        consultNote: dto.diagnosis,
                        hospitalId: patient.hospitalId // [FIX] Injected
                    }
                });

                // 4. Create Care Plan
                console.log("[CareService] Transaction step 2: CarePlan");
                const planStart = startOfDay(subDays(sDate, 7));
                const planEnd = startOfDay(addDays(discharge, 14));

                const carePlan = await tx.carePlan.create({
                    data: {
                        surgeryCaseId: surgeryCase.id,
                        patientId: dto.patientId,
                        startDate: planStart,
                        endDate: planEnd,
                        hospitalId: patient.hospitalId // [FIX] Injected
                    }
                });

                // 5. Generate Standard Care Items (Template Engine - Dynamic)
                console.log("[CareService] Transaction step 3: generateStandardCareItems");
                const surgeryTypeWithOverride = {
                    ...surgeryType,
                    medicationStopDays: dto.medicationStopDays ?? surgeryType.medicationStopDays
                };
                await this.generateStandardCareItems(tx, carePlan.id, sDate, surgeryTypeWithOverride);

                // 6. Create Initial Notification
                console.log("[CareService] Transaction step 4: notification");
                const dateStr = `${sDate.getMonth() + 1}월 ${sDate.getDate()}일`;
                const admStr = surgeryType.isAdmissionRequired ? `(입원: ${admission.getMonth() + 1}/${admission.getDate()})` : '(당일 시술)';

                await tx.notification.create({
                    data: {
                        patientId: dto.patientId,
                        type: 'SURGERY_SCHEDULED',
                        title: '🎉 수술 예약이 확정되었습니다',
                        message: `수술일[${dateStr}]이 확정되었습니다. ${admStr} - 상세 일정은 '나의 일정' 탭에서 확인하세요.`,
                        sentAt: new Date(),
                        triggerId: surgeryCase.id
                    }
                });

                console.log("[CareService] Transaction SUCCESS");
                // Return Surgery with CarePlan so Frontend can link immediately
                return tx.surgeryCase.findUnique({
                    where: { id: surgeryCase.id },
                    include: { carePlan: true }
                });
            });
        } catch (e) {
            console.error("[CareService] registerSurgery FAILED error:", e);
            throw e;
        }
    }

    /**
     * Template Engine: Dynamic based on SurgeryType - Refined for Sprint 3 Detail
     */
    private async generateStandardCareItems(tx: any, carePlanId: string, surgeryDate: Date, type: any) {
        const items = [];
        const sDate = startOfDay(surgeryDate);

        // --- Pre-Admission Phase ---

        // [D-? ] Medication Safety
        const stopDays = type.medicationStopDays || 7;
        items.push({
            carePlanId,
            category: CareCategory.MEDICATION,
            priority: 'CRITICAL',
            title: `복용 약물 중단 (최소 ${stopDays}일 전)`,
            description: '출혈 위험이 있는 혈전 용해제(아스피린/와파린 등) 복용을 오늘부터 중단해주세요. (담당의 상담 필수)',
            scheduledAt: subDays(sDate, stopDays)
        });

        // [D-3] Pre-op Testing
        if (type.isPreOpExamRequired) {
            items.push({
                carePlanId,
                category: CareCategory.EXAM,
                priority: 'NORMAL',
                title: '수술 전 사전 검사 (혈액/흉부X-ray/심전도)',
                description: '외래 방문하여 수술에 필요한 기본적인 신체 컨디션을 체크합니다.',
                scheduledAt: subDays(sDate, 3)
            });
        }

        // [D-1] Admission & Fasting
        items.push({
            carePlanId,
            category: CareCategory.NOTICE,
            priority: 'NORMAL',
            title: '입원 수속 안내',
            description: '오후 2시까지 본관 1층 원무과에서 입원 수속을 마쳐주세요.',
            scheduledAt: subDays(sDate, 1)
        });

        items.push({
            carePlanId,
            category: CareCategory.MEAL, // Changed to MEAL
            priority: 'CRITICAL',
            title: '자정부터 금식 시작',
            description: '수술을 위해 물을 포함한 모든 음식 섭취를 중단해주세요.',
            scheduledAt: startOfDay(sDate)
        });

        // --- Surgery Day (D-Day) ---
        items.push({
            carePlanId,
            category: CareCategory.INJECTION, // Changed to INJECTION
            priority: 'CRITICAL',
            title: '수술전 항생제 테스트 및 수액 개시',
            description: '수술실 이동 1시간 전 간호사가 방문하여 준비를 도와드립니다.',
            scheduledAt: sDate
        });

        // [New] Actual Surgery Event at Exact Time
        items.push({
            carePlanId,
            category: CareCategory.TREATMENT,
            priority: 'CRITICAL',
            title: `🩺 ${type.name} (수술 시작)`,
            description: '수술실로 이동합니다. 보호자분께서는 대기실이나 병실에서 대기해주세요.',
            scheduledAt: surgeryDate
        });

        // --- Post-Op Phase (Recovery) ---
        const recoveryDays = type.defaultStayDays || 1;
        for (let i = 1; i <= recoveryDays; i++) {
            items.push({
                carePlanId,
                category: CareCategory.TREATMENT,
                priority: 'NORMAL',
                title: `회복 및 드레싱 (POD ${i})`,
                description: '회진 시 상처 부위를 소독하고 경과를 관찰합니다.',
                scheduledAt: addDays(sDate, i)
            });

            items.push({
                carePlanId,
                category: CareCategory.MEDICATION,
                priority: 'NORMAL',
                title: '통증 조절 및 약물 복용',
                description: '처방된 진통제와 항생제를 복용합니다.',
                scheduledAt: addDays(sDate, i)
            });
        }

        // --- Discharge Phase ---
        items.push({
            carePlanId,
            category: CareCategory.NOTICE,
            priority: 'NORMAL',
            title: '퇴원 수속 및 약 수령',
            description: '퇴원 허정 후 원무과 수속 및 가정 복용약을 수령합니다.',
            scheduledAt: addDays(sDate, recoveryDays)
        });

        // --- Post-Discharge (Follow-up) ---
        items.push({
            carePlanId,
            category: CareCategory.EXAM,
            priority: 'NORMAL',
            title: '첫 외래 추적 관찰 (실밥 제거 등)',
            description: '퇴원 후 첫 방문일입니다. 예약 시간을 확인하세요.',
            scheduledAt: addDays(sDate, recoveryDays + 7)
        });

        // Bulk insert for efficiency
        await tx.carePlanItem.createMany({ data: items });
    }

    async getActiveSurgeries(hospitalId: string) {
        return this.prisma.surgeryCase.findMany({
            include: {
                patient: true,
                surgeryType: true,
                doctor: true,
                carePlan: true
            },
            orderBy: { surgeryDate: 'asc' }
        });
    }

    async getCarePlan(surgeryCaseId: string) {
        return this.prisma.carePlan.findUnique({
            where: { surgeryCaseId },
            include: {
                items: { orderBy: { scheduledAt: 'asc' } },
                surgeryCase: {
                    include: {
                        patient: true,
                        surgeryType: true,
                        doctor: true
                    }
                }
            }
        });
    }

    async getDailyCareItems(patientId: string, dateStr: string) {
        const date = startOfDay(new Date(dateStr));
        const nextDay = addDays(date, 1);

        return this.prisma.carePlanItem.findMany({
            where: {
                carePlan: { patientId },
                scheduledAt: { gte: date, lt: nextDay }
            },
            orderBy: { scheduledAt: 'asc' }
        });
    }

    async completeCareItem(itemId: string) {
        return this.prisma.carePlanItem.update({
            where: { id: itemId },
            data: { isCompleted: true, completedAt: new Date() }
        });
    }

    async rescheduleSurgery(surgeryCaseId: string, newSurgeryDateStr: string) {
        const newDate = new Date(newSurgeryDateStr);
        return this.prisma.surgeryCase.update({
            where: { id: surgeryCaseId },
            data: { surgeryDate: newDate }
        });
        // Note: Real implement should shift all care items too
    }

    async deleteCareItem(id: string) {
        return this.prisma.carePlanItem.delete({
            where: { id }
        });
    }

    async getSurgeryTypes() {
        return this.prisma.surgeryType.findMany();
    }

    async updateCareItem(id: string, data: any) {
        return this.prisma.carePlanItem.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
                category: data.category,
                priority: data.priority,
                isCompleted: data.isCompleted,
                completedAt: data.isCompleted ? new Date() : null
            }
        });
    }

    async updateSurgeryStatus(id: string, status: string) {
        // Validation check for enum safety
        const validStatuses = ['CONFIRMED', 'ADMITTED', 'IN_SURGERY', 'POST_OP', 'DISCHARGED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException('Invalid surgery status');
        }

        const surgery = await this.prisma.surgeryCase.update({
            where: { id },
            data: { status: status as SurgeryStatus },
            include: { patient: true }
        });

        // Trigger notifications based on status
        let notiTitle = '';
        let notiMsg = '';

        switch (status as SurgeryStatus) {
            case 'ADMITTED':
                notiTitle = '🏥 입실 완료 안내';
                notiMsg = `${surgery.patient.name}님, 병실 입실이 완료되었습니다. 편안한 안정을 도와드리겠습니다.`;
                break;
            case 'IN_SURGERY':
                notiTitle = '🕒 수술 시작 안내';
                notiMsg = `${surgery.patient.name}님의 수술이 지금 시작되었습니다. 완료 시 다시 안내해 드립니다.`;
                break;
            case 'POST_OP':
                notiTitle = '✅ 수술 종료 안내';
                notiMsg = `${surgery.patient.name}님의 수술이 무사히 종료되었습니다. 회복실로 이동 중입니다.`;
                break;
            case 'DISCHARGED':
                notiTitle = '🎉 퇴원 수속 완료';
                notiMsg = `${surgery.patient.name}님, 오늘 퇴원하심을 축하드립니다! 가정에서의 주의사항을 꼭 확인하세요.`;
                break;
        }

        if (notiTitle) {
            await this.prisma.notification.create({
                data: {
                    patientId: surgery.patientId,
                    type: 'SURGERY_SCHEDULED', // Using existing type for now
                    title: notiTitle,
                    message: notiMsg,
                    sentAt: new Date(),
                    triggerId: surgery.id
                }
            });
        }

        return surgery;
    }

    async updateSurgery(id: string, data: any) {
        // Ensure date strings are converted to Date objects for Prisma
        // Note: The original instruction's 'submissionData' and 'DateTime.fromISO'
        // seem to be from a client-side or DTO transformation context.
        // For the service layer, converting string to Date object is sufficient
        return this.prisma.surgeryCase.update({
            where: { id },
            data: {
                surgeryDate: data.surgeryDate ? new Date(data.surgeryDate) : undefined,
                admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
                dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : undefined,
                roomNumber: data.roomNumber,
                consultNote: data.consultNote,
                status: data.status
            }
        });
    }

    async createSurgeryType(data: any) {
        // [FIX] Assign to Default Hospital if not provided (for now)
        const hospital = await this.prisma.hospital.findFirst();

        return this.prisma.surgeryType.create({
            data: {
                id: data.id, // ID is manually provided (e.g., 'ophthal_cataract')
                name: data.name,
                type: data.type,
                isAdmissionRequired: data.isAdmissionRequired,
                defaultStayDays: parseInt(data.defaultStayDays),
                isPreOpExamRequired: data.isPreOpExamRequired,
                medicationStopDays: data.medicationStopDays ? parseInt(data.medicationStopDays) : 7,
                hospitalId: hospital?.id || null, // [FIX] Linked
                departmentId: data.departmentId || null,
                isSystemDefault: false
            }
        });
    }

    async getNotifications(patientId: string) {
        return this.prisma.notification.findMany({
            where: { patientId },
            orderBy: { sentAt: 'desc' }
        });
    }

    async markNotificationRead(id: string) {
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }

    async getOverdueItems(hospitalId: string) {
        // Find items that are not completed and scheduled in the past
        return this.prisma.carePlanItem.findMany({
            where: {
                isCompleted: false,
                scheduledAt: { lt: new Date() }
            },
            include: {
                carePlan: {
                    include: {
                        patient: true,
                        surgeryCase: { include: { surgeryType: true } }
                    }
                }
            },
            orderBy: { scheduledAt: 'asc' }
        });
    }

    async addCareItem(dto: any) {
        return this.prisma.carePlanItem.create({
            data: {
                carePlanId: dto.carePlanId,
                category: dto.category,
                title: dto.title,
                description: dto.description,
                scheduledAt: new Date(dto.scheduledAt),
                priority: dto.priority || 'NORMAL'
            }
        });
    }

    async getCarePlanItems(carePlanId: string) {
        return this.prisma.carePlanItem.findMany({
            where: { carePlanId },
            orderBy: { scheduledAt: 'asc' }
        });
    }

    async deleteSurgeryCase(id: string) {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Find CarePlan ID
            const carePlan = await tx.carePlan.findUnique({
                where: { surgeryCaseId: id }
            });

            if (carePlan) {
                // 2. Delete CarePlanItems
                await tx.carePlanItem.deleteMany({
                    where: { carePlanId: carePlan.id }
                });
                // 3. Delete CarePlan
                await tx.carePlan.delete({
                    where: { id: carePlan.id }
                });
            }

            // 4. Delete Notifications related to this surgery
            await tx.notification.deleteMany({
                where: { triggerId: id }
            });

            // 5. Delete SurgeryCase
            return await tx.surgeryCase.delete({
                where: { id }
            });
        });
    }

    async deleteSurgeryType(id: string) {
        return this.prisma.surgeryType.delete({
            where: { id }
        });
    }
}
