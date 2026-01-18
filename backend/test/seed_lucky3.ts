export { }; // Modules must have an export

// 1. Setup Data for Test
// We need a seeding script using Prisma to create the specific 'slot_test_lucky3'
// Usage: npx ts-node backend/test/seed_lucky3.ts

import { PrismaClient, SlotStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const SLOT_ID = 'slot_test_lucky3';
    const DEPT_ID = 'dept_test_01'; // Ensure this exists or create it

    console.log('🧹 Cleaning previous test data...');
    await prisma.appointment.deleteMany({ where: { slotId: SLOT_ID } });
    await prisma.slot.deleteMany({ where: { id: SLOT_ID } });

    // Ensure Dept Exists
    let dept = await prisma.department.findUnique({ where: { id: DEPT_ID } });
    if (!dept) {
        const hospital = await prisma.hospital.create({ data: { name: 'Test Hospital' } });
        dept = await prisma.department.create({
            data: {
                id: DEPT_ID,
                name: 'Test Dept',
                hospitalId: hospital.id
            }
        });
    }

    console.log('🌱 Seeding Lucky 3 Slot...');
    await prisma.slot.create({
        data: {
            id: SLOT_ID,
            departmentId: DEPT_ID,
            status: SlotStatus.OPEN,
            capacity: 3,
            bookedCount: 0,
            startDateTime: new Date(),
            endDateTime: new Date(new Date().getTime() + 10 * 60000), // +10m
        }
    });

    console.log(`✅ Ready! Slot ID: ${SLOT_ID} (Capacity: 3)`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
