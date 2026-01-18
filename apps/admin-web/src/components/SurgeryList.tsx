
import { useState, useEffect } from 'react';
import { getActiveSurgeries, rescheduleSurgery } from '../hooks/useCareManager';
import { DateTime } from 'luxon';
import { CarePlanEditor } from './CarePlanEditor';
import clsx from 'clsx';

export const SurgeryList = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [surgeries, setSurgeries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getActiveSurgeries();
            setSurgeries(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleReschedule = async (id: string, current: string) => {
        // Simple prompt for prototype
        const newDate = prompt("Enter new Surgery Date (YYYY-MM-DD):", current.split('T')[0]);
        if (!newDate || newDate === current.split('T')[0]) return;

        try {
            await rescheduleSurgery(id, newDate);
            alert("✅ Surgery Rescheduled! Care Plan has been auto-adjusted.");
            load();
        } catch (e) {
            alert("Failed to reschedule");
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (loading) return <div>목록을 불러오는 중...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200 mt-8">
            <h3 className="text-lg font-bold mb-4">📅 진행 중인 수술 현황</h3>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b">
                        <th className="p-3">환자명</th>
                        <th className="p-3">담당의</th>
                        <th className="p-3">진단명</th>
                        <th className="p-3">수술일</th>
                        <th className="p-3">관리</th>
                    </tr>
                </thead>
                <tbody>
                    {surgeries.map(s => {
                        const isExpanded = expandedIds.includes(s.id);
                        return (
                            <>
                                <tr key={s.id} className={clsx("border-b hover:bg-slate-50", isExpanded && "bg-slate-50")}>
                                    <td className="p-3 font-medium">{s.patient.name}</td>
                                    <td className="p-3">{s.doctor.name}</td>
                                    <td className="p-3 text-slate-500">{s.consultNote}</td>
                                    <td className="p-3 font-bold text-blue-600">
                                        {DateTime.fromISO(s.surgeryDate).toFormat('yyyy-MM-dd')}
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            onClick={() => handleReschedule(s.id, s.surgeryDate)}
                                            className="px-3 py-1 bg-slate-800 text-white rounded text-xs hover:bg-slate-600"
                                        >
                                            일정 변경
                                        </button>
                                        <button
                                            onClick={() => toggleExpand(s.id)}
                                            className="px-3 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700"
                                        >
                                            {isExpanded ? '닫기' : '케어 관리'}
                                        </button>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr>
                                        <td colSpan={5} className="p-4 bg-slate-50 border-b">
                                            <CarePlanEditor surgery={s} />
                                        </td>
                                    </tr>
                                )}
                            </>
                        );
                    })}
                    {surgeries.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-slate-400">진행 중인 수술 케이스가 없습니다.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
