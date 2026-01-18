
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning Transactional Data...');

    // Order matters for Foreign Key constraints
    try {
        // 1. CarePlanItem (Child of CarePlan)
        const deletedItems = await prisma.carePlanItem.deleteMany({});
        console.log(`- Deleted ${deletedItems.count} CarePlanItems`);

        // 2. CarePlan (Child of SurgeryCase)
        const deletedPlans = await prisma.carePlan.deleteMany({});
        console.log(`- Deleted ${deletedPlans.count} CarePlans`);

        // 3. Notifications (Child of Patient, sometimes linked logic)
        const deletedNotis = await prisma.notification.deleteMany({});
        console.log(`- Deleted ${deletedNotis.count} Notifications`);

        // 4. SurgeryCase (Child of Patient, Doctor, SurgeryType)
        const deletedCases = await prisma.surgeryCase.deleteMany({});
        console.log(`- Deleted ${deletedCases.count} SurgeryCases`);

        // 5. Appointments (Child of Patient, Slot)
        const deletedAppts = await prisma.appointment.deleteMany({});
        console.log(`- Deleted ${deletedAppts.count} Appointments`);

        // 6. Slots (Optional: If we want to reset booking status too)
        // Actually, let's RESET slots to OPEN instead of deleting them, 
        // because deleting them might break the Admin Web's daily view if it expects generated slots.
        // If we delete slots, the Admin has to click "Generate" again. That's safer.
        const deletedSlots = await prisma.slot.deleteMany({});
        console.log(`- Deleted ${deletedSlots.count} Slots`);

        // 7. AuditLog (System logs)
        const deletedLogs = await prisma.auditLog.deleteMany({});
        console.log(`- Deleted ${deletedLogs.count} AuditLogs`);

        console.log('✅ Data Cleaned Successfully.');
    } catch (e) {
        console.error('❌ Error cleaning data:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
