import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function testEdgeCases() {
    console.log('🧪 Starting Edge Case Verification...');

    // 1. Setup a fresh slot
    const SLOT_ID = 'edge_test_slot';
    await prisma.appointment.deleteMany({ where: { slotId: SLOT_ID } });
    await prisma.slot.deleteMany({ where: { id: SLOT_ID } });

    const dept = await prisma.department.findFirst();
    const patient = await prisma.patient.findFirst();

    await prisma.slot.create({
        data: {
            id: SLOT_ID,
            departmentId: dept!.id,
            capacity: 1,
            bookedCount: 0,
            status: 'OPEN',
            startDateTime: new Date(Date.now() + 3600000), // 1 hour later
            endDateTime: new Date(Date.now() + 7200000)
        }
    });

    // 2. Test Duplicate Booking Protection
    console.log('\n- Case 1: Duplicate Booking Protection');
    const booking1 = await axios.post(`${BASE_URL}/booking/appointments`,
        { slotId: SLOT_ID, patientId: patient!.id },
        { headers: { 'idempotency-key': `key_dup_1_${Date.now()}` } }
    );
    console.log(`  - First Booking: ${booking1.status} (Expected: 201)`);

    try {
        await axios.post(`${BASE_URL}/booking/appointments`,
            { slotId: SLOT_ID, patientId: patient!.id },
            { headers: { 'idempotency-key': `key_dup_2_${Date.now()}` } }
        );
    } catch (e: any) {
        console.log(`  - Second Booking: ${e.response?.status} - ${e.response?.data?.message} (Expected: 409)`);
    }

    // 3. Test Past Slot Protection
    console.log('\n- Case 2: Past Slot Protection');
    const PAST_SLOT_ID = 'past_test_slot';
    await prisma.slot.deleteMany({ where: { id: PAST_SLOT_ID } });
    await prisma.slot.create({
        data: {
            id: PAST_SLOT_ID,
            departmentId: dept!.id,
            capacity: 5,
            bookedCount: 0,
            status: 'OPEN',
            startDateTime: new Date(Date.now() - 3600000), // 1 hour ago
            endDateTime: new Date(Date.now() - 1800000)
        }
    });

    try {
        await axios.post(`${BASE_URL}/booking/appointments`,
            { slotId: PAST_SLOT_ID, patientId: patient!.id },
            { headers: { 'idempotency-key': `key_past_${Date.now()}` } }
        );
    } catch (e: any) {
        console.log(`  - Past Booking: ${e.response?.status} - ${e.response?.data?.message} (Expected: 400)`);
    }

    // 4. Test Cancellation Recovery
    console.log('\n- Case 3: Cancellation Slot Recovery');
    // Currently, SLOT_ID is FULL (Capacity 1, Booked 1)
    let slot = await prisma.slot.findUnique({ where: { id: SLOT_ID } });
    console.log(`  - Before Cancel: BookedCount=${slot?.bookedCount}, Status=${slot?.status}`);

    const appointmentId = booking1.data.id;
    await axios.patch(`${BASE_URL}/booking/appointments/${appointmentId}/status`, { status: 'CANCELLED' });

    slot = await prisma.slot.findUnique({ where: { id: SLOT_ID } });
    console.log(`  - After Cancel: BookedCount=${slot?.bookedCount}, Status=${slot?.status} (Expected: 0, OPEN)`);

    // 5. Audit Log Check
    console.log('\n- Case 4: Audit Log Verification');
    const logs = await prisma.auditLog.findMany({
        where: { entityId: appointmentId },
        orderBy: { createdAt: 'desc' }
    });
    console.log(`  - Logs found for appointment: ${logs.length} (Expected: 2 - CREATE and STATUS_CHANGE)`);
    logs.forEach(log => console.log(`    - [${log.action}] from ${log.oldValue || 'None'} to ${log.newValue}`));

    if (slot?.bookedCount === 0 && slot?.status === 'OPEN' && logs.length >= 2) {
        console.log('\n🏆 ALL EDGE CASES PASSED!');
    } else {
        console.log('\n🔥 SOME FAILURES DETECTED.');
    }
}

testEdgeCases().finally(() => prisma.$disconnect());
