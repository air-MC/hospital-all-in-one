import { PrismaClient, SlotStatus } from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Development Seed...');

    // 1. Hospital & Department
    console.log('🏥 Ensuring Hospital & Department...');
    let hospital = await prisma.hospital.findFirst();
    if (!hospital) {
        hospital = await prisma.hospital.create({ data: { name: 'Dev Hospital' } });
    }

    const deptId = 'dept_test_01';
    let dept = await prisma.department.findUnique({ where: { id: deptId } });
    if (!dept) {
        dept = await prisma.department.create({
            data: {
                id: deptId,
                name: 'General Medicine',
                hospitalId: hospital.id
            }
        });
    }

    // 0. Ensure System User (for Audit Logs)
    const systemId = 'SYSTEM';
    const systemUser = await prisma.user.findUnique({ where: { email: 'system@hospital.com' } });

    if (!systemUser) {
        await prisma.user.create({
            data: {
                id: systemId,
                email: 'system@hospital.com',
                password: 'admin1234',
                name: 'System Admin',
                role: 'SUPER_ADMIN',
                hospitalId: hospital.id
            }
        });
        console.log('🤖 System User ensured.');
    }

    // 0-1. Backup Admin (Emergency Access)
    const backupId = 'BACKUP_ADMIN';
    const backupUser = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
    if (!backupUser) {
        await prisma.user.create({
            data: {
                id: backupId,
                email: 'admin@test.com',
                password: '1234',
                name: 'Backup Admin',
                role: 'ADMIN',
                hospitalId: hospital.id
            }
        });
        console.log('🔑 Backup Admin ensured.');
    }

    // 3. Patients
    console.log('😷 Ensuring Patients...');
    const patients = [];
    // Concurrency Test Patients
    for (let i = 1; i <= 10; i++) {
        patients.push({
            id: `patient_${i}`,
            name: `Lucky Patient ${i}`,
            phone: `010-0000-00${i.toString().padStart(2, '0')}`,
            birthDate: new Date('1990-01-01'),
            gender: 'M'
        });
    }
    // Mobile Demo Patient
    patients.push({
        id: 'patient_mobile_demo',
        name: 'Mobile Demo User',
        phone: '010-1234-5678',
        birthDate: new Date('1985-05-05'),
        gender: 'F'
    });
    // Web Demo Patient
    patients.push({
        id: 'patient_web_demo',
        name: 'Web Demo User',
        phone: '010-9876-5432',
        birthDate: new Date('1988-08-08'),
        gender: 'M'
    });

    for (const p of patients) {
        const existing = await prisma.patient.findUnique({ where: { id: p.id } });
        if (!existing) {
            await prisma.patient.create({ data: p });
        }
    }

    // 4. Slots (Today & Tomorrow)
    console.log('📅 Ensuring Slots...');
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    // Create a specific slot for the "Lucky 3" test if not exists
    const luckySlotId = 'slot_test_lucky3';
    const luckySlot = await prisma.slot.findUnique({ where: { id: luckySlotId } });
    if (!luckySlot) {
        await prisma.slot.create({
            data: {
                id: luckySlotId,
                departmentId: dept.id,
                status: SlotStatus.OPEN,
                capacity: 3,
                bookedCount: 0,
                startDateTime: new Date(), // Now
                endDateTime: new Date(new Date().getTime() + 60 * 60000), // +1 hour
            }
        });
    }

    // Create some general slots for the mobile app to display
    const baseHour = 9;
    for (let i = 0; i < 5; i++) {
        const start = new Date(today);
        start.setHours(baseHour + i, 0, 0, 0);

        // Check if exists
        const count = await prisma.slot.count({
            where: {
                departmentId: dept.id,
                startDateTime: start
            }
        });

        if (count === 0) {
            await prisma.slot.create({
                data: {
                    departmentId: dept.id,
                    startDateTime: start,
                    endDateTime: new Date(start.getTime() + 30 * 60000), // 30 mins
                    capacity: 5,
                    bookedCount: 0,
                    status: SlotStatus.OPEN
                }
            });
        }
    }

    console.log('✅ Seed Complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
