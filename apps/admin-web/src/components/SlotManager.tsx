import { useState } from 'react';
import useSWR from 'swr';
import { DateTime } from 'luxon';
import clsx from 'clsx';
import { useSlots, generateSlots, getDepartments, getDoctors, useAppointments, checkInAppointment } from '../hooks/useSlotManager';


export const SlotManager = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');

    // Fetch Departments
    const { data: departments } = useSWR('departments', getDepartments, {
        onSuccess: (data) => {
            if (data && data.length > 0 && !selectedDept) {
                setSelectedDept(data[0].id);
            }
        }
    });

    // Fetch Doctors
    const { data: doctors } = useSWR(selectedDept ? `doctors-${selectedDept}` : null, () => getDoctors(selectedDept), {
        onSuccess: (_data) => {
            setSelectedDoctor('');
        }
    });

    // Fetch Slots
    const { slots, refresh: refreshSlots, isLoading } = useSlots(selectedDept, selectedDate, selectedDoctor);
    // Fetch Appointments for the table
    const { appointments, isLoading: isApptsLoading, refresh: refreshAppts } = useAppointments(selectedDept, selectedDate, selectedDoctor);

    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!selectedDept) {
            alert('부서를 선택해주세요.');
            return;
        }

        setGenerating(true);
        try {
            await generateSlots(selectedDept, selectedDate, selectedDoctor);
            alert('✅ 슬롯이 생성되었습니다.');
            refreshSlots();
        } catch (error: any) {
            console.error('[Slot Generation Error]', error);
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;
            alert(`슬롯 생성 실패 (${status}): ${message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleCheckIn = async (apptId: string, patientName: string) => {
        if (!confirm(`${patientName} 환자의 당일 내원 접수를 진행하시겠습니까?\n접수 시 외래 경로 관리에 자동으로 등록됩니다.`)) return;
        try {
            await checkInAppointment(apptId);
            alert('✅ 접수가 완료되었습니다.');
            refreshAppts();
            refreshSlots();
        } catch (e) {
            alert('접수 처리 실패');
        }
    };

    const handleToggleStatus = async (_slotId: string, currentStatus: string) => {
        if (!confirm(currentStatus === 'OPEN' ? '슬롯을 예약 마감(CLOSE) 하시겠습니까?' : '슬롯을 다시 오픈(OPEN) 하시겠습니까?')) return;
        alert("기능 구현 중입니다. (Backend endpoint required)");
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            {/* Header / Condition Bar */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-end gap-4">
                <div className="flex gap-6 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">날짜 선택</label>
                        <input
                            type="date"
                            value={DateTime.fromJSDate(selectedDate).toFormat('yyyy-MM-dd')}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">진료과 선택</label>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
                        >
                            <option value="">-- 부서 선택 --</option>
                            {departments?.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">의료진 선택</label>
                        <select
                            value={selectedDoctor}
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                            disabled={!selectedDept}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px] disabled:opacity-50"
                        >
                            <option value="">-- 전체/미지정 --</option>
                            {doctors?.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating || !selectedDept}
                    className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {generating ? '생성 중...' : '⚡️ 슬롯 자동 생성'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Slots Grid (Current View) */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span>⏱️</span> 예약 슬롯 현황
                    </h3>

                    {isLoading && <div className="p-8 text-center text-slate-400">데이터 로딩 중...</div>}
                    {!isLoading && slots.length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="text-slate-500 text-sm">슬롯이 없습니다.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map((slot: any) => {
                            const startTime = DateTime.fromISO(slot.startDateTime).toFormat('HH:mm');
                            const isFull = slot.bookedCount >= slot.capacity || slot.status === 'FULL' || slot.status === 'CLOSED';
                            const isClosed = slot.status === 'CLOSED';
                            const hasBookings = slot.bookedCount > 0;

                            return (
                                <div
                                    key={slot.id}
                                    onClick={() => handleToggleStatus(slot.id, slot.status)}
                                    className={clsx(
                                        "p-2 rounded-lg border text-center transition cursor-pointer hover:shadow-md",
                                        isClosed ? "bg-slate-100 border-slate-200 opacity-50 grayscale" :
                                            isFull ? "bg-red-50 border-red-100" :
                                                hasBookings ? "bg-indigo-50 border-indigo-100" :
                                                    "bg-white border-slate-100 hover:border-indigo-400"
                                    )}
                                >
                                    <div className="text-xs font-bold text-slate-700 mb-1">{startTime}</div>
                                    <div className="text-[10px] font-bold">
                                        <span className={isFull ? "text-red-500" : hasBookings ? "text-indigo-600" : "text-slate-400"}>
                                            {isClosed ? '마감' : `${slot.bookedCount}/${slot.capacity}`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Appointment List (New View) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span>📝</span> 예약 확정자 명단 (Appointments)
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {appointments.length}건
                        </span>
                    </h3>

                    {isApptsLoading && <div className="py-20 text-center text-slate-400">명단 불러오는 중...</div>}
                    {!isApptsLoading && appointments.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                            <div className="text-4xl mb-3 grayscale opacity-20">📭</div>
                            <p className="text-slate-400">아직 예약된 환자가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                                        <th className="py-3 px-2">시간</th>
                                        <th className="py-3 px-2">환자명</th>
                                        <th className="py-3 px-2">연락처</th>
                                        <th className="py-3 px-2">담당의</th>
                                        <th className="py-3 px-2 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {appointments.map((appt: any) => (
                                        <tr key={appt.id} className="hover:bg-slate-50 transition group">
                                            <td className="py-3 px-2">
                                                <div className="text-sm font-bold text-slate-800">
                                                    {DateTime.fromISO(appt.slot.startDateTime).toFormat('HH:mm')}
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                                                        {appt.patient.name[0]}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{appt.patient.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className="text-xs text-slate-500 font-mono">{appt.patient.phone}</span>
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className="text-xs text-slate-600">
                                                    {appt.slot.doctor?.name || '미지정'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    {appt.status === 'BOOKED' ? (
                                                        <button
                                                            onClick={() => handleCheckIn(appt.id, appt.patient.name)}
                                                            className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-600 transition shadow-sm flex items-center gap-1"
                                                        >
                                                            <span>✅</span> 내원 접수
                                                        </button>
                                                    ) : (
                                                        <span className={clsx("text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1",
                                                            appt.status === 'CHECKED_IN' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400"
                                                        )}>
                                                            {appt.status === 'CHECKED_IN' ? '⚡️ 접수됨' : appt.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
