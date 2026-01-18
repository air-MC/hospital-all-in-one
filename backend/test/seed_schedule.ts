
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEPT_ID = 'dept_test_01';

async function main() {
    console.log('🗓️ Seeding Schedule Rules for dept_test_01...');

    const hospital = await prisma.hospital.findFirst();
    if (!hospital) {
        console.error('No hospital found, run valid seeds first.');
        return;
    }

    // Ensure Dept exists
    let dept = await prisma.department.findUnique({ where: { id: DEPT_ID } });
    if (!dept) {
        dept = await prisma.department.create({
            data: { id: DEPT_ID, name: 'Test Dept', hospitalId: hospital.id }
        });
    }

    // Create Schedule for Mon(1) to Fri(5)
    for (let day = 1; day <= 5; day++) {
        // Clean up existing rule for this day/dept to avoid duplicates
        await prisma.scheduleRule.deleteMany({
            where: {
                departmentId: DEPT_ID,
                dayOfWeek: day
            }
        });

        await prisma.scheduleRule.create({
            data: {
                departmentId: DEPT_ID,
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '17:00',
                breakStart: '12:00',
                breakEnd: '13:00',
                slotDuration: 30,
                capacityPerSlot: 3,
                isHoliday: false
            }
        });
    }
    console.log('✅ Schedule Rules Created (Mon-Fri, 09:00-17:00)');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
