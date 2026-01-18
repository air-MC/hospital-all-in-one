import useSWR from 'swr';
import axios from 'axios';


import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export const useVisitGuide = (patientId: string) => {
    const { data, error, mutate } = useSWR(
        patientId ? `${API_URL}/visit-guide?patientId=${patientId}` : null,
        fetcher,
        { refreshInterval: 5000 } // Live update from admin every 5s
    );

    return {
        steps: data || [],
        isLoading: !error && !data,
        isError: error,
        refresh: mutate
    };
};

export const completeStep = async (stepId: string) => {
    return axios.patch(`${API_URL}/visit-guide/${stepId}`, { status: 'COMPLETED' });
};
