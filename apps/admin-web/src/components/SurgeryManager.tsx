import { useState, useEffect } from 'react';
import { registerSurgery, getSurgeryTypes, getActiveSurgeries, searchPatients, deleteSurgery } from '../hooks/useCareManager';
import { getDepartments, getDoctors } from '../hooks/useAdminSettings';
import type { CreateSurgeryDto } from '../hooks/useCareManager';
import { DateTime } from 'luxon';
import useSWR, { useSWRConfig } from 'swr';
import clsx from 'clsx';
// Removed CarePlanEditor import as it's not used here anymore

export const SurgeryManager = ({ onSelectSurgery }: { onSelectSurgery?: (s: any) => void }) => {
    // Fetch Data
    const { data: surgeryTypes, error: typesError } = useSWR('surgery-types', getSurgeryTypes);
    const { data: activeSurgeries, mutate } = useSWR('active-surgeries', getActiveSurgeries, { refreshInterval: 5000 });
    const { data: departments } = useSWR('departments', getDepartments);
    const { data: doctors } = useSWR('doctors', () => getDoctors());

    // Form State
    const [selectedDeptId, setSelectedDeptId] = useState<string>('');
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [surgeryDateTime, setSurgeryDateTime] = useState(DateTime.now().plus({ days: 7 }).set({ hour: 9, minute: 0 }).toFormat("yyyy-MM-dd'T'HH:mm"));

    // Patient Search State
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);

    const [formData, setFormData] = useState<CreateSurgeryDto>({
        patientId: '',
        doctorId: '',
        surgeryTypeId: '',
        surgeryDate: '',
        admissionDate: '',
        dischargeDate: '',
        diagnosis: '',
        medicationStopDays: 7
    });

    // Handle Patient Search
    useEffect(() => {
        if (patientSearch.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const results = await searchPatients(patientSearch);
                setSearchResults(results);
            } catch (e) {
                console.error("Patient search failed", e);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    // Handle Patient Selection
    const handleSelectPatient = (p: any) => {
        setSelectedPatient(p);
        setFormData(prev => ({ ...prev, patientId: p.id }));
        setPatientSearch(p.name);
        setSearchResults([]);
    };

    // Effect: Auto-calculate dates when Type or Date changes
    useEffect(() => {
        if (!surgeryTypes || !selectedTypeId || !surgeryDateTime) return;

        const type = surgeryTypes.find((t: any) => t.id === selectedTypeId);
        if (!type) return;

        const sDate = DateTime.fromISO(surgeryDateTime);
        const admission = type.isAdmissionRequired ? sDate.minus({ days: 1 }) : sDate;
        const discharge = sDate.plus({ days: type.defaultStayDays });

        setFormData(prev => ({
            ...prev,
            surgeryTypeId: selectedTypeId,
            surgeryDate: surgeryDateTime,
            admissionDate: admission.toISODate() || '',
            dischargeDate: discharge.toISODate() || '',
            diagnosis: prev.diagnosis || type.name,
            medicationStopDays: prev.medicationStopDays || type.medicationStopDays || 7
        }));

    }, [selectedTypeId, surgeryDateTime, surgeryTypes]);

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            console.log("[SurgeryManager] Submitting Form Data (Raw):", formData);
            if (!formData.patientId) throw new Error('환자를 선택해주세요.');
            if (!formData.surgeryTypeId) throw new Error('수술/시술 종류를 선택해주세요.');
            if (!formData.surgeryDate) throw new Error('수술 예정 일시를 입력해주세요.');

            // Ensure toISO() format for backend reliability
            const submissionData = {
                ...formData,
                surgeryDate: DateTime.fromISO(formData.surgeryDate).toISO() || formData.surgeryDate,
                admissionDate: formData.admissionDate ? (DateTime.fromISO(formData.admissionDate).toISO() || '') : '',
                dischargeDate: formData.dischargeDate ? (DateTime.fromISO(formData.dischargeDate).toISO() || '') : ''
            };

            const response = await registerSurgery(submissionData);
            console.log("[SurgeryManager] Registration Success:", response);

            alert('✅ 수술 및 입원 예약이 완료되었습니다.\n[통합 케어 현황] 메뉴에서 케어 플랜을 관리할 수 있습니다.');
            setSelectedTypeId('');
            setSelectedPatient(null);
            setPatientSearch('');
            setFormData({
                patientId: '',
                doctorId: 'doc_test_01',
                surgeryTypeId: '',
                surgeryDate: '',
                admissionDate: '',
                dischargeDate: '',
                diagnosis: ''
            });
        } catch (error: any) {
            console.error("[SurgeryManager] Registration Error:", error);
            const serverMsg = error.response?.data?.message;
            const detailedMsg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
            alert(`❌ 등록 실패: ${detailedMsg || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSurgery = async (id: string, patientName: string) => {
        if (!confirm(`${patientName} 환자의 수술 기록과 케어 플랜을 완전히 삭제하시겠습니까?`)) return;
        try {
            await deleteSurgery(id);
            mutate('active-surgeries');
            alert('✅ 수술 기록이 삭제되었습니다.');
        } catch (e: any) {
            alert(`삭제 실패: ${e.message}`);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        setFormData({ ...formData, [name]: type === 'number' ? parseInt(value) : value });
    };

    if (typesError) return <div className="p-4 bg-red-50 border border-red-100 rounded text-red-600 flex items-center gap-2"><span>⚠️</span> 수술 종류 로딩 실패 (Backend 연결 확인)</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Registration Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">📝 신규 수술/입원 등록</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            환자를 검색하고 수술 종류를 선택하여 일정을 확정합니다.
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* 1. Patient Selection */}
                        <div className="relative">
                            <label className="absolute -top-3 left-4 bg-white px-2 text-sm font-bold text-indigo-600 z-10">① 환자 검색 및 선택</label>
                            <div className="p-6 border-2 border-indigo-100 rounded-xl bg-indigo-50/10 hover:border-indigo-200 transition-colors">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="환자 이름 또는 휴대폰 번호 검색"
                                        value={patientSearch}
                                        onChange={(e) => {
                                            setPatientSearch(e.target.value);
                                            if (selectedPatient) setSelectedPatient(null);
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                                            {searchResults.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleSelectPatient(p)}
                                                    className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                                >
                                                    <div>
                                                        <span className="font-bold text-slate-800">{p.name}</span>
                                                        <span className="ml-3 text-sm text-slate-500">{p.phone}</span>
                                                    </div>
                                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded">선택</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedPatient && (
                                    <div className="mt-3 flex items-center gap-3 bg-white p-3 rounded-lg border border-indigo-200 animate-in zoom-in duration-300">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xl">
                                            {selectedPatient.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{selectedPatient.name} <span className="text-xs font-normal text-slate-500">ID: {selectedPatient.id.slice(0, 8)}</span></div>
                                            <div className="text-xs text-slate-500 tracking-tighter">{selectedPatient.phone} | {selectedPatient.birthDate ? DateTime.fromISO(selectedPatient.birthDate).toFormat('yyyy-MM-dd') : '생일미상'}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedPatient(null); setPatientSearch(''); setFormData(prev => ({ ...prev, patientId: '' })) }}
                                            className="ml-auto text-slate-300 hover:text-rose-500"
                                        >✕</button>
                                    </div>
                                )}
                                <p className="mt-3 text-[10px] text-slate-400">
                                    💡 환자가 앱에서 회원가입을 완료하면 이곳에서 검색이 가능해집니다.
                                </p>
                            </div>
                        </div>

                        {/* 2. Department & Doctor Selection */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">② 진료과 (Department)</label>
                                <select
                                    value={selectedDeptId}
                                    onChange={(e) => {
                                        setSelectedDeptId(e.target.value);
                                        setFormData(prev => ({ ...prev, doctorId: '' })); // Reset doctor
                                    }}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 shadow-sm outline-none focus:ring-2 focus:ring-slate-500"
                                >
                                    <option value="">-- 진료과 선택 --</option>
                                    {departments?.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">③ 담당의 (Doctor)</label>
                                <select
                                    value={formData.doctorId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, doctorId: e.target.value }))}
                                    disabled={!selectedDeptId}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-3 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    <option value="">-- 의사 선택 --</option>
                                    {doctors?.filter((doc: any) => doc.departmentId === selectedDeptId).map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 3. Surgery Type Selection (Filtered) */}
                        <div className={clsx("relative transition-all duration-500", !selectedDeptId ? "opacity-50 pointer-events-none" : "opacity-100")}>
                            <label className="absolute -top-3 left-4 bg-white px-2 text-sm font-bold text-teal-600 z-10">④ 수술/시술 종류 선택</label>
                            <div className="p-6 border-2 border-teal-100 rounded-xl bg-teal-50/30 hover:border-teal-200 transition-colors">
                                <select
                                    value={selectedTypeId}
                                    onChange={(e) => setSelectedTypeId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg font-medium"
                                >
                                    <option value="">-- 수술 종류 선택 ({surgeryTypes?.filter((t: any) => !t.departmentId || t.departmentId === selectedDeptId).length || 0}개) --</option>
                                    {!surgeryTypes ? (
                                        <option disabled>로딩 중...</option>
                                    ) : (
                                        surgeryTypes
                                            .filter((t: any) => !t.departmentId || t.departmentId === selectedDeptId)
                                            .map((t: any) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.type === 'SURGERY' ? '🩺 수술' : '💊 시술'} - {t.name} (입원: {t.defaultStayDays}일)
                                                </option>
                                            ))
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* 3. Details + Ward Selection */}
                        <div className={clsx("space-y-6 transition-all duration-500", !selectedTypeId ? "opacity-30 blur-sm pointer-events-none" : "opacity-100")}>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">⑤ 수술 예정 일시</label>
                                    <input
                                        type="datetime-local"
                                        value={surgeryDateTime}
                                        onChange={(e) => setSurgeryDateTime(e.target.value)}
                                        className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">⑥ 진단명</label>
                                        <input
                                            type="text" name="diagnosis"
                                            value={formData.diagnosis} onChange={handleChange}
                                            placeholder="진단명 입력"
                                            className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">⑦ 약물 중단 (D-Day 기준)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number" name="medicationStopDays"
                                            value={formData.medicationStopDays} onChange={handleChange}
                                            className="w-24 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition text-center font-bold"
                                        />
                                        <span className="text-sm font-bold text-slate-500">일 전부터 중단</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">※ 혈전용해제 등 주의 약물 복용 중단 안내일입니다.</p>
                                </div>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex justify-between items-center text-amber-900 opacity-80">
                                <div className="text-xs font-bold flex items-center gap-2">
                                    <span>🛏️</span> 입원실 배정
                                </div>
                                <div className="text-xs">
                                    수술 전/후 실제 입원 시점에 배정합니다. (현재 '미배정' 상태로 등록)
                                </div>
                            </div>

                            {/* Auto-calc Result */}
                            <div className="bg-slate-800 text-slate-200 p-6 rounded-xl flex items-center justify-between shadow-lg">
                                <div className="text-center flex-1 border-r border-slate-600">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">입원 예정일</div>
                                    <input
                                        type="date" name="admissionDate"
                                        value={formData.admissionDate} onChange={handleChange}
                                        className="bg-transparent text-center font-mono text-lg font-bold outline-none text-white w-full"
                                    />
                                </div>
                                <div className="text-center flex-1">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">퇴원 예정일</div>
                                    <input
                                        type="date" name="dischargeDate"
                                        value={formData.dischargeDate} onChange={handleChange}
                                        className="bg-transparent text-center font-mono text-lg font-bold outline-none text-white w-full"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !selectedTypeId}
                                className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-black hover:to-slate-900 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        처리 중...
                                    </span>
                                ) : '✨ 수술 및 입원 확정 (Create Case)'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Recent Surgeries List for Quick Access */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">📋 최근 등록된 수술 목록 (Active Cases)</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {!activeSurgeries || activeSurgeries.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">등록된 수술이 없습니다.</div>
                    ) : (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        activeSurgeries.map((surgery: any) => (
                            <div key={surgery.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                <div className="flex items-center gap-4">
                                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                                        surgery.status === 'SURGERY' ? "bg-rose-500 animate-pulse" : "bg-slate-400"
                                    )}>
                                        {surgery.patient?.name?.[0] || 'P'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            {surgery.patient?.name || surgery.patientId}
                                            <span className="text-xs font-normal text-slate-400 px-2 py-0.5 border rounded">
                                                {surgery.surgeryType?.name}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                            <span>📅 {DateTime.fromISO(surgery.surgeryDate).toFormat('yyyy-MM-dd HH:mm')}</span>
                                            <span className="text-slate-200">|</span>
                                            {surgery.roomNumber ? (
                                                <span className="text-teal-600 font-bold">🏠 {surgery.roomNumber}</span>
                                            ) : (
                                                <span className="text-amber-500 font-bold">⚠️ 병실 미배정</span>
                                            )}
                                            <span className="text-slate-200">|</span>
                                            <span className={clsx("font-bold",
                                                surgery.status === 'SURGERY' ? "text-rose-500" : "text-slate-500"
                                            )}>{surgery.status || 'SCHEDULED'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onSelectSurgery && onSelectSurgery(surgery)}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition whitespace-nowrap"
                                    >
                                        케어 관리 →
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSurgery(surgery.id, surgery.patient?.name || '환자') }}
                                        className="p-2 text-slate-300 hover:text-rose-500 transition"
                                        title="기록 삭제"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
