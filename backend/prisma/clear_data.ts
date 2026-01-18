import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Clearing test data (Correcting model names)...');

    try {
        // Order matters due to foreign key constraints (Child first, then Parent)

        const visitSteps = await prisma.visitStep.deleteMany({});
        console.log(`- Deleted ${visitSteps.count} VisitSteps`);

        const appointments = await prisma.appointment.deleteMany({});
        console.log(`- Deleted ${appointments.count} Appointments`);

        const careItems = await prisma.carePlanItem.deleteMany({});
        console.log(`- Deleted ${careItems.count} CarePlanItems`);

        const carePlans = await prisma.carePlan.deleteMany({});
        console.log(`- Deleted ${carePlans.count} CarePlans`);

        const surgeries = await prisma.surgeryCase.deleteMany({});
        console.log(`- Deleted ${surgeries.count} SurgeryCases`);

        const notifications = await prisma.notification.deleteMany({});
        console.log(`- Deleted ${notifications.count} Notifications`);

        const auditLogs = await prisma.auditLog.deleteMany({});
        console.log(`- Deleted ${auditLogs.count} AuditLogs`);

        const slots = await prisma.slot.deleteMany({});
        console.log(`- Deleted ${slots.count} Slots`);

        console.log('✅ All transactional data cleared successfully.');
    } catch (e) {
        console.error('❌ Error clearing data:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
