
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Inspecting Slots...');

    const slots = await prisma.slot.findMany({
        take: 5,
        orderBy: { startDateTime: 'asc' },
        include: { department: true }
    });

    console.log(`Found ${slots.length} recent slots:`);
    slots.forEach(s => {
        console.log(`[Slot] ID: ${s.id} | Dept: ${s.department.name} | Time: ${s.startDateTime} | Status: ${s.status} | Count: ${s.bookedCount}/${s.capacity}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
