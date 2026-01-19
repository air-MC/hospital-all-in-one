
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('👤 Seeding ONLY Users (No Operations)...');

    const hospital = await prisma.hospital.findFirst();
    const dept = await prisma.department.findFirst({ where: { id: 'dept_test_01' } });

    if (!hospital || !dept) {
        console.error('Hospital/Dept not found.');
        return;
    }

    // 1. Doctor
    const doctor = await prisma.doctor.upsert({
        where: { id: 'doc_test_01' },
        update: {},
        create: {
            id: 'doc_test_01',
            name: 'Dr. Kim (Orthopedics)',
            departmentId: dept.id,
            // [FIX] hospitalId not needed for Doctor as it is optional? 
            // Wait, schema says Doctor -> Department -> Hospital. Doctor does not have hospitalId directly?
            // Let me check schema. Doctor: id, departmentId, department. Department: hospitalId.
            // So Doctor is fine.
        }
    });

    // 2. Patient
    const patient = await prisma.patient.upsert({
        where: { phone: '01012345678' },
        update: {},
        create: {
            id: 'patient_web_demo',
            name: '홍길동',
            phone: '01012345678',
            birthDate: new Date('1980-01-01'),
            gender: 'M',
            hospitalId: hospital.id // [FIX] Added
        }
    });

    console.log(`✅ Users Ready: Doctor(${doctor.name}), Patient(${patient.name})`);
    console.log('ℹ️ No surgery cases created. Please create one via Admin Web.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
