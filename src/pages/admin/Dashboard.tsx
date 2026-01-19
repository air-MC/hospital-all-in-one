import { useEffect } from 'react';

export default function AdminDashboard() {
    useEffect(() => {
        // Auto-redirect to the secure app if possible, or just show link
        window.location.href = 'http://localhost:5173/hospital-all-in-one/';
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
            <h1 className="text-4xl font-bold mb-4">⚠️ Legacy Access Disabled</h1>
            <p className="mb-8 text-slate-300">You are accessing the deprecated insecure dashboard.</p>

            <a
                href="http://localhost:5173/hospital-all-in-one/"
                className="bg-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-indigo-500 transition"
            >
                Go to SECURE Admin System
            </a>
            <p className="mt-4 text-xs text-slate-500">Redirecting...</p>
        </div>
    );
}
