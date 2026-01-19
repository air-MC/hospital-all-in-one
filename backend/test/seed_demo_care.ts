
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('👤 Creating/Updating Demo Patient (patient_web_demo)...');

    // Ensure hospital
    let hospital = await prisma.hospital.findFirst();
    if (!hospital) {
        hospital = await prisma.hospital.create({ data: { name: 'Demo Hospital' } });
    }

    await prisma.patient.upsert({
        where: { id: 'patient_web_demo' },
        update: {},
        create: {
            id: 'patient_web_demo',
            name: 'Demo Patient',
            phone: '010-1234-5678',
            birthDate: new Date('1980-01-01'),
            gender: 'M',
            hospitalId: hospital.id
        }
    });

    // Also ensure a test doctor exists
    const dept = await prisma.department.findFirst();
    if (dept) {
        await prisma.doctor.upsert({
            where: { id: 'doc_test_01' },
            update: {},
            create: {
                id: 'doc_test_01',
                name: 'Dr. Kim (Orthopedics)',
                departmentId: dept.id,
                hospitalId: hospital.id
            }
        });
    }

    console.log('✅ Demo Patient & Doctor Ready.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
