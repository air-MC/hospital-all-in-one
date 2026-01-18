export class CreateAppointmentDto {
    slotId: string;
    patientId: string;
}

export class GenerateSlotsDto {
    departmentId: string;
    doctorId?: string; // Optional doctor specific generation
    date: string; // YYYY-MM-DD
}
