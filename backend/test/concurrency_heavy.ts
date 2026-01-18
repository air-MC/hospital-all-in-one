import { PrismaClient, SlotStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const SLOT_ID = 'slot_heavy_load_test';
const DEPT_ID = 'dept_test_01';
const CAPACITY = 3;
const REQUEST_COUNT = 100; // Even Higher load

async function seed() {
    console.log('🧹 [1/3] Preparing DB for Heavy Load...');
    try {
        await prisma.appointment.deleteMany({ where: { slotId: SLOT_ID } });
        await prisma.slot.deleteMany({ where: { id: SLOT_ID } });
    } catch (e) { }

    // Ensure Patients 1-50 exist
    console.log(`🌱 [1.5/3] Seeding ${REQUEST_COUNT} Patients...`);
    for (let i = 1; i <= REQUEST_COUNT; i++) {
        const pId = `patient_load_${i}`;
        await prisma.patient.upsert({
            where: { id: pId },
            update: {},
            create: {
                id: pId,
                name: `Load Test Patient ${i}`,
                phone: `010-9999-${i.toString().padStart(4, '0')}`,
                birthDate: new Date('1990-01-01'),
                gender: 'M'
            }
        });
    }

    console.log(`🌱 [2/3] Seeding Slot (Capacity: ${CAPACITY})...`);
    await prisma.slot.create({
        data: {
            id: SLOT_ID,
            departmentId: DEPT_ID,
            status: SlotStatus.OPEN,
            capacity: CAPACITY,
            bookedCount: 0,
            startDateTime: new Date(),
            endDateTime: new Date(new Date().getTime() + 10 * 60000),
        }
    });
}

async function runTest() {
    console.log(`🚀 [3/3] Launching ${REQUEST_COUNT} Concurrent Requests...`);

    const start = Date.now();
    const requests = Array.from({ length: REQUEST_COUNT }).map((_, i) => {
        const userIndex = i + 1;
        return axios.post(
            `${BASE_URL}/booking/appointments`,
            {
                slotId: SLOT_ID,
                patientId: `patient_load_${userIndex}`
            },
            {
                headers: {
                    'idempotency-key': `key_load_${userIndex}_${Date.now()}`
                },
                validateStatus: () => true
            }
        ).then(res => ({
            status: res.status,
            user: userIndex,
            data: res.data
        }));
    });

    const results = await Promise.all(requests);
    const duration = Date.now() - start;

    // Analyze
    const successes = results.filter(r => r.status === 201).length;
    const conflicts = results.filter(r => r.status === 409).length;
    const errors = results.filter(r => r.status >= 500).length;

    console.log('\n📊 === HEAVY LOAD CONCURRENCY REPORT ===');
    console.log(`Total Requests: ${results.length}`);
    console.log(`Duration: ${duration}ms (Avg: ${(duration / REQUEST_COUNT).toFixed(2)}ms per req)`);
    console.log(`✅ Success (201): ${successes} (Target: ${CAPACITY})`);
    console.log(`❌ Blocked (409): ${conflicts} (Target: ${REQUEST_COUNT - CAPACITY})`);
    console.log(`🔥 Server Errors (500+): ${errors}`);

    if (errors > 0) {
        console.log('⚠️ Some requests failed with server errors. Check backend logs.');
    }

    // DB Integrity Verification
    const slot = await prisma.slot.findUnique({ where: { id: SLOT_ID } });
    const actualBookings = await prisma.appointment.count({ where: { slotId: SLOT_ID } });

    console.log(`\n🔎 DB Integrity Verification:`);
    console.log(`Slot BookedCount: ${slot?.bookedCount}`);
    console.log(`Actual Appointment Count: ${actualBookings}`);
    console.log(`Slot Status: ${slot?.status}`);

    const isSuccess = successes === CAPACITY &&
        actualBookings === CAPACITY &&
        slot?.bookedCount === CAPACITY &&
        slot?.status === 'FULL';

    if (isSuccess) {
        console.log('\n🏆 CONCURRENCY INTEGRITY VERIFIED: No overbooking under high load.');
    } else {
        console.log('\n🔥 INTEGRITY FAILURE: Overbooking or Data Mismatch Detected!');
        process.exit(1);
    }
}

async function main() {
    try {
        await seed();
        await runTest();
    } catch (e) {
        console.error('Test Execution Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
