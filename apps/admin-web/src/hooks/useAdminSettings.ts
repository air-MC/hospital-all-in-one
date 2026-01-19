import axios from 'axios';
import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

export const getDepartments = async () => {
    return axios.get(`${API_URL}/hospital/departments`).then(res => res.data);
}

export const createDepartment = async (name: string) => {
    return axios.post(`${API_URL}/hospital/departments`, { name });
}

export const getDoctors = async (departmentId?: string) => {
    return axios.get(`${API_URL}/hospital/doctors?departmentId=${departmentId || ''}`).then(res => res.data);
}

export const createDoctor = async (name: string, departmentId: string) => {
    return axios.post(`${API_URL}/hospital/doctors`, { name, departmentId });
}

export const createSurgeryType = async (data: any) => {
    return axios.post(`${API_URL}/care/surgery-types`, data);
}

export const getHospital = async () => {
    return axios.get(`${API_URL}/hospital/info`).then(res => res.data);
}

export const updateHospital = async (id: string, name: string) => {
    return axios.post(`${API_URL}/hospital/info/update`, { id, name });
}

export const updateHospitalStatus = async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED') => {
    return axios.post(`${API_URL}/hospital/info/status`, { id, status });
}

export const getDepartmentSchedules = async (departmentId: string) => {
    return axios.get(`${API_URL}/hospital/departments/${departmentId}/schedules`).then(res => res.data);
}

export const updateDepartmentSchedule = async (departmentId: string, schedules: any[]) => {
    return axios.post(`${API_URL}/hospital/departments/${departmentId}/schedules`, schedules);
}

export const getDoctorSchedules = async (doctorId: string) => {
    return axios.get(`${API_URL}/hospital/doctors/${doctorId}/schedules`).then(res => res.data);
}

export const updateDoctorSchedule = async (doctorId: string, schedules: any[]) => {
    return axios.post(`${API_URL}/hospital/doctors/${doctorId}/schedules`, schedules);
}
