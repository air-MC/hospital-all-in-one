import { useState, useEffect } from 'react';
import { searchPatients, registerPatient, getPatientAppointments, cancelAppointment, updatePatient } from '../hooks/useCareManager';
import { DateTime } from 'luxon';
import clsx from 'clsx';

export const PatientManager = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [appointments, setAppointments] = useState<any[]>([]);

    // Registration Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        birthDate: '',
        gender: 'M'
    });

    // Handle Search
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                // If search term is short, we fetch "recent patients" by sending empty string
                const query = searchTerm.length >= 1 ? searchTerm : '';
                const results = await searchPatients(query);
                setSearchResults(results);
            } catch (e) {
                console.error("Search failed", e);
            }
        };

        const timer = setTimeout(fetchPatients, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch appointments when a patient is selected
    useEffect(() => {
        if (selectedPatient) {
            fetchAppointments(selectedPatient.id);
        }
    }, [selectedPatient]);

    const fetchAppointments = async (patientId: string) => {
        try {
            const data = await getPatientAppointments(patientId);
            setAppointments(data);
        } catch (e) {
            console.error("Failed to fetch appointments", e);
        }
    };

    const handleCancelAppointment = async (apptId: string) => {
        if (!confirm('정말 이 예약을 취소하시겠습니까?\n취소된 예약 슬롯은 다시 오픈됩니다.')) return;
        try {
            await cancelAppointment(apptId);
            alert('✅ 예약이 취소되었습니다.');
            if (selectedPatient) fetchAppointments(selectedPatient.id);
        } catch (e: any) {
            alert(`❌ 취소 실패: ${e.response?.data?.message || e.message}`);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await registerPatient(formData);
            alert('✅ 환자 등록이 완료되었습니다.');
            setSearchResults(await searchPatients('')); // Refresh list
            setIsRegistering(false);
            setFormData({ name: '', phone: '', birthDate: '', gender: 'M' });
        } catch (error: any) {
            alert(`❌ 등록 실패: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        phone: '',
        birthDate: '',
        gender: 'M',
        patientNo: ''
    });

    // ... (rest of previous code remains same, but let's insert the update functions)

    const handleUpdatePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        setIsLoading(true);
        try {
            const updated = await updatePatient(selectedPatient.id, editData);
            alert('✅ 환자 정보가 수정되었습니다.');
            setSelectedPatient(updated); // Update logic might return the updated entity
            setIsEditing(false);
            // Refresh results list too
            const results = await searchPatients(searchTerm);
            setSearchResults(results);
        } catch (error: any) {
            alert(`❌ 수정 실패: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const startEditing = () => {
        setEditData({
            name: selectedPatient.name,
            phone: selectedPatient.phone,
            birthDate: DateTime.fromISO(selectedPatient.birthDate).toFormat('yyyy-MM-dd'),
            gender: selectedPatient.gender,
            patientNo: selectedPatient.patientNo || ''
        });
        setIsEditing(true);
    };

    if (selectedPatient) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                    onClick={() => { setSelectedPatient(null); setIsEditing(false); }}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-4 transition-colors"
                >
                    <span>←</span> 환자 목록으로 돌아가기
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        {isEditing ? (
                            <form onSubmit={handleUpdatePatient} className="flex-1 flex flex-wrap gap-4 items-end">
                                <div className="flex-1 min-w-[150px]">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">환자 등록번호</label>
                                    <input
                                        type="text"
                                        value={editData.patientNo}
                                        onChange={e => setEditData({ ...editData, patientNo: e.target.value })}
                                        className="w-full border-2 border-indigo-100 p-2 rounded-lg outline-none focus:border-indigo-500 font-bold bg-white"
                                        placeholder="등록번호 직접 지정"
                                    />
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">이름</label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full border-2 border-indigo-100 p-2 rounded-lg outline-none focus:border-indigo-500 font-bold"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">연락처</label>
                                    <input
                                        type="tel"
                                        value={editData.phone}
                                        onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                        className="w-full border-2 border-indigo-100 p-2 rounded-lg outline-none focus:border-indigo-500 font-bold"
                                    />
                                </div>
                                <div className="w-40">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">생년월일</label>
                                    <input
                                        type="date"
                                        value={editData.birthDate}
                                        onChange={e => setEditData({ ...editData, birthDate: e.target.value })}
                                        className="w-full border-2 border-indigo-100 p-2 rounded-lg outline-none focus:border-indigo-500 font-bold"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">성별</label>
                                    <select
                                        value={editData.gender}
                                        onChange={e => setEditData({ ...editData, gender: e.target.value })}
                                        className="w-full border-2 border-indigo-100 p-2 rounded-lg outline-none focus:border-indigo-500 font-bold"
                                    >
                                        <option value="M">남성</option>
                                        <option value="F">여성</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md"
                                    >
                                        저장
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 transition"
                                    >
                                        취소
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-3xl shadow-inner">
                                        {selectedPatient.name[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h2>
                                            <span className="px-2 py-1 rounded bg-slate-200 text-slate-600 text-xs font-mono font-bold">
                                                {selectedPatient.patientNo}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
                                            <span>{selectedPatient.phone}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{DateTime.fromISO(selectedPatient.birthDate).toFormat('yyyy.MM.dd')}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{selectedPatient.gender === 'M' ? '남성' : '여성'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={startEditing}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition"
                                    >
                                        ✏️ 정보 수정
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="bg-teal-100 text-teal-700 p-1 rounded">📅</span> 예약 및 진료 내역
                        </h3>

                        {appointments.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-slate-400 mb-2">예약 내역이 없습니다.</p>
                                <button className="text-sm text-indigo-600 font-bold hover:underline">
                                    + 새 예약 잡기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {appointments.map((appt: any) => {
                                    const isUpcoming = appt.status === 'BOOKED' || appt.status === 'CHECKED_IN';
                                    const isCancelled = appt.status === 'CANCELLED';

                                    return (
                                        <div key={appt.id} className={clsx(
                                            "p-5 rounded-xl border flex justify-between items-center transition-all",
                                            isCancelled ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
                                        )}>
                                            <div className="flex gap-6 items-center">
                                                <div className={clsx(
                                                    "flex flex-col items-center justify-center w-16 h-16 rounded-xl border",
                                                    isCancelled ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-teal-50 border-teal-200 text-teal-700"
                                                )}>
                                                    <span className="text-xs font-bold uppercase">{DateTime.fromISO(appt.slot.startDateTime).toFormat('MMM')}</span>
                                                    <span className="text-xl font-bold">{DateTime.fromISO(appt.slot.startDateTime).toFormat('dd')}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-slate-700 text-lg">
                                                            {DateTime.fromISO(appt.slot.startDateTime).toFormat('HH:mm')}
                                                        </span>
                                                        <span className={clsx(
                                                            "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                                                            appt.status === 'BOOKED' ? "bg-blue-100 text-blue-600" :
                                                                appt.status === 'CANCELLED' ? "bg-slate-200 text-slate-500" :
                                                                    "bg-green-100 text-green-600"
                                                        )}>
                                                            {appt.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {appt.slot.department?.name} • {appt.slot.doctor?.name || '의료진 미지정'}
                                                    </div>
                                                </div>
                                            </div>

                                            {isUpcoming && (
                                                <button
                                                    onClick={() => handleCancelAppointment(appt.id)}
                                                    className="px-3 py-1.5 rounded border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition"
                                                >
                                                    예약 취소
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 mb-4 border border-blue-100">
                                💡 환자 등록번호(Patient No)는 등록 시 <strong>자동으로 부여</strong>됩니다.
                            </div>
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
                                    placeholder="이름, 연락처, 또는 등록번호(예: P-2401...)로 검색하세요"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg shadow-inner"
                                />
                            </div>

                            <div className="flex justify-between items-center text-sm font-bold text-slate-500 px-1">
                                <span>{searchTerm ? `검색 결과 (${searchResults.length})` : '최근 등록 환자'}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[400px]">
                                {searchResults.length === 0 ? (
                                    <div className="col-span-2 py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                        <p className="text-slate-400">검색 결과가 없습니다.</p>
                                        {searchTerm && (
                                            <button
                                                onClick={() => {
                                                    setIsRegistering(true);
                                                    setFormData({ ...formData, name: searchTerm });
                                                }}
                                                className="mt-4 text-indigo-600 font-bold hover:underline"
                                            >
                                                '{searchTerm}' 환자로 신규 등록하기 →
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    searchResults.map(p => (
                                        <div key={p.id} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative">
                                            {p.patientNo && (
                                                <div className="absolute top-4 right-4 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                                    {p.patientNo}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    {p.name[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-start items-center gap-2">
                                                        <h4 className="font-bold text-slate-800 text-lg">{p.name}</h4>
                                                        <span className={clsx(
                                                            "text-[10px] px-2 py-1 rounded font-bold uppercase",
                                                            p.gender === 'M' ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                                                        )}>
                                                            {p.gender === 'M' ? 'M' : 'F'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-500 font-medium">{p.phone}</div>
                                                    <div className="text-xs text-slate-400 mt-1">🎂 {DateTime.fromISO(p.birthDate).toFormat('yyyy-MM-dd')}</div>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                                <div className="flex gap-2 text-xs">
                                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">
                                                        예약 {p._count?.appointments || 0}
                                                    </span>
                                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">
                                                        수술 {p._count?.surgeryCases || 0}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedPatient(p)}
                                                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        상세보기
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
