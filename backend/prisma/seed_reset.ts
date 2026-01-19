
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Cleaning up database...');

    try {
        await prisma.notification.deleteMany();
        await prisma.carePlanItem.deleteMany();
        await prisma.carePlan.deleteMany();
        await prisma.surgeryCase.deleteMany();
        await prisma.appointment.deleteMany();
    } catch (e) {
        console.log('Cleanup non-critical error or empty tables');
    }

    console.log('✨ Creating Demo Data...');

    // 1. Ensure Hospital & Dept
    let hospital = await prisma.hospital.findFirst();
    if (!hospital) {
        hospital = await prisma.hospital.create({
            data: { name: '서울대학교병원' }
        });
    }

    // 2. Ensure Departments & Doctors
    const departments = [
        { name: '외과', doctor: '이명의' },
        { name: '내과', doctor: '김내과' },
        { name: '정형외과', doctor: '최정형' },
        { name: '피부과', doctor: '박피부' }
    ];

    for (const d of departments) {
        let dept = await prisma.department.findFirst({ where: { name: d.name } });
        if (!dept) {
            dept = await prisma.department.create({
                data: {
                    name: d.name,
                    hospitalId: hospital.id
                }
            });
        }

        let doctor = await prisma.doctor.findFirst({ where: { name: d.doctor } });
        if (!doctor) {
            doctor = await prisma.doctor.create({
                data: {
                    name: d.doctor,
                    departmentId: dept.id,
                    hospitalId: dept.hospitalId
                }
            });
        }

        // --- NEW: Add Schedule Rules for 1-5 (Mon-Fri) ---
        for (let day = 1; day <= 5; day++) {
            const existingRule = await prisma.scheduleRule.findFirst({
                where: { departmentId: dept.id, dayOfWeek: day }
            });
            if (!existingRule) {
                await prisma.scheduleRule.create({
                    data: {
                        departmentId: dept.id,
                        dayOfWeek: day,
                        startTime: '09:00',
                        endTime: '18:00',
                        breakStart: '12:00',
                        breakEnd: '13:00',
                        slotDuration: 30,
                        capacityPerSlot: 5
                    }
                });
            }
        }
    }

    // Fetch 'Oegwa' for the demo surgery case
    const dept = await prisma.department.findFirst({ where: { name: '외과' } });
    const doctor = await prisma.doctor.findFirst({ where: { name: '이명의' } });

    if (!dept || !doctor) throw new Error("Failed to seed base dept/doctor");


    // 3. Ensure Patient
    let patient = await prisma.patient.findFirst({ where: { name: '김환자' } });
    if (!patient) {
        patient = await prisma.patient.create({
            data: {
                name: '김환자',
                phone: '01012345678',
                birthDate: new Date('1980-01-01'),
                gender: 'M',
                hospitalId: hospital.id
            }
        });
    }

    // 4. Ensure Surgery Types
    console.log('💉 Seeding Surgery Types...');
    const surgeryTypesList = [
        { id: 'ophthal_cataract', name: '백내장 수술 (안과)', type: 'SURGERY', isAdmissionRequired: true, defaultStayDays: 1, isPreOpExamRequired: true },
        { id: 'ophthal_glaucoma', name: '녹내장 수술 (안과)', type: 'SURGERY', isAdmissionRequired: true, defaultStayDays: 2, isPreOpExamRequired: true },
        { id: 'ophthal_lasik', name: '라식/라섹 (안과)', type: 'PROCEDURE', isAdmissionRequired: false, defaultStayDays: 0, isPreOpExamRequired: false },
        { id: 'ophthal_injection', name: '유리체 주사 (안과)', type: 'PROCEDURE', isAdmissionRequired: false, defaultStayDays: 0, isPreOpExamRequired: false },
        { id: 'ortho_knee_replace', name: '무릎 인공관절 치환술 (정형외과)', type: 'SURGERY', isAdmissionRequired: true, defaultStayDays: 5, isPreOpExamRequired: true },
        { id: 'ortho_shoulder', name: '어깨 관절경 (정형외과)', type: 'SURGERY', isAdmissionRequired: true, defaultStayDays: 2, isPreOpExamRequired: true },
        { id: 'ortho_manual', name: '도수치료 (정형외과)', type: 'PROCEDURE', isAdmissionRequired: false, defaultStayDays: 0, isPreOpExamRequired: false },
        { id: 'ortho_injection', name: '관절 주사 (정형외과)', type: 'PROCEDURE', isAdmissionRequired: false, defaultStayDays: 0, isPreOpExamRequired: false },
        { id: 'internal_gastroscopy', name: '위내시경 (내과)', type: 'PROCEDURE', isAdmissionRequired: false, defaultStayDays: 0, isPreOpExamRequired: false },
        { id: 'internal_colonoscopy', name: '대장내시경 (내과)', type: 'PROCEDURE', isAdmissionRequired: false, defaultStayDays: 0, isPreOpExamRequired: true },
        { id: 'internal_polyp', name: '용종 절제술 (내과)', type: 'PROCEDURE', isAdmissionRequired: true, defaultStayDays: 1, isPreOpExamRequired: true },
        { id: 'internal_stomach_cancer', name: '위암 수술 (내과/외과)', type: 'SURGERY', isAdmissionRequired: true, defaultStayDays: 5, isPreOpExamRequired: true }
    ];

    for (const st of surgeryTypesList) {
        await (prisma as any).surgeryType.upsert({
            where: { id: st.id },
            update: st,
            create: st
        });
    }

    const surgeryType = await (prisma as any).surgeryType.findUnique({ where: { id: 'internal_stomach_cancer' } });

    // 5. Create Surgery Case (Tomorrow)
    // Logic: Tomorrow 2 PM
    const now = new Date();
    const surgeryDate = new Date(now);
    surgeryDate.setDate(now.getDate() + 1);
    surgeryDate.setHours(14, 0, 0, 0);

    const admissionDate = new Date(surgeryDate);
    admissionDate.setDate(surgeryDate.getDate() - 1); // D-1

    const dischargeDate = new Date(surgeryDate);
    dischargeDate.setDate(surgeryDate.getDate() + 4); // D+4

    const surgeryCase = await prisma.surgeryCase.create({
        data: {
            patientId: patient.id,
            doctorId: doctor.id,
            surgeryTypeId: surgeryType.id,
            surgeryDate: surgeryDate,
            admissionDate: admissionDate,
            dischargeDate: dischargeDate,
            consultNote: '상세불명의 위암. 조기 발견으로 예후가 좋을 것으로 예상됨.',
            status: 'CONFIRMED',
            hospitalId: hospital.id
        }
    });

    // 6. Create Care Plan
    const carePlan = await prisma.carePlan.create({
        data: {
            surgeryCaseId: surgeryCase.id,
            patientId: patient.id,
            startDate: admissionDate,
            endDate: dischargeDate,
            hospitalId: hospital.id
        }
    });

    console.log(`✅ Created SurgeryCase: ${surgeryCase.id} for Patient ${patient.name}`);

    // 7. Add Sample Care Items
    // 7-1. Admission Notice (Today 2PM)
    const noticeTime = new Date(admissionDate);
    noticeTime.setHours(14, 0, 0, 0);

    await prisma.carePlanItem.create({
        data: {
            carePlanId: carePlan.id,
            category: 'NOTICE',
            title: '입원 수속 및 안내',
            description: '1층 원무과에서 입원 수속 후 5층 간호스테이션으로 오세요.',
            scheduledAt: noticeTime,
            priority: 'NORMAL'
        }
    });

    // 7-2. Fasting (Surgery Day Morning 7AM)
    const fastingTime = new Date(surgeryDate);
    fastingTime.setHours(7, 0, 0, 0);

    await prisma.carePlanItem.create({
        data: {
            carePlanId: carePlan.id,
            category: 'MEAL',
            title: '금식 (물 포함)',
            description: '수술 전날 자정부터 금식입니다.',
            scheduledAt: fastingTime,
            priority: 'CRITICAL'
        }
    });

    // 7-3. Antibiotics (Surgery Day 12PM - 2 hours before 14:00)
    const injTime = new Date(surgeryDate);
    injTime.setHours(12, 0, 0, 0);

    await prisma.carePlanItem.create({
        data: {
            carePlanId: carePlan.id,
            category: 'INJECTION',
            title: '항생제 반응 검사',
            description: '수술 전 항생제 알러지 반응을 확인합니다.',
            scheduledAt: injTime,
            priority: 'CRITICAL'
        }
    });

    // 8. Create some Slots and Appointments for TODAY to show stats
    console.log('📅 Creating today\'s appointments for stats...');
    const slotStart = new Date();
    slotStart.setHours(10, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(30);

    const slot = await prisma.slot.create({
        data: {
            departmentId: dept.id,
            doctorId: doctor.id,
            startDateTime: slotStart,
            endDateTime: slotEnd,
            capacity: 5,
            bookedCount: 1,
            status: 'OPEN'
        }
    });

    await prisma.appointment.create({
        data: {
            slotId: slot.id,
            patientId: patient.id,
            doctorsId: doctor.id,
            status: 'CHECKED_IN',
            type: 'OUTPATIENT_FIRST',
            hospitalId: hospital.id
        }
    });

    // 9. Add a SurgeryCase in 'ADMITTED' status for stats
    await prisma.surgeryCase.update({
        where: { id: surgeryCase.id },
        data: { status: 'ADMITTED' }
    });

    // 10. Add some Audit Logs
    await prisma.auditLog.create({
        data: {
            entityTable: 'Appointment',
            entityId: 'system-seed',
            action: 'CREATE',
            newValue: 'System initialized',
            hospitalId: hospital.id
        }
    });

    console.log('🎉 Data Reset Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
