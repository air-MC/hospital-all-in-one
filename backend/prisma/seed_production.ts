import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('💉 Safe Seeding Surgery Types & System Doctors (Production)...');

    // 1. Ensure a Hospital exists (for foreign keys)
    let hospital = await prisma.hospital.findFirst();
    if (!hospital) {
        hospital = await prisma.hospital.create({
            data: {
                id: 'hosp_test_01',
                name: '테스트 병원'
            }
        });
    }

    // 2. Ensure General Department for Admin/System doctors
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

    // 3. Ensure Default Admin Doctor (doc_test_01) used by SurgeryManager
    let doctor = await prisma.doctor.findUnique({ where: { id: 'doc_test_01' } });
    if (!doctor) {
        doctor = await prisma.doctor.create({
            data: {
                id: 'doc_test_01',
                departmentId: dept.id,
                name: '시스템관리자'
            }
        });
        // 4. Ensure System User (REQUIRED FOR LOGIN)
        const systemUser = await prisma.user.findUnique({ where: { email: 'system@hospital.com' } });
        if (!systemUser) {
            await prisma.user.create({
                data: {
                    id: 'SYSTEM',
                    email: 'system@hospital.com',
                    password: 'admin1234', // Plain text master key
                    name: 'System Admin',
                    role: 'SUPER_ADMIN',
                    hospitalId: hospital.id
                }
            });
            console.log('🤖 System User ensured.');
        } else {
            // Force update password just in case
            await prisma.user.update({
                where: { email: 'system@hospital.com' },
                data: { password: 'admin1234' }
            });
            console.log('🤖 System User password reset.');
        }

        // Backup Admin
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
        }
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
        console.log('✅ Production Data Synchronized Successfully.');
    }
    main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
