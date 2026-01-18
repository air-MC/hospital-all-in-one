import { useState } from 'react'
import { useDailyCare, useMySurgery, completeCareItem } from '../hooks/useCareManager'
import { useVisitGuide, completeStep } from '../hooks/useVisitGuide'
import { DateTime } from 'luxon'
import clsx from 'clsx'

interface CareScreenProps {
    patientId: string;
    onOpenNoti: () => void;
    unreadCount: number;
}

export const CareScreen = ({ patientId, onOpenNoti, unreadCount }: CareScreenProps) => {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [activeTab, setActiveTab] = useState<'OUTPATIENT' | 'INPATIENT'>('OUTPATIENT')
    const { items, isLoading, refresh } = useDailyCare(patientId, selectedDate)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [completing, setCompleting] = useState<string | null>(null)

    // Visit Guide Integration
    const { steps: visitSteps, refresh: refreshVisit } = useVisitGuide(patientId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentStep = visitSteps && visitSteps.find((s: any) => s.status !== 'COMPLETED' && s.status !== 'SKIPPED');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedSteps = visitSteps ? visitSteps.filter((s: any) => s.status === 'COMPLETED').length : 0;
    const totalSteps = visitSteps ? visitSteps.length : 0;

    const handleStepComplete = async (stepId: string) => {
        if (!confirm('현재 단계를 완료하고 다음 안내를 확인하시겠습니까?')) return;
        try {
            await completeStep(stepId);
            refreshVisit();
        } catch (e) {
            alert('상태 업데이트 실패');
        }
    };

    const isToday = DateTime.fromJSDate(selectedDate).hasSame(DateTime.now(), 'day')

    const handleToggle = async (itemId: string, isCompleted: boolean) => {
        if (isCompleted) return;
        if (!confirm('확인되었습니다.\n병원에서 진행 상황을 함께 확인합니다.')) return;

        setCompleting(itemId);
        try {
            await completeCareItem(itemId);
            refresh();
        } catch (e) {
            alert('상태 업데이트 실패');
        } finally {
            setCompleting(null);
        }
    }

    // Grouping Logic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processItems = (rawItems: any[]) => {
        const processed: any[] = [];
        const consumedIds = new Set();

        rawItems.forEach(item => {
            if (consumedIds.has(item.id)) return;
            if (item.category === 'MEAL') {
                const meds = rawItems.filter(other =>
                    !consumedIds.has(other.id) && other.category === 'MEDICATION' &&
                    Math.abs(DateTime.fromISO(other.scheduledAt).diff(DateTime.fromISO(item.scheduledAt), 'minutes').minutes) <= 90
                );
                meds.forEach(m => consumedIds.add(m.id));
                processed.push({ ...item, type: 'GROUP_MEAL', children: meds });
                consumedIds.add(item.id);
            } else {
                processed.push(item);
                consumedIds.add(item.id);
            }
        });
        return processed.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    };

    const displayItems = processItems(items || []);

    const { surgery } = useMySurgery(patientId);

    const getDDay = () => {
        if (!surgery) return null;

        // Status-based overrides
        if (surgery.status === 'SURGERY') return { label: '수술중', sub: '현재 수술이 진행 중입니다.', color: 'text-rose-600 animate-pulse' };
        if (surgery.status === 'RECOVERY') return { label: '회복실', sub: '수술 후 회복실에서 안정 중입니다.', color: 'text-orange-500' };
        if (surgery.status === 'WARD') return { label: '병동', sub: '병실로 이동하여 회복 중입니다.', color: 'text-teal-600' };
        if (surgery.status === 'DISCHARGED') return { label: '퇴원', sub: '건강하게 퇴원하셨습니다.', color: 'text-slate-500' };

        const now = DateTime.now();
        const today = now.startOf('day');
        const sDate = DateTime.fromISO(surgery.surgeryDate).startOf('day');
        const diff = sDate.diff(today, 'days').days;
        const dDay = Math.round(diff);

        if (dDay === 0) return { label: 'D-Day', sub: '오늘 예정된 수술이 있습니다.', color: 'text-rose-500' };
        if (dDay > 0) return { label: `D-${dDay}`, sub: '수술 준비중', color: 'text-teal-600' };
        return { label: `D+${Math.abs(dDay)}`, sub: '회복중', color: 'text-blue-500' };
    };

    const dDayInfo = getDDay();

    return (
        <div className="pb-24 min-h-screen bg-slate-50">
            {/* 1. Header (Tabs) */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
                <div className="px-5 py-4 flex justify-between items-center">
                    <h1 className="text-lg font-bold text-slate-800">🏥 나의 일정</h1>
                    <button onClick={onOpenNoti} className="relative p-2 text-slate-600">
                        <span className="text-xl">🔔</span>
                        {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>}
                    </button>
                </div>

                <div className="flex px-4 pb-2 gap-2">
                    <button
                        onClick={() => setActiveTab('OUTPATIENT')}
                        className={clsx(
                            "flex-1 py-2 text-xs font-black rounded-xl transition-all",
                            activeTab === 'OUTPATIENT' ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-400"
                        )}
                    >
                        🚶 외래 진료 경로
                    </button>
                    <button
                        onClick={() => setActiveTab('INPATIENT')}
                        className={clsx(
                            "flex-1 py-2 text-xs font-black rounded-xl transition-all",
                            activeTab === 'INPATIENT' ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-400"
                        )}
                    >
                        🛌 수술 · 입원 케어
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'OUTPATIENT' ? (
                <div className="p-4 space-y-4">
                    {visitSteps && visitSteps.length > 0 ? (
                        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-4 text-xs font-bold">
                                <span className="text-slate-800">🗺️ 오늘의 진료 지도</span>
                                <span className="text-indigo-600">{completedSteps} / {totalSteps} 완료</span>
                            </div>
                            <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {visitSteps.map((step: any) => {
                                    const isCompleted = step.status === 'COMPLETED';
                                    const isCurrent = currentStep?.id === step.id;
                                    return (
                                        <div key={step.id} className="relative pl-8">
                                            <div className={clsx(
                                                "absolute left-0 top-1 w-6 h-6 rounded-full border-4 flex items-center justify-center z-10",
                                                isCompleted ? "bg-indigo-500 border-indigo-100" : isCurrent ? "bg-white border-indigo-500 animate-pulse" : "bg-white border-slate-200"
                                            )}>
                                                {isCompleted ? <span className="text-[10px] text-white">✔</span> : isCurrent ? <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> : null}
                                            </div>
                                            <div className={clsx("p-3 rounded-xl transition-all", isCurrent ? "bg-indigo-50 border border-indigo-100 shadow-sm" : "bg-transparent")}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className={clsx("font-bold text-sm", isCompleted ? "text-slate-400 line-through" : isCurrent ? "text-indigo-900" : "text-slate-600")}>{step.name}</div>
                                                        <div className={clsx("text-[10px] mt-0.5", isCurrent ? "text-indigo-600 font-medium" : "text-slate-400")}>📍 {step.location}</div>
                                                    </div>
                                                </div>
                                                {isCurrent && (
                                                    <button onClick={() => handleStepComplete(step.id)} className="w-full mt-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md active:scale-95 transition-all">방금 도착했어요 (확인)</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <div className="text-4xl mb-4 grayscale opacity-30">🏥</div>
                            <div className="font-bold">예약된 외래 진료가 없습니다.</div>
                            <div className="text-xs mt-1">방문 예약 일정을 확인해 주세요.</div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Surgery Banner */}
                    {dDayInfo ? (
                        <div className="bg-white mx-4 mt-4 p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className={clsx("text-2xl font-black", dDayInfo.color)}>{dDayInfo.label}</span>
                                    <span className="text-sm font-medium text-slate-600">{dDayInfo.sub}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {surgery.surgeryType?.name || '수술'} | {DateTime.fromISO(surgery.surgeryDate).toFormat('M.d a h:mm')}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white mx-4 mt-4 p-4 rounded-xl border border-slate-100 shadow-sm text-center text-sm text-slate-500">
                            등록된 수술 일정이 없습니다.
                        </div>
                    )}

                    {/* Care Date Nav */}
                    <div className="bg-white px-4 py-3 border-y border-slate-200 flex items-center justify-between sticky top-[108px] z-20 shadow-sm">
                        <button onClick={() => setSelectedDate(d => DateTime.fromJSDate(d).minus({ days: 1 }).toJSDate())} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">❮</button>
                        <div className="text-base font-bold text-slate-800">
                            {DateTime.fromJSDate(selectedDate).setLocale('ko').toFormat('M월 d일 (cccc)')}
                            {isToday && <span className="ml-2 text-[10px] bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded">TODAY</span>}
                        </div>
                        <button onClick={() => setSelectedDate(d => DateTime.fromJSDate(d).plus({ days: 1 }).toJSDate())} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">❯</button>
                    </div>

                    {/* Care Items List */}
                    <div className="px-5 pb-10 space-y-4">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />)}
                            </div>
                        ) : displayItems.length === 0 ? (
                            <div className="text-center text-slate-400 py-16">
                                <div className="text-4xl mb-4 grayscale opacity-30">🍵</div>
                                <div className="font-bold">예정된 일정이 없습니다.</div>
                                <div className="text-xs">편안한 휴식을 취하세요.</div>
                            </div>
                        ) : (
                            displayItems.map((item: any) => {
                                const timeStr = DateTime.fromISO(item.scheduledAt).toFormat('HH:mm');
                                const isGroupMeal = item.type === 'GROUP_MEAL';
                                const isDone = item.isCompleted;

                                if (isGroupMeal) {
                                    return (
                                        <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative">
                                            {isDone && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center"><span className="text-slate-400 font-bold border-2 border-slate-200 px-4 py-1 rounded-full text-sm">완료됨</span></div>}
                                            <div className="flex items-start gap-3 mb-2">
                                                <div className="text-2xl">🍚</div>
                                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                    {item.title}
                                                    <span className="text-xs font-normal text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">{timeStr}</span>
                                                </h3>
                                            </div>
                                            {item.children?.map((child: any) => (
                                                <div key={child.id} onClick={() => handleToggle(child.id, child.isCompleted)} className={clsx("flex justify-between items-center p-2 rounded-lg cursor-pointer transition mb-1", child.isCompleted ? "bg-slate-50" : "bg-blue-50/50 hover:bg-blue-50")}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs">💊</span>
                                                        <span className={clsx("text-sm font-medium", child.isCompleted && "text-slate-400 line-through")}>{child.metadata?.drugName || child.title}</span>
                                                    </div>
                                                    {child.isCompleted ? <span className="text-green-500 text-xs">✔</span> : <div className="w-4 h-4 rounded-full border border-blue-300" />}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                const isCritical = item.priority === 'CRITICAL' || ['INJECTION', 'EXAM'].includes(item.category);
                                const icon = item.category === 'INJECTION' ? '💉' : item.category === 'EXAM' ? '🩸' : '🔔';

                                return (
                                    <div key={item.id} className={clsx("bg-white rounded-2xl p-5 shadow-sm border relative transition-all duration-300", isCritical ? "border-l-4 border-l-rose-400" : "border-slate-100")}>
                                        {isDone && <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center"><div className="font-bold text-slate-500 bg-white px-3 py-1 rounded-full shadow border text-sm">완료</div></div>}
                                        <div className="flex items-start gap-3">
                                            <div className="text-xl">{icon}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h3 className="text-base font-bold text-slate-800">{item.title}</h3>
                                                    <span className="text-xs font-bold text-slate-400">{timeStr}</span>
                                                </div>
                                                <p className="text-slate-500 text-sm">{item.description || '일정을 확인해 주세요.'}</p>
                                            </div>
                                        </div>
                                        {!isDone && (
                                            <button onClick={() => handleToggle(item.id, isDone)} disabled={completing === item.id} className="w-full py-3 rounded-xl font-bold text-sm mt-3 bg-slate-900 text-white active:scale-95 transition-all">
                                                {completing === item.id ? '처리중...' : '확인 완료'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
