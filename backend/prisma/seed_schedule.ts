
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('📅 Seeding Schedule Rules...');

    const departments = await prisma.department.findMany();
    console.log(`Found ${departments.length} departments.`);

    for (const dept of departments) {
        console.log(`Processing Dept: ${dept.name} (${dept.id})`);

        // Create rules for Mon(1) to Sun(0)
        // 0=Sun, 1=Mon, ... 6=Sat
        const days = [0, 1, 2, 3, 4, 5, 6];

        for (const day of days) {
            const existing = await prisma.scheduleRule.findFirst({
                where: { departmentId: dept.id, dayOfWeek: day }
            });

            if (!existing) {
                await prisma.scheduleRule.create({
                    data: {
                        departmentId: dept.id,
                        dayOfWeek: day,
                        startTime: '09:00',
                        endTime: '18:00',
                        breakStart: '12:00',
                        breakEnd: '13:00',
                        slotDuration: 30,
                        capacityPerSlot: 3,
                        isHoliday: false // Open every day for demo
                    }
                });
                console.log(`  + Created Rule for Day ${day}`);
            } else {
                console.log(`  - Rule exists for Day ${day} (Skipping or Updating)`);
                // Optional: Force update to ensure Sunday is open
                if (existing.isHoliday) {
                    await prisma.scheduleRule.update({
                        where: { id: existing.id },
                        data: { isHoliday: false }
                    });
                    console.log(`    -> Updated Day ${day} to be OPEN`);
                }
            }
        }
    }

    console.log('✅ Schedule Rules Seeded!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
