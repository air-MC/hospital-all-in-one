
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const hospitals = await prisma.hospital.findMany({
        select: { id: true, name: true, isMain: true }
    });
    console.log(JSON.stringify(hospitals, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
