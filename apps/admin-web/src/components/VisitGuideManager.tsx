import { useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import clsx from 'clsx';
import { DateTime } from 'luxon';

import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();
const fetcher = (url: string) => axios.get(url).then(res => res.data);

const STEP_TEMPLATES = [
    { name: '원무과 수납', location: '1층 로비', category: 'NOTICE' },
    { name: '혈액 검사', location: '2층 진단검사의학과', category: 'EXAM' },
    { name: 'X-Ray 촬영', location: '2층 영상의학과', category: 'EXAM' },
    { name: '초음파 검사', location: '2층 영상의학과', category: 'EXAM' },
    { name: '물리치료', location: '3층 재활센터', category: 'TREATMENT' },
    { name: '주사실', location: '1층 주사실', category: 'INJECTION' },
    { name: '약국 처방', location: '1층 외부 약국', category: 'MEDICATION' },
    { name: '진료실 방문', location: '2층 내과 1진료실', category: 'NOTICE' },
];

const TodayAppointments = ({ onSelect, selectedId }: { onSelect: (p: any) => void, selectedId?: string }) => {
    const todayStr = DateTime.now().toFormat('yyyy-MM-dd');
    const { data: appointments, isLoading } = useSWR(`${API_URL}/booking/appointments?date=${todayStr}`, fetcher);

    if (isLoading) return <div className="p-4 bg-white rounded-3xl border border-slate-200 animate-pulse h-20"></div>;

    const patients = Array.from(new Map(appointments?.map((a: any) => [a.patient.id, a.patient])).values());

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[280px]">
            <h2 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center justify-between">
                <span>📅 오늘 예약자 명단</span>
                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">{patients.length}명</span>
            </h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {patients.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic text-center py-8">오늘 예약된 환자가 없습니다.</p>
                ) : (
                    patients.map((p: any) => (
                        <button
                            key={p.id}
                            onClick={() => onSelect(p)}
                            className={clsx(
                                "w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left",
                                selectedId === p.id ? "border-indigo-500 bg-indigo-50 shadow-sm" : "border-slate-50 bg-slate-50 hover:border-slate-200"
                            )}
                        >
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs",
                                selectedId === p.id ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                            )}>
                                {p.name[0]}
                            </div>
                            <div>
                                <div className="font-black text-xs text-slate-800">{p.name}</div>
                                <div className="text-[8px] text-slate-400 font-bold">{p.phone}</div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export const VisitGuideManager = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [newItemLocation, setNewItemLocation] = useState('');

    // Search for patients
    const { data: searchResults } = useSWR(
        searchQuery ? `${API_URL}/hospital/search?query=${searchQuery}` : null,
        fetcher
    );

    // Get steps for selected patient
    const { data: steps, mutate } = useSWR(
        selectedPatient ? `${API_URL}/visit-guide?patientId=${selectedPatient.id}` : null,
        fetcher,
        { refreshInterval: 5000 }
    );

    const handleAddStep = async (template: typeof STEP_TEMPLATES[0]) => {
        if (!selectedPatient) return;
        try {
            await axios.post(`${API_URL}/visit-guide`, {
                patientId: selectedPatient.id,
                name: template.name,
                location: newItemLocation || template.location,
                category: template.category
            });
            setNewItemLocation('');
            mutate();
        } catch (e) {
            alert('Failed to add step');
        }
    };

    const handleToggleStatus = async (step: any) => {
        const newStatus = step.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        try {
            await axios.patch(`${API_URL}/visit-guide/${step.id}`, { status: newStatus });

            // USER POLICY: Payment at Administration marks end of all activities
            if (newStatus === 'COMPLETED' && (step.name.includes('수납') || step.name.includes('원무과'))) {
                alert('✅ 원무과 수납이 완료되었습니다.\n모든 진료 과정이 종료되었습니다.');
            }

            mutate();
        } catch (e) {
            alert('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('경로를 삭제하시겠습니까?')) return;
        try {
            await axios.delete(`${API_URL}/visit-guide/${id}`);
            mutate();
        } catch (e) {
            alert('Failed to delete');
        }
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500">
            {/* Left: Patient Search & Info */}
            <div className="w-[420px] flex flex-col gap-6 shrink-0">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    {/* ... (Search and Patient Info - keeping logic same but wider container) ... */}
                    <h2 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                        <span>🔍</span> 환자 검색 및 선택
                    </h2>
                    <div className="relative">
                        <input
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="이름 또는 전화번호 입력"
                        />
                        {searchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto">
                                {searchResults?.length > 0 ? (
                                    searchResults.map((p: any) => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedPatient(p);
                                                setSearchQuery('');
                                            }}
                                            className="w-full p-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between"
                                        >
                                            <div>
                                                <div className="font-black text-slate-800">{p.name}</div>
                                                <div className="text-xs text-slate-500">{p.phone}</div>
                                            </div>
                                            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold text-slate-400 capitalize">{p.gender} / {DateTime.fromISO(p.birthDate).toFormat('yyMMdd')}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-slate-400 italic">검색 결과가 없습니다.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedPatient && (
                        <div className="mt-6 p-5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200 animate-in zoom-in duration-300">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-black">
                                    {selectedPatient.name[0]}
                                </div>
                                <div>
                                    <div className="font-black text-lg">{selectedPatient.name}</div>
                                    <div className="text-xs opacity-70 font-medium">{selectedPatient.phone}</div>
                                </div>
                            </div>
                            <div className="flex bg-black/10 rounded-xl p-3 justify-between text-xs font-bold">
                                <span>생년월일: {DateTime.fromISO(selectedPatient.birthDate).toFormat('yyyy.MM.dd')}</span>
                                <span>성별: {selectedPatient.gender === 'M' ? '남성' : '여성'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Today's Appointments Summary */}
                <TodayAppointments onSelect={setSelectedPatient} selectedId={selectedPatient?.id} />

                {selectedPatient && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                        <h2 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">📍 경로 설계 (Step Builder)</h2>

                        {/* Custom Input */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">➕ 임의 경로 추가 (Custom)</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 p-3 text-sm bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold placeholder:font-normal"
                                    placeholder="예: CT 촬영, 상담 등"
                                    value={newItemLocation} // Using this for NAME now as per user request for arbitrary items
                                    onChange={e => setNewItemLocation(e.target.value)}
                                    // Handle Enter key
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newItemLocation) {
                                            handleAddStep({ name: newItemLocation, location: '안내 데스크 문의', category: 'NOTICE' });
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => newItemLocation && handleAddStep({ name: newItemLocation, location: '안내 데스크 문의', category: 'NOTICE' })}
                                    className="bg-indigo-600 text-white px-4 rounded-xl font-bold shadow-md active:scale-95 transition-all"
                                >
                                    추가
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 ml-1 text-center">*원하는 항목을 직접 입력하여 추가할 수 있습니다.</p>
                        </div>

                        {/* Presets Grid - LARGER */}
                        <div className="grid grid-cols-2 gap-3">
                            {STEP_TEMPLATES.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => handleAddStep(t)}
                                    className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-500 hover:bg-indigo-50 group transition-all text-left flex flex-col justify-between h-24 shadow-sm hover:shadow-md active:scale-95"
                                >
                                    <div className="font-black text-sm text-slate-700 group-hover:text-indigo-700 break-keep leading-tight">{t.name}</div>
                                    <div className="flex justify-between items-end w-full">
                                        <div className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg group-hover:bg-white">{t.location}</div>
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-200 group-hover:text-indigo-700 transition-colors text-xs font-bold">+</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Timeline View */}
            <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar relative">
                {!selectedPatient ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <div className="text-6xl mb-6 grayscale opacity-20">🗺️</div>
                        <p className="text-lg font-black text-slate-400">환자를 먼저 선택해주세요.</p>
                        <p className="text-sm font-medium mt-2">환자의 외래 진기 이동 경로를 실시간으로 설계할 수 있습니다.</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">🗺️ 실시간 진료 여정 로드맵</h3>
                                <p className="text-sm text-slate-400 font-medium mt-1">총 {steps?.length || 0}개의 경유지가 설정되어 있습니다.</p>
                            </div>
                            <span className="text-xs font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                {DateTime.now().toFormat('yyyy년 MM월 dd일')}
                            </span>
                        </div>

                        <div className="space-y-6 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-1 before:bg-slate-100">
                            {steps?.map((step: any, index: number) => {
                                const isDone = step.status === 'COMPLETED';
                                return (
                                    <div key={step.id} className="relative pl-14 group">
                                        {/* Connector Circle */}
                                        <div className={clsx(
                                            "absolute left-[18px] top-6 w-5 h-5 rounded-full border-4 z-10 transition-all duration-500",
                                            isDone ? "bg-emerald-500 border-emerald-100 scale-125 shadow-lg shadow-emerald-200" : "bg-white border-slate-200"
                                        )}></div>

                                        {/* Card */}
                                        <div className={clsx(
                                            "p-6 rounded-3xl border-2 transition-all duration-300 flex justify-between items-center",
                                            isDone ? "bg-slate-50 border-slate-100 opacity-70" : "bg-white border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1"
                                        )}>
                                            <div className="flex gap-5 items-center">
                                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-bold text-slate-500">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={clsx(
                                                            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                                            step.category === 'EXAM' ? "bg-rose-50 text-rose-600" :
                                                                step.category === 'TREATMENT' ? "bg-blue-50 text-blue-600" :
                                                                    "bg-slate-200 text-slate-600"
                                                        )}>{step.category}</span>
                                                    </div>
                                                    <h4 className={clsx("text-lg font-black", isDone ? "text-slate-400 line-through" : "text-slate-800")}>{step.name}</h4>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-1">
                                                        <span>📍 {step.location}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleToggleStatus(step)}
                                                    className={clsx(
                                                        "px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-md",
                                                        isDone
                                                            ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                                                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                                                    )}
                                                >
                                                    {isDone ? "실행 취소" : "동선 완료"}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(step.id)}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {(!steps || steps.length === 0) && (
                                <div className="text-center py-24 border-4 border-slate-50 border-dashed rounded-[2.5rem]">
                                    <div className="text-5xl mb-4 grayscale opacity-10">🚀</div>
                                    <p className="text-slate-400 font-black">오늘 예정된 진료 여정이 비어있습니다.</p>
                                    <p className="text-xs font-bold text-slate-300 mt-2 italic">오른쪽의 프리셋 버튼을 클릭하여 환자의 동선을 설계하세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
