import { useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

export const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const tempApiUrl = getApiUrl();
            const trimmedEmail = email.trim(); // Trim email
            const response = await axios.post(`${tempApiUrl}/auth/login`, {
                email: trimmedEmail,
                password
            });

            const { access_token, user } = response.data;

            // Store securely
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_info', JSON.stringify(user));

            // Setup default headers for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

            onLogin();
        } catch (err: any) {
            console.error('Login failed full error:', err);

            let msg = '';
            if (!err.response) {
                msg = `Network Error: ${err.message || '서버에 연결할 수 없습니다.'}`;
            } else {
                msg = `(${err.response.status}) ${err.response.data?.message || '로그인 실패'}`;
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="text-4xl mb-2">🏥</div>
                    <h1 className="text-2xl font-bold text-white">병원 통합 관리자 시스템</h1>
                    <p className="text-indigo-200 text-sm mt-1">secure access</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">이메일 (ID)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="system@hospital.com"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">비밀번호</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호 입력"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    로그인 중...
                                </>
                            ) : '로그인'}
                        </button>

                        <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Connected to API</span>
                            <code className="text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100 text-indigo-500 font-mono">
                                {getApiUrl()}
                            </code>
                        </div>

                        <div className="text-center text-xs text-slate-400 mt-4">
                            초기 비밀번호 분실 시 시스템 관리자에게 문의하세요.
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
