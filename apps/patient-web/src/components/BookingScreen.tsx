import { useState } from 'react'
import { useSlots, useDepartments, useDoctors } from '../hooks/useSlotManager'
import axios from 'axios'
import { DateTime } from 'luxon'
import clsx from 'clsx'

import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

export const BookingScreen = ({ patientId }: { patientId: string }) => {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [selectedDept, setSelectedDept] = useState<string>('')
    const [selectedDoctor, setSelectedDoctor] = useState<string>('')
    /* New State for Visit Type */
    const [visitType, setVisitType] = useState<'INITIAL' | 'RETURNING' | null>(null);

    // Data Hooks
    const { departments } = useDepartments()
    const { doctors } = useDoctors(selectedDept || null)
    const { slots, isLoading, refresh } = useSlots(selectedDept || '', selectedDate, selectedDoctor)

    const handleBook = async (slotId: string) => {
        if (!selectedDept) { alert("진료과를 선택해주세요."); return; }
        if (!visitType) { alert("진료 구분을 선택해주세요 (초진/재진)."); return; }

        const idempotencyKey = `web_${Date.now()}_${Math.random()}`;
        try {
            await axios.post(`${API_URL}/booking/appointments`, {
                slotId,
                patientId
            }, {
                headers: { 'Idempotency-Key': idempotencyKey }
            });

            // Force Revalidate
            refresh();
            await new Promise(r => setTimeout(r, 500));

            // Conditional Message
            if (visitType === 'INITIAL') {
                alert("✅ 예약(가접수)이 완료되었습니다.\n\n[필독: 초진 안내]\n초음 방문, 6개월 이후 재방문, 또는 다른 부위 진료의 경우\n반드시 1층 '원무과'에서 개인정보 등록 및 수납을 먼저 하셔야 합니다.\n\n예약 시간 20분 전까지 내원 부탁드립니다.");
            } else {
                alert("✅ 예약이 확정되었습니다!\n\n예약 시간에 맞춰 해당 진료과 앞으로 와주세요.");
            }

            refresh();
        } catch (e: any) {
            console.error(e);
            const msg = e.response?.data?.message || e.message || "알 수 없는 오류";
            alert(`❌ 예약 실패: ${msg}`);
            refresh();
        }
    }

    return (
        <div className="pb-24">
            {/* 1. Selection Header */}
            <div className="bg-white p-5 border-b border-slate-100 sticky top-0 z-20 shadow-sm space-y-4">

                {/* Visit Type Selection (New) */}
                <div>
                    <h2 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">1. 진료 구분</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setVisitType('INITIAL')}
                            className={clsx("p-3 rounded-xl border text-left transition-all relative overflow-hidden",
                                visitType === 'INITIAL' ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className="font-bold text-slate-800 text-sm mb-1">초진 (첫 방문)</div>
                            <div className="text-[10px] text-slate-500 leading-tight">처음, 6개월 후 재방문, 타질환</div>
                            {visitType === 'INITIAL' && <div className="absolute top-2 right-2 text-indigo-600">✔</div>}
                        </button>
                        <button
                            onClick={() => setVisitType('RETURNING')}
                            className={clsx("p-3 rounded-xl border text-left transition-all relative overflow-hidden",
                                visitType === 'RETURNING' ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className="font-bold text-slate-800 text-sm mb-1">재진 (재방문)</div>
                            <div className="text-[10px] text-slate-500 leading-tight">기존 진료 연속, 예약 환자</div>
                            {visitType === 'RETURNING' && <div className="absolute top-2 right-2 text-indigo-600">✔</div>}
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">2. 진료과 및 의료진</h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {departments.map((dept: any) => (
                            <button
                                key={dept.id}
                                onClick={() => { setSelectedDept(dept.id); setSelectedDoctor(''); }}
                                className={clsx("px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                                    selectedDept === dept.id
                                        ? "bg-slate-900 text-white shadow-lg scale-105"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}
                            >
                                {dept.name}
                            </button>
                        ))}
                    </div>

                    {selectedDept && doctors.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            <button
                                onClick={() => setSelectedDoctor('')}
                                className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold border transition",
                                    selectedDoctor === '' ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-white border-slate-200 text-slate-400"
                                )}
                            >
                                상관없음
                            </button>
                            {doctors.map((doc: any) => (
                                <button
                                    key={doc.id}
                                    onClick={() => setSelectedDoctor(doc.id)}
                                    className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1",
                                        selectedDoctor === doc.id
                                            ? "bg-teal-50 border-teal-500 text-teal-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-teal-200"
                                    )}
                                >
                                    <span>👨‍⚕️</span> {doc.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Date Picker (Only if Dept Selected) */}
                {selectedDept ? (
                    <>
                        <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-slate-100 z-10">
                            <button
                                onClick={() => setSelectedDate(prev => {
                                    const newDate = new Date(prev);
                                    newDate.setDate(prev.getDate() - 1);
                                    return newDate;
                                })}
                                className="p-2 w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition flex items-center justify-center"
                            >
                                ❮
                            </button>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{DateTime.fromJSDate(selectedDate).toFormat('yyyy')}</span>
                                <span className="font-bold text-lg text-slate-800">{DateTime.fromJSDate(selectedDate).setLocale('ko').toFormat('M월 d일 (cccc)')}</span>
                            </div>
                            <button
                                onClick={() => setSelectedDate(prev => {
                                    const newDate = new Date(prev);
                                    newDate.setDate(prev.getDate() + 1);
                                    return newDate;
                                })}
                                className="p-2 w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition flex items-center justify-center"
                            >
                                ❯
                            </button>
                        </div>

                        <div className="p-5">
                            <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                                <span className="bg-teal-100 text-teal-600 p-1.5 rounded-lg text-sm">🕒</span>
                                예약 가능 시간
                            </h2>
                            {isLoading ? (
                                <div className="text-center py-20">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-4"></div>
                                    <div className="text-slate-400 text-sm">스케줄을 불러오는 중...</div>
                                </div>
                            ) : slots.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <div className="text-4xl mb-3 opacity-50">😴</div>
                                    <p className="font-medium">예약 가능한 슬롯이 없습니다.</p>
                                    <p className="text-xs mt-1">다른 날짜를 선택해보세요.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {slots.map((slot: any) => {
                                        const isFull = slot.status === 'FULL' || slot.status === 'CLOSED' || slot.bookedCount >= slot.capacity;
                                        return (
                                            <button
                                                key={slot.id}
                                                disabled={isFull}
                                                onClick={() => handleBook(slot.id)}
                                                className={clsx(
                                                    "relative py-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center group",
                                                    isFull
                                                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed grayscale"
                                                        : "bg-white border-slate-200 text-slate-700 shadow-sm hover:shadow-md hover:border-teal-400 hover:text-teal-600 active:scale-95 active:shadow-inner"
                                                )}
                                            >
                                                <span className="text-lg font-bold tracking-tight mb-1 group-hover:scale-110 transition-transform">
                                                    {DateTime.fromISO(slot.startDateTime).toFormat('HH:mm')}
                                                </span>
                                                <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-bold",
                                                    isFull ? "bg-slate-100 text-slate-400" : "bg-teal-50 text-teal-600"
                                                )}>
                                                    {isFull ? "마감" : `${slot.bookedCount}/${slot.capacity}명`}
                                                </span>

                                                {isFull && (
                                                    <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl">
                                                        <div className="absolute top-2 right-2 transform rotate-12 border-2 border-red-200 text-red-300 text-[10px] font-bold px-1 rounded rotate-[-12deg]">FULL</div>
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 text-slate-300">
                        <div className="text-5xl mb-4 grayscale opacity-20">🏥</div>
                        <p>상단에서 진료과를 먼저 선택해주세요.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
