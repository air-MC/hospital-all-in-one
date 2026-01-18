export type Role = 'PATIENT' | 'ADMIN';

export type SlotStatus = 'OPEN' | 'FULL' | 'BLOCKED' | 'PAST';

export interface Hospital {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  hospitalId: string;
  name: string;
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
}

export interface Slot {
  id: string;
  deptId: string;
  startTime: string; // ISO String or "YYYY-MM-DD HH:mm"
  capacity: number; // default 3
  bookedCount: number;
  status: SlotStatus;
}

export interface Appointment {
  id: string;
  slotId: string;
  patientId: string;
  patientName: string;
  status: 'BOOKED' | 'CANCELLED' | 'NOSHOW';
  createdAt: string;
}

export interface SurgeryCase {
  id: string;
  patientId: string;
  patientName: string;
  deptId: string;
  admissionDate: string; // YYYY-MM-DD
  surgeryDate: string; // YYYY-MM-DD HH:mm
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}

export interface CarePlanItem {
  id: string;
  surgeryCaseId: string;
  type: 'CHECKLIST' | 'MEAL' | 'MEDICATION' | 'EXAM';
  title: string;
  description?: string;
  targetTime: string; // ISO datetime
  isCompleted: boolean;
}
