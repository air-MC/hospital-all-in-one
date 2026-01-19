import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🏥 Hospital Management Script');
    console.log('================================\n');

    // 1. List all hospitals
    console.log('📋 Current Hospitals:');
    const hospitals = await prisma.hospital.findMany({
        include: {
            _count: {
                select: {
                    departments: true,
                    doctors: true,
                    users: true
                }
            }
        }
    });

    hospitals.forEach(h => {
        console.log(`  - ${h.name} (ID: ${h.id})`);
        console.log(`    Departments: ${h._count.departments}, Doctors: ${h._count.doctors}, Users: ${h._count.users}`);
    });

    // 2. Delete 부산지점 if exists
    console.log('\n🗑️ Deleting 부산지점...');
    const busanHospital = hospitals.find(h => h.name.includes('부산'));

    if (busanHospital) {
        // Delete related data first
        await prisma.user.deleteMany({ where: { hospitalId: busanHospital.id } });
        await prisma.doctor.deleteMany({ where: { hospitalId: busanHospital.id } });
        await prisma.department.deleteMany({ where: { hospitalId: busanHospital.id } });
        await prisma.hospital.delete({ where: { id: busanHospital.id } });
        console.log(`✅ Deleted: ${busanHospital.name}`);
    } else {
        console.log('ℹ️ 부산지점 not found (already deleted or never existed)');
    }

    // 3. Find 테스트병원
    console.log('\n🏥 Finding 테스트병원...');
    const testHospital = hospitals.find(h => h.name.includes('테스트'));

    if (!testHospital) {
        console.log('❌ 테스트병원 not found. Please create it first via UI.');
        return;
    }

    console.log(`✅ Found: ${testHospital.name} (ID: ${testHospital.id})`);

    // 4. Create admin account for 테스트병원
    console.log('\n👤 Creating admin account for 테스트병원...');

    const existingAdmin = await prisma.user.findFirst({
        where: {
            hospitalId: testHospital.id,
            role: 'ADMIN'
        }
    });

    if (existingAdmin) {
        console.log(`ℹ️ Admin already exists: ${existingAdmin.email}`);
        console.log(`   Username: ${existingAdmin.username || 'N/A'}`);
    } else {
        const newAdmin = await prisma.user.create({
            data: {
                email: `admin@${testHospital.id}.com`,
                username: `test_admin`,
                password: '1234', // Simple password for testing
                name: `${testHospital.name} 관리자`,
                role: 'ADMIN',
                hospitalId: testHospital.id
            }
        });

        console.log(`✅ Created admin account:`);
        console.log(`   Email: ${newAdmin.email}`);
        console.log(`   Username: ${newAdmin.username}`);
        console.log(`   Password: 1234`);
        console.log(`   Role: ${newAdmin.role}`);
    }

    console.log('\n✅ Hospital Management Complete!');
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
