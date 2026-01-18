
export const getApiUrl = () => {
    // 1. Check for explicit environment variable first (Vercel/Railway Env)
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl !== 'http://localhost:3000' && envUrl !== '') {
        let url = envUrl.replace(/\/$/, '');
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        return url;
    }

    // 2. Dynamic detection for local testing on same network
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // If we want to use the local IP logic
        if (hostname !== 'localhost' &&
            hostname !== '127.0.0.1' &&
            !hostname.includes('vercel.app') &&
            !hostname.includes('railway.app') &&
            !hostname.includes('github.io')) {
            return `${protocol}//${hostname}:3000`;
        }

        // 3. If accessing via Vercel, use the known Railway production backend
        if (hostname.includes('vercel.app')) {
            return 'https://hospital-all-in-one-production.up.railway.app';
        }
    }

    // 4. Fallback for Local PC development
    return 'http://localhost:3000';
};
