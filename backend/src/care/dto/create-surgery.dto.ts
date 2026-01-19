export class CreateSurgeryDto {
    patientId: string;
    doctorId: string;
    surgeryTypeId: string; // NEW: Required
    surgeryDate: string;   // ISO Date
    admissionDate: string; // ISO Date
    dischargeDate: string; // ISO Date
    diagnosis: string;     // e.g., "Knee OA (Osteoarthritis)"
    medicationStopDays?: number; // Optional override
}
