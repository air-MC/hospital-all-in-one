import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🏥 Creating 테스트병원 and Admin Account\n');

    // 1. Create 테스트병원
    const testHospital = await prisma.hospital.create({
        data: {
            name: '테스트병원'
        }
    });
    console.log(`✅ Created Hospital: ${testHospital.name} (ID: ${testHospital.id})`);

    // 2. Create default department
    const dept = await prisma.department.create({
        data: {
            name: '일반진료과',
            hospitalId: testHospital.id
        }
    });
    console.log(`✅ Created Department: ${dept.name}`);

    // 3. Create admin account
    const admin = await prisma.user.create({
        data: {
            email: 'admin@test-hospital.com',
            username: 'test_admin',
            password: '1234',
            name: '테스트병원 관리자',
            role: 'ADMIN',
            hospitalId: testHospital.id
        }
    });

    console.log(`\n✅ Admin Account Created:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: 1234`);
    console.log(`   Hospital: ${testHospital.name}`);
}

main()
    .catch(e => console.error('❌ Error:', e))
    .finally(async () => await prisma.$disconnect());
