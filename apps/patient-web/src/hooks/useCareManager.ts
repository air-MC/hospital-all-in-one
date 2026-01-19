
import useSWR from 'swr';
import axios from 'axios';
import { DateTime } from 'luxon';

import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export const useDailyCare = (patientId: string, date: Date) => {
    const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    const { data, error, mutate } = useSWR(
        patientId ? `${API_URL}/care/items?patientId=${patientId}&date=${dateStr}` : null,
        fetcher
    );

    return {
        items: data || [],
        isLoading: !error && !data,
        isError: error,
        refresh: mutate
    };
};

export const useMySurgery = (patientId: string) => {
    const { data, error } = useSWR(
        patientId ? `${API_URL}/care/surgeries?patientId=${patientId}` : null,
        fetcher
    );
    // Return the most recent active surgery
    const activeSurgery = data && data.length > 0 ? data[0] : null;
    return {
        surgery: activeSurgery,
        isLoading: !error && !data,
        isError: error
    };
};

export const completeCareItem = async (itemId: string) => {
    return axios.patch(`${API_URL}/care/items/${itemId}/complete`);
};

export const useNotifications = (patientId: string) => {
    const { data, mutate } = useSWR(
        patientId ? `${API_URL}/care/notifications?patientId=${patientId}` : null,
        fetcher,
        { refreshInterval: 5000 } // Poll every 5s for new alerts
    );
    return {
        notifications: data || [],
        markRead: async (id: string) => {
            await axios.patch(`${API_URL}/care/notifications/${id}/read`);
            mutate();
        }
    };
};

export const addCareItem = async (dto: any) => {
    return axios.post(`${API_URL}/care/items`, dto);
};

export const deleteCareItem = async (id: string) => {
    return axios.delete(`${API_URL}/care/items/${id}`);
};

export const useMyAppointments = (patientId: string) => {
    const { data, error, mutate } = useSWR(
        patientId ? `${API_URL}/booking/appointments?patientId=${patientId}` : null,
        fetcher
    );
    return {
        appointments: data || [],
        isLoading: !error && !data,
        refresh: mutate
    };
};

export const cancelAppointment = async (apptId: string) => {
    return axios.patch(`${API_URL}/booking/appointments/${apptId}/status`, { status: 'CANCELLED' });
};
