import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Departments ---');
    const depts = await prisma.department.findMany();
    console.log(JSON.stringify(depts, null, 2));

    console.log('--- Schedule Rules ---');
    const rules = await prisma.scheduleRule.findMany();
    console.log(JSON.stringify(rules, null, 2));
}

main().finally(() => prisma.$disconnect());
