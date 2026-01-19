import axios from 'axios';

import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

export interface SurgeryType {
    id: string;
    name: string;
    type: 'SURGERY' | 'PROCEDURE';
    isAdmissionRequired: boolean;
    defaultStayDays: number;
    isPreOpExamRequired: boolean;
    medicationStopDays: number;
}

export interface CreateSurgeryDto {
    patientId: string;
    doctorId: string;
    surgeryTypeId: string;
    surgeryDate: string;
    admissionDate: string;
    dischargeDate: string;
    diagnosis: string;
    roomNumber?: string;
    medicationStopDays?: number;
}

export const getSurgeryTypes = async () => {
    return axios.get<SurgeryType[]>(`${API_URL}/care/surgery-types`).then(res => res.data);
};

export const registerSurgery = async (dto: CreateSurgeryDto) => {
    return axios.post(`${API_URL}/care/surgeries`, dto);
};

export const deleteSurgery = async (id: string) => {
    return axios.delete(`${API_URL}/care/surgeries/${id}`);
};

export const deleteSurgeryType = async (id: string) => {
    return axios.delete(`${API_URL}/care/surgery-types/${id}`);
};

export const getActiveSurgeries = async () => {
    return axios.get(`${API_URL}/care/surgeries`).then(res => res.data);
};

export const rescheduleSurgery = async (surgeryId: string, newDate: string) => {
    return axios.patch(`${API_URL}/care/surgeries/${surgeryId}/reschedule`, { newDate });
};

export const addCareItem = async (dto: any) => {
    return axios.post(`${API_URL}/care/items`, dto);
};

export const deleteCareItem = async (id: string) => {
    return axios.delete(`${API_URL}/care/items/${id}`);
};

export const updateCareItem = async (id: string, data: any) => {
    return axios.patch(`${API_URL}/care/items/${id}`, data);
};

export const updateSurgeryStatus = async (surgeryId: string, status: string) => {
    // Explicitly call the status update endpoint which handles side-effects (notifications)
    return axios.patch(`${API_URL}/care/surgeries/${surgeryId}/status`, { status });
};

export const assignWard = async (surgeryId: string, roomNumber: string) => {
    return axios.patch(`${API_URL}/care/surgeries/${surgeryId}`, { roomNumber });
};

export const searchPatients = async (query: string) => {
    return axios.get(`${API_URL}/hospital/search?query=${query}`).then(res => res.data);
};

export const registerPatient = async (data: { name: string, phone: string, birthDate: string, gender: string }) => {
    return axios.post(`${API_URL}/hospital/register`, data);
};
// --- Booking Management ---
export const getPatientAppointments = async (patientId: string) => {
    return axios.get(`${API_URL}/booking/appointments?patientId=${patientId}`).then(res => res.data);
};

export const cancelAppointment = async (appointmentId: string) => {
    return axios.patch(`${API_URL}/booking/appointments/${appointmentId}/status`, { status: 'CANCELLED' });
};

// --- Department Management ---
export const createDepartment = async (data: { name: string; hospitalId: string }) => {
    return axios.post(`${API_URL}/care/departments`, data);
};

export const deleteDepartment = async (id: string) => {
    return axios.delete(`${API_URL}/care/departments/${id}`);
};

export const updateDepartment = async (id: string, data: { name: string }) => {
    return axios.patch(`${API_URL}/care/departments/${id}`, data);
};

// --- Doctor Management ---
export const deleteDoctor = async (id: string) => {
    return axios.delete(`${API_URL}/care/doctors/${id}`);
};

export const updateDoctor = async (id: string, data: { name: string; departmentId?: string }) => {
    return axios.patch(`${API_URL}/care/doctors/${id}`, data);
};

// --- Walk-in Registration ---
export const walkInRegistration = async (patientId: string, departmentId: string, doctorId?: string) => {
    const idempotencyKey = `walkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return axios.post(`${API_URL}/booking/walk-in`,
        { patientId, departmentId, doctorId },
        { headers: { 'Idempotency-Key': idempotencyKey } }
    );
};
