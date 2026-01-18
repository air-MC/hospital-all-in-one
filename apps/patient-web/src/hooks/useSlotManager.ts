import useSWR from 'swr';
import axios from 'axios';
import { DateTime } from 'luxon';

import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export const useSlots = (departmentId: string, date: Date, doctorId?: string) => {
    const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    const { data, error, mutate } = useSWR(
        departmentId ? `${API_URL}/booking/slots?departmentId=${departmentId}&date=${dateStr}${doctorId ? `&doctorId=${doctorId}` : ''}` : null,
        fetcher
    );

    return {
        slots: data || [],
        isLoading: !error && !data,
        isError: error,
        refresh: mutate
    };
};

export const generateSlots = async (departmentId: string, date: Date) => {
    const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    return axios.post(`${API_URL}/booking/slots/generate`, {
        departmentId,
        date: dateStr
    });
};

export const useDepartments = () => {
    const { data, error } = useSWR(`${API_URL}/hospital/departments`, fetcher);
    return {
        departments: data || [],
        isLoading: !error && !data,
        isError: error
    };
};

export const useDoctors = (departmentId: string | null) => {
    const { data, error } = useSWR(departmentId ? `${API_URL}/hospital/doctors?departmentId=${departmentId}` : null, fetcher);
    return {
        doctors: data || [],
        isLoading: !error && !data,
        isError: error
    };
};
