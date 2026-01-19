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
}

export const getSurgeryTypes = async () => {
    return axios.get<SurgeryType[]>(`${API_URL}/care/surgery-types`).then(res => res.data);
};

export const registerSurgery = async (dto: CreateSurgeryDto) => {
    return axios.post(`${API_URL}/care/surgeries`, dto);
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
