
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Inspecting Data...');

    const patient = await prisma.patient.findUnique({
        where: { id: 'patient_web_demo' }
    });
    console.log(`[Patient] ID: patient_web_demo | Name: ${patient?.name || 'NOT FOUND'} | Phone: ${patient?.phone || 'N/A'}`);

    const appts = await prisma.appointment.findMany({
        where: { patientId: 'patient_web_demo' },
        include: { slot: true }
    });
    console.log(`[Appointments] Count: ${appts.length}`);
    appts.forEach(a => console.log(` - Slot: ${a.slotId} | Time: ${a.slot.startDateTime} | Status: ${a.status}`));

    const steps = await prisma.visitStep.findMany({
        where: { patientId: 'patient_web_demo' }
    });
    console.log(`[VisitSteps] Count: ${steps.length}`);
    steps.forEach(s => console.log(` - ${s.name} (${s.createdAt})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
