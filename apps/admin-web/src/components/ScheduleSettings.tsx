import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
    getDepartments,
    getDepartmentSchedules,
    updateDepartmentSchedule,
    getDoctors,
    getDoctorSchedules,
    updateDoctorSchedule
} from '../hooks/useAdminSettings';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const ScheduleSettings = () => {
    const { data: departments } = useSWR('departments', getDepartments);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedDoctorId, setSelectedDoctorId] = useState('default');

    // Fetch doctors for selected department
    const { data: doctors } = useSWR(selectedDeptId ? ['doctors', selectedDeptId] : null, () => getDoctors(selectedDeptId));

    // Day 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const [schedules, setSchedules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (departments && departments.length > 0 && !selectedDeptId) {
            setSelectedDeptId(departments[0].id);
        }
    }, [departments]);

    // Reset doctor selection when department changes
    useEffect(() => {
        setSelectedDoctorId('default');
    }, [selectedDeptId]);

    useEffect(() => {
        if (!selectedDeptId) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Initialize defaults first
                const defaults = Array.from({ length: 7 }, (_, i) => ({
                    dayOfWeek: i,
                    startTime: '09:00',
                    endTime: '18:00',
                    breakStart: '12:00',
                    breakEnd: '13:00',
                    slotDuration: 30,
                    capacityPerSlot: 3,
                    isHoliday: false
                }));

                let data;
                if (selectedDoctorId === 'default') {
                    data = await getDepartmentSchedules(selectedDeptId);
                } else {
                    data = await getDoctorSchedules(selectedDoctorId);
                }

                // Merge server data into defaults
                if (data && Array.isArray(data)) {
                    data.forEach((serverRule: any) => {
                        const idx = serverRule.dayOfWeek;
                        if (defaults[idx]) {
                            defaults[idx] = { ...defaults[idx], ...serverRule };
                        }
                    });
                }

                setSchedules(defaults);
            } catch (e) {
                console.error("Failed to load schedules", e);
                setSchedules(Array.from({ length: 7 }, (_, i) => ({
                    dayOfWeek: i,
                    startTime: '09:00',
                    endTime: '18:00',
                    breakStart: '12:00',
                    breakEnd: '13:00',
                    slotDuration: 30,
                    capacityPerSlot: 3,
                    isHoliday: false
                })));
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [selectedDeptId, selectedDoctorId]);

    const handleUpdate = (index: number, field: string, value: any) => {
        const newSchedules = [...schedules];
        newSchedules[index] = { ...newSchedules[index], [field]: value };
        setSchedules(newSchedules);
    };

    const handleSave = async () => {
        if (!selectedDeptId) return;
        setIsLoading(true);
        try {
            if (selectedDoctorId === 'default') {
                await updateDepartmentSchedule(selectedDeptId, schedules);
            } else {
                await updateDoctorSchedule(selectedDoctorId, schedules);
            }
            alert('✅ 근무 시간이 저장되었습니다.');
        } catch (e: any) {
            console.error(e);
            alert(`저장 실패: ${e.response?.data?.message || e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                    <h3 className="font-black text-2xl text-slate-800 tracking-tight">⏱️ 운영 시간 관리</h3>
                    <p className="text-sm text-slate-500 font-medium">진료과목 및 담당의별 진료 시간을 설정합니다.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">진료과목</span>
                        <select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold min-w-[180px] focus:border-indigo-500 outline-none transition-all shadow-sm"
                        >
                            {departments?.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">담당의 지정</span>
                        <select
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold min-w-[180px] focus:border-indigo-500 outline-none transition-all shadow-sm"
                        >
                            <option value="default">부서 기본 일정 (전체)</option>
                            {doctors?.map((doc: any) => (
                                <option key={doc.id} value={doc.id}>{doc.name} 원장님</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-600 transition shadow-lg disabled:opacity-50 active:scale-95 h-[42px]"
                        >
                            {isLoading ? '처리 중...' : '저장하기'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_100px_80px] bg-slate-50 border-b font-bold text-xs text-slate-500 py-3 px-4 text-center">
                    <div>요일</div>
                    <div>시작 시간</div>
                    <div>종료 시간</div>
                    <div>휴게 시작</div>
                    <div>휴게 종료</div>
                    <div>간격(분)</div>
                    <div>시간당 인원</div>
                    <div>휴무 여부</div>
                </div>

                {schedules.map((s: any, idx) => (
                    <div key={s.dayOfWeek} className={`grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_100px_80px] py-3 px-4 border-b last:border-0 text-sm items-center hover:bg-indigo-50/30 transition ${s.isHoliday ? 'bg-slate-50 opacity-60' : ''}`}>
                        <div className="font-bold text-center">
                            <span className={s.dayOfWeek === 0 ? 'text-rose-500' : s.dayOfWeek === 6 ? 'text-blue-500' : 'text-slate-700'}>
                                {DAYS[s.dayOfWeek]}요일
                            </span>
                        </div>
                        <div className="px-1"><input type="time" disabled={s.isHoliday} value={s.startTime} onChange={(e) => handleUpdate(idx, 'startTime', e.target.value)} className="w-full border p-1 rounded text-center" /></div>
                        <div className="px-1"><input type="time" disabled={s.isHoliday} value={s.endTime} onChange={(e) => handleUpdate(idx, 'endTime', e.target.value)} className="w-full border p-1 rounded text-center" /></div>
                        <div className="px-1"><input type="time" disabled={s.isHoliday} value={s.breakStart || ''} onChange={(e) => handleUpdate(idx, 'breakStart', e.target.value)} className="w-full border p-1 rounded text-center" /></div>
                        <div className="px-1"><input type="time" disabled={s.isHoliday} value={s.breakEnd || ''} onChange={(e) => handleUpdate(idx, 'breakEnd', e.target.value)} className="w-full border p-1 rounded text-center" /></div>
                        <div className="px-1">
                            <select disabled={s.isHoliday} value={s.slotDuration} onChange={(e) => handleUpdate(idx, 'slotDuration', Number(e.target.value))} className="w-full border p-1 rounded text-center">
                                <option value={10}>10분</option>
                                <option value={15}>15분</option>
                                <option value={20}>20분</option>
                                <option value={30}>30분</option>
                                <option value={60}>60분</option>
                            </select>
                        </div>
                        <div className="px-1"><input type="number" disabled={s.isHoliday} value={s.capacityPerSlot} onChange={(e) => handleUpdate(idx, 'capacityPerSlot', Number(e.target.value))} className="w-full border p-1 rounded text-center" /></div>
                        <div className="text-center flex justify-center">
                            <input
                                type="checkbox"
                                checked={s.isHoliday}
                                onChange={(e) => handleUpdate(idx, 'isHoliday', e.target.checked)}
                                className="w-5 h-5 accent-rose-500 cursor-pointer"
                            />
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-slate-400 text-right">* 변경된 설정은 다음 슬롯 생성 시점부터 적용됩니다.</p>
        </div>
    );
}
