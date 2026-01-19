import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { getDepartments, getDepartmentSchedules, updateDepartmentSchedule } from '../hooks/useAdminSettings';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const ScheduleSettings = () => {
    const { data: departments } = useSWR('departments', getDepartments);
    const [selectedDeptId, setSelectedDeptId] = useState('');

    // Day 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const [schedules, setSchedules] = useState<any[]>([]);

    useEffect(() => {
        if (departments && departments.length > 0 && !selectedDeptId) {
            setSelectedDeptId(departments[0].id);
        }
    }, [departments]);

    useEffect(() => {
        if (!selectedDeptId) return;

        const loadData = async () => {
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
                    isHoliday: false // Default to working every day to avoid confusion
                }));

                const data = await getDepartmentSchedules(selectedDeptId);

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
                // Even on error, show defaults
                setSchedules(Array.from({ length: 7 }, (_, i) => ({
                    dayOfWeek: i,
                    startTime: '09:00',
                    endTime: '18:00',
                    breakStart: '12:00',
                    breakEnd: '13:00',
                    slotDuration: 30, // Default 30 min
                    capacityPerSlot: 3,
                    isHoliday: false
                })));
            }
        };

        loadData();
    }, [selectedDeptId]);

    const handleUpdate = (index: number, field: string, value: any) => {
        const newSchedules = [...schedules];
        newSchedules[index] = { ...newSchedules[index], [field]: value };
        setSchedules(newSchedules);
    };

    const handleSave = async () => {
        if (!selectedDeptId) return;
        try {
            await updateDepartmentSchedule(selectedDeptId, schedules);
            alert('✅ 근무 시간이 저장되었습니다.');
        } catch (e) {
            alert('저장 실패');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">요일별 근무 시간 설정</h3>
                <div className="flex gap-2">
                    <select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="bg-white border rounded-lg p-2 text-sm font-bold min-w-[200px]"
                    >
                        {departments?.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-sm"
                    >
                        저장하기
                    </button>
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
                        <div className="px-1"><input type="number" disabled={s.isHoliday} value={s.capacityPerSlot} onChange={(e) => handleUpdate(idx, 'capacityPerSlot', e.target.value)} className="w-full border p-1 rounded text-center" /></div>
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
