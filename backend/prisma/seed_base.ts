
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🏥 Seeding Base Hospital Data...');

    // 1. Hospital
    const hospital = await prisma.hospital.create({
        data: {
            name: 'Smart Hospital',
            // Default ID or let it auto-gen
        }
    });

    // 2. Department
    const dept = await prisma.department.create({
        data: {
            id: 'dept_test_01', // Keep consistent for tests
            name: 'Orthopedics (OS)',
            hospitalId: hospital.id
        }
    });

    console.log(`✅ Base Data Created: Hospital(${hospital.id}), Dept(${dept.id})`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
