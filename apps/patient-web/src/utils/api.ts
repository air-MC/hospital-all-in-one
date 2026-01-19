
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

    // 2. Dynamic detection
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // A. If accessing via localhost, use local backend
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }

        // B. If accessing via local network IP (e.g. 192.168.x.x), 
        // assume backend is on the same machine port 3000
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            return `${protocol}//${hostname}:3000`;
        }

        // C. Default: Use production URL for any other hostname (Vercel, GitHub Pages, Custom Domains)
        return 'https://hospital-all-in-one-production.up.railway.app';
    }

    return 'http://localhost:3000';
};
