import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('💉 Safe Seeding Surgery Types (Production)...');
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
    console.log('✅ Production Surgery Types Seeded Successfully.');
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
