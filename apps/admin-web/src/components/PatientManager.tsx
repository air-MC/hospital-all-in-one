import { useState, useEffect } from 'react';
import { searchPatients, registerPatient } from '../hooks/useCareManager';
import { DateTime } from 'luxon';
import clsx from 'clsx';

export const PatientManager = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Registration Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        birthDate: '',
        gender: 'M'
    });

    // Handle Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                try {
                    const results = await searchPatients(searchTerm);
                    setSearchResults(results);
                } catch (e) {
                    console.error("Search failed", e);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await registerPatient(formData);
            alert('✅ 환자 등록이 완료되었습니다.');
            setSearchTerm(formData.name);
            setIsRegistering(false);
            setFormData({ name: '', phone: '', birthDate: '', gender: 'M' });
        } catch (error: any) {
            alert(`❌ 등록 실패: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">👥 환자 명부 관리</h3>
                        <p className="text-sm text-slate-500 mt-1">기존 환자 조회 및 신규 환자를 등록합니다.</p>
                    </div>
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                            isRegistering ? "bg-slate-200 text-slate-700" : "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                        )}
                    >
                        {isRegistering ? '취소' : '➕ 신규 환자 등록'}
                    </button>
                </div>

                <div className="p-8">
                    {isRegistering ? (
                        <form onSubmit={handleRegister} className="max-w-md mx-auto space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h4 className="font-bold text-indigo-600 mb-4 flex items-center gap-2">
                                <span className="bg-indigo-100 p-1.5 rounded-lg">📝</span> 신규 환자 정보 입력
                            </h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="환자 성함"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">연락처</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="010-0000-0000"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">생년월일</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.birthDate}
                                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                        className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">성별</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="M">남성 (Male)</option>
                                        <option value="F">여성 (Female)</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                {isLoading ? '등록 중...' : '환자 정보 저장하기'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                <input
                                    type="text"
                                    placeholder="환자 성함 또는 연락처로 검색하세요..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {searchResults.length === 0 && searchTerm.length >= 2 ? (
                                    <div className="col-span-2 py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                        <p className="text-slate-400">검색 결과가 없습니다.</p>
                                        <button
                                            onClick={() => {
                                                setIsRegistering(true);
                                                setFormData({ ...formData, name: searchTerm });
                                            }}
                                            className="mt-4 text-indigo-600 font-bold hover:underline"
                                        >
                                            '{searchTerm}' 환자로 신규 등록하기 →
                                        </button>
                                    </div>
                                ) : (
                                    searchResults.map(p => (
                                        <div key={p.id} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    {p.name[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-slate-800 text-lg">{p.name}</h4>
                                                        <span className={clsx(
                                                            "text-[10px] px-2 py-1 rounded font-bold uppercase",
                                                            p.gender === 'M' ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                                                        )}>
                                                            {p.gender === 'M' ? 'Male' : 'Female'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-500 font-medium">{p.phone}</div>
                                                    <div className="text-xs text-slate-400 mt-1">🎂 {DateTime.fromISO(p.birthDate).toFormat('yyyy-MM-dd')}</div>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end gap-2">
                                                <button className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">상세보기</button>
                                                <span className="text-slate-200">|</span>
                                                <button className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">진료 기록</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {searchTerm.length < 2 && (
                                <div className="py-20 text-center text-slate-300">
                                    <div className="text-4xl mb-4">👥</div>
                                    <p>검색어를 입력하여 환자 정보를 조회하세요.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
