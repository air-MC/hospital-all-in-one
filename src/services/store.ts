import type { Hospital, Department, Slot, Appointment, SurgeryCase } from '../types';
import { addDays, format, setHours, setMinutes } from 'date-fns';

// 1. Mock Data Setup
const hospital: Hospital = {
    id: 'h1',
    name: 'Seoul National University Hospital'
};

const department: Department = {
    id: 'd1',
    hospitalId: 'h1',
    name: 'Orthopedics',
    openTime: '09:00',
    closeTime: '17:00'
};

// Generate slots for the next 7 days
const generateSlots = (): Slot[] => {
    const slots: Slot[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        let currentTime = setMinutes(setHours(date, 9), 0); // 09:00
        const endTime = setMinutes(setHours(date, 17), 0); // 17:00

        while (currentTime < endTime) {
            // Lunch break 12-13
            const hour = currentTime.getHours();
            if (hour !== 12) {
                slots.push({
                    id: `slot_${format(currentTime, 'yyyyMMdd_HHmm')}`,
                    deptId: department.id,
                    startTime: currentTime.toISOString(),
                    capacity: 3,
                    bookedCount: Math.floor(Math.random() * 3), // Randomly fill some
                    status: 'OPEN'
                });
            }
            currentTime = new Date(currentTime.getTime() + 10 * 60000); // +10 mins
        }
    }
    return slots;
};

let slotsStore = generateSlots();
let appointmentsStore: Appointment[] = [];
const surgeryCasesStore: SurgeryCase[] = [
    {
        id: 'sc1',
        patientId: 'p1',
        patientName: 'Kanghyun Nam',
        deptId: 'd1',
        admissionDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        surgeryDate: format(addDays(new Date(), 3), 'yyyy-MM-dd HH:mm'),
        status: 'CONFIRMED'
    }
];

// 2. Service Methods

export const getHospital = () => hospital;
export const getDepartment = () => department;

export const getSlots = (dateString: string) => {
    // Filter by YYYY-MM-DD
    return slotsStore.filter(s => s.startTime.startsWith(dateString));
};

export const bookSlot = (slotId: string, patientName: string): boolean => {
    const slotIndex = slotsStore.findIndex(s => s.id === slotId);
    if (slotIndex === -1) return false;

    const slot = slotsStore[slotIndex];
    if (slot.bookedCount >= slot.capacity) return false;

    // Atomic-ish update
    slotsStore[slotIndex] = { ...slot, bookedCount: slot.bookedCount + 1 };
    if (slotsStore[slotIndex].bookedCount >= slot.capacity) {
        slotsStore[slotIndex].status = 'FULL';
    }

    appointmentsStore.push({
        id: `appt_${Date.now()}`,
        slotId,
        patientId: 'p_guest',
        patientName,
        status: 'BOOKED',
        createdAt: new Date().toISOString()
    });

    return true;
};

export const getSurgeryCase = (patientId: string) => {
    return surgeryCasesStore.find(sc => sc.patientId === patientId);
};
