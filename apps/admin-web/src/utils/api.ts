
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

        console.log(`[API_URL_DETECTION] hostname: ${hostname}, protocol: ${protocol}`);

        // If accessing via Vercel or similar, use the known Railway production backend
        if (hostname.includes('vercel.app') || hostname.includes('github.io')) {
            return 'https://hospital-all-in-one-production.up.railway.app';
        }

        // If we want to use the local IP logic (testing from tablet/mobile in same WIFI)
        if (hostname !== 'localhost' &&
            hostname !== '127.0.0.1' &&
            !hostname.includes('railway.app')) {
            return `${protocol}//${hostname}:3000`;
        }
    }

    // 4. Fallback for Local PC development
    return 'http://localhost:3000';
};
