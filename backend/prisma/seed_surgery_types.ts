
import { PrismaClient, SurgeryCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('💉 Seeding Surgery Types...');

    const types = [
        // [안과] Ophthalmology
        {
            id: 'ophthal_cataract',
            name: '백내장 수술 (안과)',
            type: SurgeryCategory.SURGERY,
            isAdmissionRequired: true,
            defaultStayDays: 1, // 수술+1
            isPreOpExamRequired: true
        },
        {
            id: 'ophthal_glaucoma',
            name: '녹내장 수술 (안과)',
            type: SurgeryCategory.SURGERY,
            isAdmissionRequired: true,
            defaultStayDays: 2, // 수술+2
            isPreOpExamRequired: true
        },
        {
            id: 'ophthal_lasik',
            name: '라식/라섹 (안과)',
            type: SurgeryCategory.PROCEDURE,
            isAdmissionRequired: false,
            defaultStayDays: 0,
            isPreOpExamRequired: false // 선택 -> false (simplification for MVP)
        },
        {
            id: 'ophthal_injection',
            name: '유리체 주사 (안과)',
            type: SurgeryCategory.PROCEDURE,
            isAdmissionRequired: false,
            defaultStayDays: 0,
            isPreOpExamRequired: false
        },

        // [정형외과] Orthopedics
        {
            id: 'ortho_knee_replace',
            name: '무릎 인공관절 치환술 (정형외과)',
            type: SurgeryCategory.SURGERY,
            isAdmissionRequired: true,
            defaultStayDays: 5, // 수술+5
            isPreOpExamRequired: true
        },
        {
            id: 'ortho_shoulder',
            name: '어깨 관절경 (정형외과)',
            type: SurgeryCategory.SURGERY,
            isAdmissionRequired: true,
            defaultStayDays: 2, // 수술+2
            isPreOpExamRequired: true
        },
        {
            id: 'ortho_manual',
            name: '도수치료 (정형외과)',
            type: SurgeryCategory.PROCEDURE,
            isAdmissionRequired: false,
            defaultStayDays: 0,
            isPreOpExamRequired: false
        },
        {
            id: 'ortho_injection',
            name: '관절 주사 (정형외과)',
            type: SurgeryCategory.PROCEDURE,
            isAdmissionRequired: false,
            defaultStayDays: 0,
            isPreOpExamRequired: false
        },

        // [내과] Internal Medicine
        {
            id: 'internal_gastroscopy',
            name: '위내시경 (내과)',
            type: SurgeryCategory.PROCEDURE,
            isAdmissionRequired: false,
            defaultStayDays: 0,
            isPreOpExamRequired: false
        },
        {
            id: 'internal_colonoscopy',
            name: '대장내시경 (내과)',
            type: SurgeryCategory.PROCEDURE,
            isAdmissionRequired: false,
            defaultStayDays: 0,
            isPreOpExamRequired: true // 필수
        },
        {
            id: 'internal_polyp',
            name: '용종 절제술 (내과)',
            type: SurgeryCategory.PROCEDURE,
            isAdmissionRequired: true, // △ -> True for standard care plan gen
            defaultStayDays: 1, // 0~1日 -> 1 for safety
            isPreOpExamRequired: true
        }
    ];

    for (const t of types) {
        await prisma.surgeryType.upsert({
            where: { id: t.id },
            update: t,
            create: t
        });
    }

    console.log('✅ Surgery Types Seeded.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
