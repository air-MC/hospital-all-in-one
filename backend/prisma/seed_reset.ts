
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
                    departmentId: dept.id
                }
            });
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
                phone: '010-1234-5678',
                birthDate: new Date('1980-01-01'),
                gender: 'M'
            }
        });
    }

    // 4. Ensure Surgery Type
    let surgeryType = await prisma.surgeryType.findFirst({ where: { name: '위암 수술' } });
    if (!surgeryType) {
        surgeryType = await prisma.surgeryType.create({
            data: {
                name: '위암 수술',
                type: 'SURGERY',
                defaultStayDays: 5
            }
        });
    }

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
            status: 'CONFIRMED'
        }
    });

    // 6. Create Care Plan
    const carePlan = await prisma.carePlan.create({
        data: {
            surgeryCaseId: surgeryCase.id,
            patientId: patient.id,
            startDate: admissionDate,
            endDate: dischargeDate
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
