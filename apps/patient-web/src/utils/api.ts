
export const getApiUrl = () => {
    // 0. Manual Override from LocalStorage
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('custom_api_url');
        if (saved) return saved;
    }

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

        // If we are accessing via local IP (e.g. 192.168.x.x), 
        // assume backend is on the same machine port 3000
        if (hostname !== 'localhost' &&
            hostname !== '127.0.0.1' &&
            !hostname.includes('vercel.app') &&
            !hostname.includes('railway.app') &&
            !hostname.includes('github.io')) {
            return `${protocol}//${hostname}:3000`;
        }

        // 3. FORCE PRODUCTION URL for GitHub Pages / Vercel
        if (typeof window !== 'undefined' &&
            (window.location.hostname.includes('github.io') ||
                window.location.hostname.includes('vercel.app'))) {
            return 'https://hospital-all-in-one-production.up.railway.app';
        }

        // 4. Fallback for Local PC development
        return 'http://localhost:3000';
    }

    return 'http://localhost:3000';
};
