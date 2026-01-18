import { Injectable, NotFoundException } from '@nestjs/common';
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
        // 1. Validate Patient/Doctor
        const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
        if (!patient) throw new NotFoundException('Patient not found');

        // 2. Resolve Surgery Type (NEW)
        const surgeryType = await (this.prisma as any).surgeryType.findUnique({ where: { id: dto.surgeryTypeId } });
        if (!surgeryType) throw new NotFoundException('Surgery Type not found');

        // Auto-calculate dates based on SurgeryType if not provided
        const sDate = new Date(dto.surgeryDate);
        // Admission: If required, default to D-1 or usage of defaultStay? Let's assume D-1 for prep if isAdmissionRequired
        // But user requirement says: "Auto-calc default stay/discharge".
        // Let's stick to the DTO dates if provided, otherwise fallback? 
        // Actually the flow is "Admin selects Type -> System Auto-calcs -> Admin Confirms". 
        // So we can assume the DTO received IS the confirmed dates. 
        // We will just validate or use them as is. 
        // But just in case, let's ensure they exist.
        const admission = new Date(dto.admissionDate || subDays(sDate, surgeryType.isAdmissionRequired ? 1 : 0));
        const discharge = new Date(dto.dischargeDate || addDays(sDate, surgeryType.defaultStayDays));

        // 3. Create Surgery Case
        return this.prisma.$transaction(async (tx) => {
            const surgeryCase = await (tx as any).surgeryCase.create({
                data: {
                    patientId: dto.patientId,
                    doctorId: dto.doctorId,
                    surgeryTypeId: dto.surgeryTypeId, // Linked
                    surgeryDate: sDate,
                    admissionDate: admission,
                    dischargeDate: discharge,
                    status: 'CONFIRMED', // Initial status per spec - using string literal to bypass old Enum
                    consultNote: dto.diagnosis
                }
            });

            // 4. Create Care Plan
            const planStart = startOfDay(subDays(sDate, 7));
            const planEnd = startOfDay(addDays(discharge, 14));

            const carePlan = await tx.carePlan.create({
                data: {
                    surgeryCaseId: surgeryCase.id,
                    patientId: dto.patientId,
                    startDate: planStart,
                    endDate: planEnd
                }
            });

            // 5. Generate Standard Care Items (Template Engine - Dynamic)
            await this.generateStandardCareItems(tx, carePlan.id, sDate, surgeryType);

            // 6. Create Initial Notification
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

            // Return Surgery with CarePlan so Frontend can link immediately
            return (tx as any).surgeryCase.findUnique({
                where: { id: surgeryCase.id },
                include: { carePlan: true }
            });
        });
    }

    /**
     * Template Engine: Dynamic based on SurgeryType - Refined for Sprint 3 Detail
     */
    private async generateStandardCareItems(tx: any, carePlanId: string, surgeryDate: Date, type: any) {
        const items = [];
        const sDate = startOfDay(surgeryDate);

        // --- Pre-Admission Phase ---

        // [D-7] Medication Safety
        items.push({
            carePlanId,
            category: CareCategory.MEDICATION, // Changed from NOTICE
            priority: 'CRITICAL', // Explicit Priority
            title: '복용 약물 중단 (아스피린/와파린 등)',
            description: '출혈 위험이 있는 혈전 용해제 복용을 오늘부터 중단해주세요. (담당의 상담 필수)',
            scheduledAt: subDays(sDate, 7)
        });

        // [D-2] Pre-Op Exams
        if (type.isPreOpExamRequired) {
            items.push({
                carePlanId,
                category: CareCategory.EXAM,
                priority: 'CRITICAL',
                title: '수술 전 필수 검사',
                description: '안전한 수술을 위해 혈액검사, X-Ray, 심전도 검사를 완료해야 합니다. 2층 검사실로 방문해주세요.',
                scheduledAt: subDays(sDate, 2)
            });
        }

        // --- Admission/Prep Phase ---

        if (type.isAdmissionRequired) {
            const admissionDate = subDays(sDate, 1);

            // [D-1] Admission
            items.push({
                carePlanId,
                category: CareCategory.NOTICE,
                priority: 'INFO',
                title: '입원 수속 (오후 2시 ~ 4시)',
                description: '1층 원무과에서 입원 수속을 진행해주세요. 준비물: 세면도구, 보호자 침구, 복용 중인 약.',
                scheduledAt: admissionDate
            });

            // [D-1] Fasting (Inpatient)
            items.push({
                carePlanId,
                category: CareCategory.MEAL, // Changed to MEAL
                priority: 'NORMAL',
                title: '금식 시작 (밤 12시부터)',
                description: '자정 이후 물을 포함한 모든 음식 섭취를 금지합니다. 위장을 비워야 안전한 마취가 가능합니다.',
                scheduledAt: admissionDate
            });

            // [D-1] Fluid/Injection
            items.push({
                carePlanId,
                category: CareCategory.INJECTION, // Changed to INJECTION
                priority: 'CRITICAL',
                title: '수액 연결 및 항생제 반응 검사',
                description: '병동 간호 사실에서 수액 라인을 확보하고 항생제 알레르기 반응을 확인합니다.',
                scheduledAt: admissionDate
            });

            // [D-Day] Surgery Start (Inpatient)
            items.push({
                carePlanId,
                category: CareCategory.TREATMENT,
                priority: 'NORMAL',
                title: `[수술] ${type.name}`,
                description: '수술실 이동 전 간호사의 안내를 기다려주세요. 속옷, 장신구, 틀니를 제거해주세요.',
                scheduledAt: sDate
            });

        } else {
            // [D-Day] Outpatient Prep
            items.push({
                carePlanId,
                category: CareCategory.MEAL,
                priority: 'NORMAL',
                title: '금식 (시술 8시간 전)',
                description: '시술 전 8시간 동안 금식을 유지해주세요. (물, 껌, 사탕 포함 금지)',
                scheduledAt: sDate
            });

            // [D-Day] Procedure Start
            items.push({
                carePlanId,
                category: CareCategory.TREATMENT,
                priority: 'NORMAL',
                title: `[시술] ${type.name}`,
                description: '예약된 시간에 3층 내시경센터/시술실로 도착해주세요. 보호자 동반을 권장합니다.',
                scheduledAt: sDate
            });
        }

        // --- Post-Op / Discharge Phase ---

        if (type.defaultStayDays > 0) {
            // Post-Op Recovery (D+1)
            items.push({
                carePlanId,
                category: CareCategory.TREATMENT,
                priority: 'NORMAL',
                title: '회복 경과 확인 (회진)',
                description: '오전 주치의 회진 시 수술 부위 소독 및 상태 확인이 있습니다.',
                scheduledAt: addDays(sDate, 1)
            });

            // Post-Op Meal (D+1)
            items.push({
                carePlanId,
                category: CareCategory.MEAL,
                priority: 'NORMAL',
                title: '식사 시작 (죽/미음)',
                description: '가스가 배출된 후 물부터 섭취하시고, 점심부터 유동식이 제공됩니다.',
                scheduledAt: addDays(sDate, 1)
            });

            // Discharge Day
            const dischargeDate = addDays(sDate, type.defaultStayDays);
            items.push({
                carePlanId,
                category: CareCategory.NOTICE,
                priority: 'INFO',
                title: '퇴원 심사 및 수납',
                description: '오전 회진 후 퇴원이 결정되면, 1층 원무과에서 진료비 수납 후 약을 수령해주세요.',
                scheduledAt: dischargeDate
            });

            items.push({
                carePlanId,
                category: CareCategory.MEDICATION,
                priority: 'CRITICAL',
                title: '퇴원 약 복용 안내',
                description: '처방받은 약(항생제, 진통제)은 안내된 시간에 맞춰 끝까지 복용해야 합니다.',
                scheduledAt: dischargeDate
            });

        } else {
            // Outpatient Recovery & Discharge (Same Day)
            items.push({
                carePlanId,
                category: CareCategory.NOTICE,
                priority: 'INFO',
                title: '귀가 전 상태 확인',
                description: '회복실에서 30분~1시간 안정을 취한 뒤, 어지러움이 없으면 귀가합니다.',
                scheduledAt: sDate
            });
            items.push({
                carePlanId,
                category: CareCategory.MEAL,
                priority: 'NORMAL',
                title: '귀가 후 첫 식사',
                description: '시술 1시간 후부터 가벼운 죽이나 부드러운 음식을 섭취하세요. 자극적인 음식은 피해주세요.',
                scheduledAt: sDate
            });
        }

        await tx.carePlanItem.createMany({ data: items });
    }

    /**
     * Get Daily Care Items for a Patient
     */
    async getDailyCareItems(patientId: string, dateStr: string) {
        const targetDate = startOfDay(new Date(dateStr));
        const nextDay = addDays(targetDate, 1);

        return this.prisma.carePlanItem.findMany({
            where: {
                carePlan: { patientId },
                scheduledAt: {
                    gte: targetDate,
                    lt: nextDay
                }
            },
            include: {
                carePlan: {
                    include: { surgeryCase: true }
                }
            },
            orderBy: { scheduledAt: 'asc' }
        });
    }

    async completeCareItem(itemId: string) {
        return this.prisma.carePlanItem.update({
            where: { id: itemId },
            data: {
                isCompleted: true,
                completedAt: new Date()
            }
        });
    }

    /**
     * Reschedules a surgery and shifts all incomplete care items accordingly.
     */
    async rescheduleSurgery(surgeryCaseId: string, newSurgeryDateStr: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Get current surgery details
            const surgery = await tx.surgeryCase.findUnique({
                where: { id: surgeryCaseId },
                include: { carePlan: true }
            });
            if (!surgery) throw new NotFoundException('Surgery not found');

            const oldDate = surgery.surgeryDate; // Already Date object from Prisma
            const newDate = new Date(newSurgeryDateStr);

            // Calculate Day Difference (Delta)
            // Use time value difference to handle days correctly
            const diffTime = newDate.getTime() - oldDate!.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return surgery; // No change

            // 2. Update Surgery and Admission/Discharge dates (Maintain relative duration)
            const newAdmission = addDays(surgery.admissionDate!, diffDays);
            const newDischarge = addDays(surgery.dischargeDate!, diffDays);

            const updatedSurgery = await tx.surgeryCase.update({
                where: { id: surgeryCaseId },
                data: {
                    surgeryDate: newDate,
                    admissionDate: newAdmission,
                    dischargeDate: newDischarge
                }
            });

            // 3. Update CarePlan Range
            if (surgery.carePlan) {
                await tx.carePlan.update({
                    where: { id: surgery.carePlan.id },
                    data: {
                        startDate: addDays(surgery.carePlan.startDate, diffDays),
                        endDate: addDays(surgery.carePlan.endDate, diffDays)
                    }
                });

                // 4. Shift INCOMPLETE Items
                // We do NOT move completed items as they are historical facts.
                // We only move pending tasks to align with the new schedule.
                const pendingItems = await tx.carePlanItem.findMany({
                    where: {
                        carePlanId: surgery.carePlan.id,
                        isCompleted: false
                    }
                });

                for (const item of pendingItems) {
                    await tx.carePlanItem.update({
                        where: { id: item.id },
                        data: {
                            scheduledAt: addDays(item.scheduledAt, diffDays)
                        }
                    });
                }
            }

            // 5. Create Notification for Patient
            const dateStr = `${newDate.getMonth() + 1}월 ${newDate.getDate()}일`;
            await tx.notification.create({
                data: {
                    patientId: surgery.patientId,
                    type: 'SURGERY_SCHEDULED', // Re-using type or add RESCHEDULED
                    title: '📅 수술 일정이 변경되었습니다',
                    message: `수술 예정일이 ${dateStr}로 변경되었습니다. 이에 맞춰 케어 플랜이 자동으로 업데이트되었습니다.`,
                    sentAt: new Date(),
                    triggerId: surgery.id
                }
            });

            return updatedSurgery;
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

    async addCareItem(dto: any) {
        let planId = dto.carePlanId;

        // If carePlanId is explicit "undefined" string or invalid, try to find by surgeryCaseId if provided
        // Or if the frontend sends surgeryId as planId (fallback logic), check if it's actually a surgeryCaseId
        if (!planId || planId.length < 10) {
            // Logic: If DTO has surgeryCaseId, use it. Failing that, we can't create.
            // But wait, the Frontend sends: carePlanId: surgery.carePlan?.id || surgery.id
            // If surgery.carePlan is missing, it sends surgery.id (SurgeryCase ID).
            // We should check if a CarePlan exists for this ID.
            const plan = await this.prisma.carePlan.findUnique({
                where: { surgeryCaseId: dto.carePlanId } // Try assuming input was SurgeryCaseId
            });

            if (plan) {
                planId = plan.id;
            } else {
                // Try standard lookup?
                // If the input was actually a CarePlan ID, findUnique would likely fail if it was SurgeryCase ID above? No, they are both UUIDs.
                // UUID collision unlikely.
                // Let's assume: if passed ID is SurgeryCaseID, we find the plan.

                // Fallback: Check if CarePlan exists with THIS id directly
                const directPlan = await this.prisma.carePlan.findUnique({ where: { id: dto.carePlanId } });
                if (!directPlan) {
                    // If NOT a direct plan, and we couldn't find by surgeryId above...
                    // Maybe it IS a SurgeryCase ID but no plan exists? (Shouldn't happen in Sprint 3 flow)
                    throw new NotFoundException('Valid Care Plan not found');
                }
                planId = dto.carePlanId;
            }
        } else {
            // Robust check: Is this ID a SurgeryCase ID?
            const planByCase = await this.prisma.carePlan.findUnique({
                where: { surgeryCaseId: dto.carePlanId }
            });
            if (planByCase) {
                planId = planByCase.id;
            }
        }

        const item = await this.prisma.carePlanItem.create({
            data: {
                carePlanId: planId,
                category: dto.category,
                title: dto.title,
                description: dto.description || '',
                scheduledAt: new Date(dto.scheduledAt),
                priority: dto.priority || 'NORMAL',
                metadata: dto.metadata || {},
                isCompleted: false
            },
            include: { carePlan: true } // Need patientId
        });

        // Create Real-time Notification for the patient
        // Determines message based on category
        let message = `새로운 일정 [${dto.title}]이 등록되었습니다.`;
        if (dto.category === 'MEDICATION') message = `[복약 안내] ${dto.title} 일정이 추가되었습니다. 복용법을 확인하세요.`;
        if (dto.category === 'INJECTION') message = `[주사 안내] ${dto.title} 처방이 등록되었습니다.`;

        // Item is typed as just CarePlanItem by default in some Prisma versions unless explicit type arg
        // But runtime has carePlan.
        const itemWithPlan = item as any;

        await this.prisma.notification.create({
            data: {
                patientId: itemWithPlan.carePlan.patientId,
                type: 'SURGERY_SCHEDULED', // Using generic type for now or add 'CARE_UPDATE'
                title: '📝 새로운 케어 일정이 등록되었습니다',
                message,
                sentAt: new Date(),
                triggerId: item.id
            }
        });

        return item;
    }

    async getOverdueItems(hospitalId: string) {
        // Warning Logic: CRITICAL items, not completed, scheduled more than 30 mins ago
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

        return this.prisma.carePlanItem.findMany({
            where: {
                priority: 'CRITICAL',
                isCompleted: false,
                scheduledAt: { lt: thirtyMinsAgo },
                carePlan: {
                    surgery: { hospitalId } // Scope by hospital
                } as any
            },
            include: {
                carePlan: {
                    include: { patient: true }
                }
            },
            orderBy: { scheduledAt: 'desc' }
        });
    }
    // Helper to get items, supporting both planId and surgeryCaseId
    async getCarePlanItems(id: string) {
        // 1. Try finding by CarePlanId
        let items = await this.prisma.carePlanItem.findMany({
            where: { carePlanId: id },
            orderBy: { scheduledAt: 'asc' }
        });

        // 2. If empty, maybe the ID passed is a surgeryCaseId?
        if (items.length === 0) {
            items = await this.prisma.carePlanItem.findMany({
                where: { carePlan: { surgeryCaseId: id } },
                orderBy: { scheduledAt: 'asc' }
            });
        }

        return items;
    }
    async deleteCareItem(id: string) {
        return this.prisma.carePlanItem.delete({
            where: { id }
        });
    }

    async getSurgeryTypes() {
        return (this.prisma as any).surgeryType.findMany();
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
                metadata: data.metadata || undefined
            }
        });
    }

    /**
     * Updates the status of a Surgery Case (State Machine)
     */
    async updateSurgeryStatus(id: string, status: SurgeryStatus) {
        return this.prisma.$transaction(async (tx) => {
            const current = await tx.surgeryCase.findUnique({ where: { id } });
            if (!current) throw new NotFoundException('Surgery Case not found');

            // 1. Update Status
            const updated = await tx.surgeryCase.update({
                where: { id },
                data: { status }
            });

            // 2. Side Effects based on Status Transition
            let title = '';
            let message = '';

            switch (status) {
                case 'ADMITTED':
                    title = '🏥 입원을 환영합니다';
                    message = '입원 수속이 완료되었습니다. 병동 안내 영상을 확인해주세요.';
                    break;
                case 'IN_SURGERY':
                    title = '👨‍⚕️ 수술이 시작되었습니다';
                    message = '환자분의 수술이 시작되었습니다. 보호자분께 대기실 위치를 안내해드립니다.';
                    break;
                case 'POST_OP':
                    title = '🛌 수술이 종료되었습니다';
                    message = '회복실로 이동하였습니다. 마취에서 깨어날 때까지 안정이 필요합니다.';
                    break;
                case 'DISCHARGED':
                    title = '👋 퇴원을 축하합니다';
                    message = '퇴원 수속이 완료되었습니다. 퇴원 약 복용과 다음 외래 일정을 꼭 확인하세요.';
                    break;
                case 'CANCELED' as SurgeryStatus:
                    title = '🚫 수술이 취소되었습니다';
                    message = '수술 예약이 취소되었습니다. 자세한 사항은 병원으로 문의해주세요.';
                    break;
            }

            if (title) {
                await tx.notification.create({
                    data: {
                        patientId: current.patientId,
                        type: 'SURGERY_SCHEDULED', // Use standard type
                        title,
                        message,
                        sentAt: new Date(),
                        triggerId: id
                    }
                });
            }

            return updated;
        });
    }

    async updateSurgery(id: string, data: any) {
        const updateData: any = {};
        if (data.roomNumber !== undefined) updateData.roomNumber = data.roomNumber;
        if (data.diagnosis) updateData.consultNote = data.diagnosis;
        if (data.doctorId) updateData.doctorId = data.doctorId;
        if (data.surgeryDate) updateData.surgeryDate = new Date(data.surgeryDate);
        if (data.admissionDate) updateData.admissionDate = new Date(data.admissionDate);
        if (data.dischargeDate) updateData.dischargeDate = new Date(data.dischargeDate);

        return this.prisma.surgeryCase.update({
            where: { id },
            data: updateData
        });
    }
}
