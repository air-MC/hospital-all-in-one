import { useState } from 'react';

export const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // MVP Level: Simple hardcoded password for demonstration
        // In a real app, this would verify against the backend Auth API
        if (password === 'admin1234' || password === '1234') {
            onLogin();
        } else {
            setError('비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="text-4xl mb-2">🏥</div>
                    <h1 className="text-2xl font-bold text-white">병원 통합 관리자 시스템</h1>
                    <p className="text-indigo-200 text-sm mt-1">Hospital All-in-One Admin</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">관리자 비밀번호</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호를 입력하세요 (1234)"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg"
                        >
                            로그인
                        </button>

                        <div className="text-center text-xs text-slate-400 mt-4">
                            보안을 위해 사용 후 반드시 로그아웃 해주세요.
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
