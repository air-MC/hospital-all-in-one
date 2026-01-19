import { PrismaClient, SlotStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const SLOT_ID = 'slot_test_lucky3';
const DEPT_ID = 'dept_test_01';

async function seed() {
    console.log('🧹 [1/3] Cleaning DB...');
    try {
        await prisma.appointment.deleteMany({ where: { slotId: SLOT_ID } });
        await prisma.slot.deleteMany({ where: { id: SLOT_ID } });
        // Clean up test patients if needed, or leave them (upsert is safer)
    } catch (e) { }

    // Ensure Dept
    let dept = await prisma.department.findUnique({ where: { id: DEPT_ID } });
    if (!dept) {
        const hospital = await prisma.hospital.create({ data: { name: 'Test Hospital' } });
        dept = await prisma.department.create({
            data: { id: DEPT_ID, name: 'Test Dept', hospitalId: hospital.id }
        });
    }

    // 0. Ensure System User
    let systemUser = await prisma.user.findFirst({ where: { email: 'system@hospital.com' } });
    if (!systemUser) {
        // Need a valid hospitalId for user
        const hospital = await prisma.hospital.findFirst();
        if (!hospital) {
            throw new Error("No hospital found to associate system user with.");
        }
        systemUser = await prisma.user.create({
            data: {
                id: 'SYSTEM',
                email: 'system@hospital.com',
                password: 'hash',
                name: 'System',
                role: 'SUPER_ADMIN',
                hospitalId: hospital.id
            }
        });
    }

    // Ensure Patients 1-10 exist
    console.log('🌱 [1.5/3] Seeding Patients...');
    for (let i = 1; i <= 10; i++) {
        const pId = `patient_${i}`;
        const patient = await prisma.patient.findUnique({ where: { id: pId } });
        if (!patient) {
            await prisma.patient.create({
                data: {
                    id: pId,
                    name: `Test Patient ${i}`,
                    phone: `010-0000-00${i.toString().padStart(2, '0')}`,
                    birthDate: new Date('1990-01-01'),
                    gender: 'M'
                }
            });
        }
    }

    console.log('🌱 [2/3] Seeding Slot...');
    await prisma.slot.create({
        data: {
            id: SLOT_ID,
            departmentId: DEPT_ID,
            status: SlotStatus.OPEN,
            capacity: 3,
            bookedCount: 0,
            startDateTime: new Date(),
            endDateTime: new Date(new Date().getTime() + 10 * 60000),
        }
    });
}

async function runTest() {
    console.log('🚀 [3/3] Launching 10 Concurrent Requests...');

    const requests = Array.from({ length: 10 }).map((_, i) => {
        const userIndex = i + 1;
        return axios.post(
            `${BASE_URL}/booking/appointments`,
            {
                slotId: SLOT_ID,
                patientId: `patient_${userIndex}`
            },
            {
                headers: {
                    'idempotency-key': `key_${userIndex}_${Date.now()}`
                },
                validateStatus: () => true // Allow all status codes
            }
        ).then(res => ({
            status: res.status,
            user: userIndex,
            data: res.data
        }));
    });

    const results = await Promise.all(requests);

    // Analyze
    const successes = results.filter(r => r.status === 201).length;
    const fails = results.filter(r => r.status === 409).length; // Conflict
    const others = results.filter(r => r.status !== 201 && r.status !== 409);

    console.log('\n📊 === THE LUCKY 3 TEST REPORT ===');
    console.log(`Total Requests: ${results.length}`);
    console.log(`✅ Success (201): ${successes} (Expected: 3)`);
    console.log(`❌ Blocked (409): ${fails} (Expected: 7)`);

    if (others.length > 0) {
        console.log(`⚠️ Checks:`, others.map(r => `${r.user}:${r.status}`));
    }

    // Verification
    const slot = await prisma.slot.findUnique({ where: { id: SLOT_ID } });
    console.log(`\n🔎 DB Verification:`);
    console.log(`Slot Status: ${slot?.status} (Expected: FULL)`);
    console.log(`Booked Count: ${slot?.bookedCount} (Expected: 3)`);

    if (successes === 3 && fails === 7 && slot?.bookedCount === 3 && slot?.status === 'FULL') {
        console.log('\n🏆 TEST PASSED: Perfect Concurrency Control!');
    } else {
        console.log('\n🔥 TEST FAILED: Overbooking or Logic Error Detected.');
        process.exit(1);
    }
}

async function main() {
    try {
        await seed();
        // Needs a small delay or check if server is up? 
        // Assuming server is running on localhost:3000 as per user context
        await runTest();
    } catch (e) {
        console.error('Test Execution Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
