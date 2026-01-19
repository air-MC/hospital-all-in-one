import { useState } from 'react'
import axios from 'axios'
import clsx from 'clsx'

import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

export const LoginScreen = ({ onLogin }: { onLogin: (id: string) => void }) => {
    const [view, setView] = useState<'PHONE' | 'REGISTER'>('PHONE')
    const [phone, setPhone] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Registration states
    const [name, setName] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState<'M' | 'F'>('M')

    // Context: Hospital ID (from QR/URL)
    const [hospitalId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const idFromUrl = params.get('hospitalId');
        if (idFromUrl) {
            localStorage.setItem('context_hospital_id', idFromUrl);
            return idFromUrl;
        }
        return localStorage.getItem('context_hospital_id') || '';
    });

    const handleCheckPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 10) {
            setError('올바른 휴대전화 번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await axios.post(`${API_URL}/hospital/login`, { phone }, { timeout: 5000 });
            if (res.data) {
                // Determine if patient belongs to current hospital context?
                // For now, allow login if they exist in system.
                onLogin(res.data.id);
            } else {
                setView('REGISTER');
            }
        } catch (err: any) {
            console.error('[Login] Request failed:', err);
            const status = err.response?.status;
            const message = err.message || 'Network Error';
            setError(`로그인 오류 (${status || message}). API 주소가 올바른지 확인해주세요.`);
            console.log(`[Diagnostic] API_URL being used: ${API_URL}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !birthDate) {
            setError('모든 항목을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await axios.post(`${API_URL}/hospital/register`, {
                name,
                phone,
                birthDate,
                gender,
                hospitalId: hospitalId || undefined // Inject Hospital Context
            });
            onLogin(res.data.id);
        } catch (err) {
            console.error(err);
            setError('환자 등록 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 relative overflow-hidden font-sans">
            {/* Decorative Background */}
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

            <div className="bg-white/90 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-sm border border-white/50 relative z-10">

                {view === 'PHONE' ? (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 transform -rotate-3">
                            <span className="text-4xl text-white">🏥</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight italic">Hospital All-in-One</h1>
                        <p className="text-slate-500 mb-8 text-sm font-medium">내원부터 퇴원까지, 가장 스마트한 동행</p>

                        <form onSubmit={handleCheckPhone} className="space-y-4 text-left">
                            <div className="relative">
                                <label className="text-[11px] font-bold text-slate-400 mb-1.5 ml-1 block uppercase">Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="휴대전화 번호 (- 제외)"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-slate-800 font-bold placeholder:text-slate-300 placeholder:font-medium"
                                    disabled={isLoading}
                                />
                            </div>

                            {error && (
                                <div className="space-y-1">
                                    <p className="text-rose-500 text-xs font-bold text-center animate-shake">{error}</p>
                                    <p className="text-[10px] text-slate-400 text-center opacity-70">Target: {API_URL}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !phone}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-indigo-500/20 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>다음 단계로</span>
                                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <button onClick={() => setView('PHONE')} className="text-slate-400 text-sm font-bold mb-6 hover:text-slate-600 transition flex items-center gap-1">
                            <span>←</span> 다시 입력
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">환자 정보 확인</h2>
                        <p className="text-slate-500 mb-8 text-sm font-medium">서비스 이용을 위해 정보를 확인해주세요.</p>

                        <form onSubmit={handleRegister} className="space-y-5">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 mb-1.5 ml-1 block uppercase tracking-widest">Phone Number (Verified)</label>
                                <div className="w-full px-5 py-3 bg-slate-100 border-2 border-slate-100 rounded-2xl text-slate-400 font-bold">
                                    {phone}
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-400 mb-1.5 ml-1 block uppercase tracking-widest">Patient Name (실명)</label>
                                <input
                                    type="text"
                                    placeholder="성함을 입력하세요"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-slate-800 font-bold"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 mb-1.5 ml-1 block uppercase tracking-widest">Birth Date</label>
                                    <input
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-slate-800 font-bold text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 mb-1.5 ml-1 block uppercase tracking-widest">Gender</label>
                                    <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-1 flex h-[58px]">
                                        <button
                                            type="button"
                                            onClick={() => setGender('M')}
                                            className={clsx("flex-1 rounded-xl text-xs font-black transition-all",
                                                gender === 'M' ? "bg-white text-indigo-600 shadow-sm border border-indigo-100" : "text-slate-400")}
                                        >남성</button>
                                        <button
                                            type="button"
                                            onClick={() => setGender('F')}
                                            className={clsx("flex-1 rounded-xl text-xs font-black transition-all",
                                                gender === 'F' ? "bg-white text-indigo-600 shadow-sm border border-indigo-100" : "text-slate-400")}
                                        >여성</button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <p className="text-rose-500 text-xs font-bold text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    "등록 완료 및 시작하기"
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
