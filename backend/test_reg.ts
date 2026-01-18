import { PrismaClient } from '@prisma/client';
import { CareService } from './src/care/care.service';
import { CreateSurgeryDto } from './src/care/dto/create-surgery.dto';

const prisma = new PrismaClient();
const careService = new CareService(prisma as any);

async function test() {
    const patient = await prisma.patient.findFirst();
    const doctor = await prisma.doctor.findFirst();
    const type = await (prisma as any).surgeryType.findFirst();

    if (!patient || !doctor || !type) {
        console.error("Missing data for test");
        return;
    }

    const dto: CreateSurgeryDto = {
        patientId: patient.id,
        doctorId: doctor.id,
        surgeryTypeId: type.id,
        surgeryDate: new Date().toISOString(),
        admissionDate: new Date().toISOString(),
        dischargeDate: new Date().toISOString(),
        diagnosis: "Test Diagnosis"
    };

    try {
        const result = await careService.registerSurgery(dto);
        if (result) console.log("Success:", result.id);
        else console.log("Success but result is null");
    } catch (e) {
        console.error("Failed:", e);
    }
}

test().finally(() => prisma.$disconnect());
