import useSWR from 'swr';
import axios from 'axios';
import { DateTime } from 'luxon';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export const useSlots = (departmentId: string, date: Date, doctorId?: string) => {
    const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    const { data, error, mutate } = useSWR(
        `${API_URL}/booking/slots?departmentId=${departmentId}&date=${dateStr}${doctorId ? `&doctorId=${doctorId}` : ''}`,
        fetcher
    );

    return {
        slots: data || [],
        isLoading: !error && !data,
        isError: error,
        refresh: mutate
    };
};

export const generateSlots = async (departmentId: string, date: Date, doctorId?: string) => {
    const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    return axios.post(`${API_URL}/booking/slots/generate`, {
        departmentId,
        date: dateStr,
        doctorId // Optional
    });
};

export const getDepartments = async () => {
    return axios.get<{ id: string, name: string }[]>(`${API_URL}/hospital/departments`).then(res => res.data);
};

export const getDoctors = async (departmentId: string) => {
    if (!departmentId) return [];
    return axios.get<{ id: string, name: string }[]>(`${API_URL}/hospital/doctors?departmentId=${departmentId}`).then(res => res.data);
};

export const useAppointments = (departmentId?: string, date?: Date, doctorId?: string) => {
    const dateStr = date ? DateTime.fromJSDate(date).toFormat('yyyy-MM-dd') : '';
    const { data, error, mutate } = useSWR(
        `${API_URL}/booking/appointments?departmentId=${departmentId || ''}&date=${dateStr}${doctorId ? `&doctorId=${doctorId}` : ''}`,
        fetcher
    );

    return {
        appointments: data || [],
        isLoading: !error && !data,
        isError: error,
        refresh: mutate
    };
};

export const checkInAppointment = async (id: string) => {
    return axios.patch(`${API_URL}/booking/appointments/${id}/status`, { status: 'CHECKED_IN' });
};
