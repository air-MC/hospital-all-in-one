
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Users...');

    // 1. List all users
    const users = await prisma.user.findMany();
    console.log('Current Users in DB:');
    users.forEach(u => console.log(` - [${u.role}] ${u.username || 'NoUsername'} (${u.email})`));

    // 2. Delete system@hospital.com
    try {
        const deleted = await prisma.user.deleteMany({
            where: {
                email: 'system@hospital.com'
            }
        });
        if (deleted.count > 0) {
            console.log(`✅ Deleted ${deleted.count} user(s) with email system@hospital.com`);
        } else {
            console.log('ℹ️ No user found with email system@hospital.com (Safe)');
        }
    } catch (e) {
        console.error('❌ Error deleting system user:', e);
    }

    // 3. Verify Super Admin 'skarkd23'
    const superAdmin = await prisma.user.findUnique({
        where: { username: 'skarkd23' }
    });

    if (superAdmin) {
        console.log(`✅ Super Admin 'skarkd23' exists. ID: ${superAdmin.id}`);
    } else {
        console.error("❌ Super Admin 'skarkd23' NOT found! Creating now...");
        // Create if missing
        await prisma.user.create({
            data: {
                username: 'skarkd23',
                email: 'skarkd23@master.com',
                password: 'namkh6733!',
                name: 'Network Owner',
                role: 'SUPER_ADMIN',
                hospitalId: null // Or fetch hospital
            }
        });
        console.log("✅ Super Admin 'skarkd23' created.");
    }

    console.log('🏁 User Cleanup Complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
