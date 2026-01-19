// Force rebuild: 2026-01-19 14:49 - PatientNo deployment
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('💉 Safe Seeding Surgery Types & System Doctors (Production)...');
    console.log('🔄 Deploy Version: 2026-01-19 v5 (PatientNo + Cancel)');

    // 1. Ensure a Hospital exists
    let hospital = await prisma.hospital.findFirst();
    if (!hospital) {
        hospital = await prisma.hospital.create({
            data: {
                id: 'hosp_test_01',
                name: '테스트 병원'
            }
        });
    }

    // 2. Ensure General Department
    let dept = await prisma.department.findUnique({ where: { id: 'dept_test_01' } });
    if (!dept) {
        dept = await prisma.department.create({
            data: {
                id: 'dept_test_01',
                hospitalId: hospital.id,
                name: '일반행정/시스템'
            }
        });
    }

    // 3. Ensure Default Admin Doctor
    let doctor = await prisma.doctor.findUnique({ where: { id: 'doc_test_01' } });
    if (!doctor) {
        doctor = await prisma.doctor.create({
            data: {
                id: 'doc_test_01',
                departmentId: dept.id,
                hospitalId: hospital.id,
                name: '시스템관리자'
            }
        });
    }

    // 4. Ensure System User (Super Admin)
    // 4.1 Delete legacy default user if exists (Security Best Practice)
    try {
        const legacyUser = await prisma.user.findUnique({ where: { email: 'system@hospital.com' } });
        if (legacyUser) {
            await prisma.user.delete({ where: { email: 'system@hospital.com' } });
            console.log('🗑️ Legacy System User (system@hospital.com) removed for security.');
        }
    } catch (e) {
        console.log('No legacy user to delete or delete failed.');
    }

    // 4.2 Ensure Custom Super Admin (skarkd23)
    const superAdminUsername = 'skarkd23';
    let superAdmin = await prisma.user.findUnique({ where: { username: superAdminUsername } });

    if (!superAdmin) {
        await prisma.user.create({
            data: {
                id: 'SUPER_ADMIN_01',
                username: superAdminUsername,
                email: 'skarkd23@master.com', // Internal placeholder email
                password: 'namkh6733!',       // Secure password provided by user
                name: 'Network Owner',
                role: 'SUPER_ADMIN',
                hospitalId: hospital.id       // Linked to Main Hospital to allow full feature testing
            }
        });
        console.log(`👑 Super Admin (${superAdminUsername}) created.`);
    } else {
        // Force update password to ensure it matches user request
        await prisma.user.update({
            where: { username: superAdminUsername },
            data: { password: 'namkh6733!' }
        });
        console.log(`👑 Super Admin (${superAdminUsername}) password updated.`);
    }

    // 4.0 Ensure SYSTEM Patient (for admin notifications)
    const systemPatient = await prisma.patient.findUnique({ where: { id: 'SYSTEM' } });
    if (!systemPatient) {
        await prisma.patient.create({
            data: {
                id: 'SYSTEM',
                name: 'System Notifier',
                phone: '00000000000',
                birthDate: new Date('1900-01-01'),
                gender: 'O',
                hospitalId: hospital.id,
                patientNo: 'SYSTEM'
            }
        });
        console.log('🤖 System Patient ensured.');
    }

    // 4.1 Backup Admin
    const backupUser = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
    if (!backupUser) {
        await prisma.user.create({
            data: {
                id: 'BACKUP_ADMIN',
                email: 'admin@test.com',
                password: '1234',
                name: 'Backup Admin',
                role: 'ADMIN',
                hospitalId: hospital.id
            }
        });
        console.log('🔑 Backup Admin ensured.');
    }

    // 5. Seeding Surgery Types
    const types = [
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

    for (const t of types) {
        await (prisma as any).surgeryType.upsert({
            where: { id: t.id },
            update: t,
            create: t
        });
    }

    // 6. Seed Default Schedule Rules for ALL departments
    console.log('⏰ Seeding default schedule rules...');
    const allDepts = await prisma.department.findMany();
    for (const d of allDepts) {
        for (let day = 1; day <= 5; day++) { // Monday to Friday
            // Explicitly cast to any to avoid strict type checking for nullable composite keys logic during seeding
            await (prisma.scheduleRule as any).upsert({
                where: {
                    deptDoctorDayIndex: {
                        departmentId: d.id,
                        doctorId: null, // Explicit null
                        dayOfWeek: day
                    }
                },
                update: {},
                create: {
                    departmentId: d.id,
                    doctorId: null, // Explicit null for creation
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

    // 7. Ensure Demo Patient (For convenient testing)
    const demoPatient = await prisma.patient.upsert({
        where: { phone: '01012345678' },
        update: {},
        create: {
            id: 'patient_web_demo',
            name: 'Demo Patient',
            phone: '01012345678',
            birthDate: new Date('1980-01-01'),
            gender: 'M',
            hospitalId: hospital.id,
            patientNo: 'P-260119-DEMO'
        }
    });
    console.log('👤 Demo Patient ensured (010-1234-5678).');

    console.log('✅ Production Data Synchronized Successfully.');
}

main()
    .catch(e => {
        console.error("❌ Seeding Failed (Non-Fatal):", e);
        // Do NOT exit with 1, so the server can still start
        process.exit(0);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
