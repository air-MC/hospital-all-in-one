
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const types = await prisma.surgeryType.findMany();
    console.log('Surgery Types:', types);
    if (types.length === 0) {
        console.log('Seeding default types...');
        await prisma.surgeryType.createMany({
            data: [
                { name: '무릎 인공관절 수술', type: 'SURGERY', defaultStayDays: 14, isPreOpExamRequired: true },
                { name: '위 내시경', type: 'PROCEDURE', defaultStayDays: 0, isPreOpExamRequired: false },
                { name: '백내장 수술', type: 'SURGERY', defaultStayDays: 1, isPreOpExamRequired: false }
            ]
        });
        console.log('Seeded.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
