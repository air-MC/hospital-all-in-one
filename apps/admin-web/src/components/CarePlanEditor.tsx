import { useState, useEffect } from 'react';
import { addCareItem, deleteCareItem, updateCareItem, updateSurgeryStatus, assignWard } from '../hooks/useCareManager';
import { DateTime } from 'luxon';
import useSWR from 'swr';
import axios from 'axios';
import clsx from 'clsx';
import { DndContext, useDraggable, useDroppable, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const fetcher = (url: string) => axios.get(url).then(res => res.data);

// Draggable Item Component
const DraggableCareItem = ({ item, status, onDelete }: { item: any, status: string, onDelete: (e: any) => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: { item }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={clsx(
                "text-[10px] p-1 rounded border mb-1 shadow-sm flex flex-col justify-start group/item transition-colors relative touch-none select-none",
                status === 'COMPLETED' ? "bg-slate-50 border-slate-200" :
                    status === 'OVERDUE' ? "bg-red-50 border-red-200 border-l-2 border-l-red-500" :
                        item.priority === 'CRITICAL' ? "bg-white border-l-2 border-l-orange-300" :
                            "bg-white border-l-2 border-l-slate-300"
            )}>
            <div className="flex justify-between items-start w-full">
                <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1">
                        <span className={clsx("font-bold",
                            item.category === 'MEDICATION' ? "text-blue-600" :
                                item.category === 'INJECTION' ? "text-rose-600" :
                                    item.category === 'MEAL' ? "text-orange-600" : "text-slate-700"
                        )}>
                            {item.category === 'MEDICATION' ? '💊' :
                                item.category === 'INJECTION' ? '💉' :
                                    item.category === 'MEAL' ? '🍚' : '🟣'}
                        </span>
                        <span className={clsx("font-bold truncate break-all transition-all duration-300",
                            status === 'COMPLETED' ? "text-slate-400 line-through decoration-slate-400 decoration-2" : "text-slate-800"
                        )}>
                            {item.title}
                        </span>
                    </div>
                </div>
                <button
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on delete button
                    onClick={(e) => onDelete(e)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition px-1 -mr-1"
                >x</button>
            </div>
        </div>
    );
};

// Droppable Cell Component
const DroppableCell = ({ date, slot, children, onAddClick, className }: any) => {
    const cellId = `cell_${DateTime.fromJSDate(date).toFormat('yyyy-MM-dd')}_${slot.id}`;
    const { setNodeRef, isOver } = useDroppable({
        id: cellId,
        data: { date, slot }
    });

    return (
        <div ref={setNodeRef}
            className={clsx(
                "p-1.5 border-r border-b min-h-[100px] transition relative group align-top",
                isOver ? "bg-teal-100 ring-2 ring-inset ring-teal-500" : "hover:bg-teal-50",
                className
            )}
        >
            <div className="space-y-1 h-full pb-6">
                {children}
            </div>
            {/* Add Button Area (Click handling wrapper) */}
            <div
                className="absolute inset-0 z-0 bg-transparent hover:bg-black/5 cursor-pointer transition-colors"
                onClick={() => onAddClick(date, slot)}
                title="클릭하여 케어 세트 추가"
            />
            {/* Hover Hint */}
            <div className="absolute bottom-1 right-1 pointer-events-none opacity-0 group-hover:opacity-100 transition">
                <span className="text-[10px] text-teal-600 font-bold bg-white px-1 rounded shadow">+ 추가</span>
            </div>
        </div>
    );
}

// --- Bulk Add Modal Component ---
const BulkAddModal = ({ isOpen, onClose, slot, onSave, existingItems, onDeleteItem }: any) => {
    // If existing items are passed, we are in "Edit Mode"
    const [pendingItems, setPendingItems] = useState<any[]>(existingItems ? [...existingItems] : []);

    // Presets
    const PRESETS = {
        MEDICATION: [
            { title: '타이레놀 500mg', desc: '해열 진통제', metadata: { drugName: '타이레놀', dosage: '500mg', criteria: '식후 30분', precautions: '하루 3회 초과 금지', patientGuide: '열이 나거나 아플 때 드세요.' } },
            { title: '세파클러 캡슐', desc: '항생제', metadata: { drugName: '세파클러', dosage: '250mg', criteria: '식후 30분', precautions: '끝까지 복용하세요', patientGuide: '염증을 치료하는 약입니다.' } },
            { title: '마그밀 정', desc: '변비약', metadata: { drugName: '마그밀', dosage: '1T', criteria: '취침 전', precautions: '물을 많이 드세요', patientGuide: '배변 활동을 돕습니다.' } },
        ],
        INJECTION: [
            { title: '인슐린 주사', desc: '혈당 조절', metadata: { precautions: '주사 부위 소독 필수', patientGuide: '자가 주사 시 바늘을 재사용하지 마세요.' } },
            { title: '항생제 주사', desc: '정맥 주사', metadata: { precautions: '알레르기 반응 관찰', patientGuide: '간호사가 투여합니다.' } },
            { title: '영양제 수액', desc: '비타민', metadata: { precautions: '속도 조절 필요', patientGuide: '2시간 정도 소요됩니다.' } },
        ],
        MEAL: [
            { title: '일반식', desc: '균형 잡힌 식단', metadata: { patientGuide: '꼭꼭 씹어 드세요.' } },
            { title: '죽 (연식)', desc: '소화가 잘 되는 식사', metadata: { patientGuide: '천천히 드세요.' } },
            { title: '금식 (NPO)', desc: '물 포함 금지', metadata: { precautions: '검사 전까지 금식 유지', patientGuide: '정확한 검사를 위해 협조해주세요.' } },
        ],
        TREATMENT: [
            { title: '드레싱 (소독)', desc: '상처 부위 소독', metadata: { patientGuide: '따가울 수 있습니다.' } },
            { title: '체온/혈압 측정', desc: '바이탈 체크', metadata: { patientGuide: '편안한 상태로 계세요.' } },
        ]
    };

    const addItem = (category: string, preset?: any) => {
        const newItem = {
            id: Date.now() + Math.random(), // Temp ID
            isNew: true,
            category,
            title: preset ? preset.title : (category === 'MEAL' ? '일반식' : ''),
            description: preset ? preset.desc : '',
            priority: 'NORMAL',
            metadata: preset?.metadata || { precautions: '', patientGuide: '' }
        };
        setPendingItems([...pendingItems, newItem]);
    };

    const updateItem = (id: number, field: string, value: string) => {
        setPendingItems(items => items.map(it => it.id === id ? { ...it, [field]: value } : it));
    };

    const updateMetadata = (id: number, key: string, value: string) => {
        setPendingItems(items => items.map(it =>
            it.id === id ? { ...it, metadata: { ...it.metadata, [key]: value } } : it
        ));
    };

    const handleRemove = async (item: any) => {
        if (!item.isNew && onDeleteItem) {
            if (confirm('이 항목을 삭제하시겠습니까? (저장 시 반영됨)')) {
                await onDeleteItem(item.id);
                setPendingItems(items => items.filter(it => it.id !== item.id));
            }
        } else {
            setPendingItems(items => items.filter(it => it.id !== item.id));
        }
    };

    const handleSave = () => {
        onSave(pendingItems);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <span>🏥</span> 케어 세트 관리
                            <span className="text-sm font-normal text-slate-500 bg-white px-2 py-0.5 rounded border">
                                {DateTime.fromJSDate(slot.date).toFormat('M월 d일')} - {slot.timeSlot === 'NIGHT' ? '기타/수시' : slot.timeSlot}
                            </span>
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Presets */}
                    <div className="w-1/3 border-r bg-slate-50 p-4 overflow-y-auto">
                        <h4 className="font-bold text-xs uppercase text-slate-400 mb-3 tracking-wider">자주 쓰는 항목 (Presets)</h4>

                        <div className="space-y-6">
                            {Object.entries(PRESETS).map(([cat, items]) => (
                                <div key={cat}>
                                    <h5 className="font-bold text-sm mb-2 text-slate-700 flex items-center gap-2">
                                        {cat === 'MEDICATION' ? '💊 약물' : cat === 'INJECTION' ? '💉 주사' : cat === 'MEAL' ? '🍚 식사' : '🩹 처치'}
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {items.map((p, i) => (
                                            <button key={i} onClick={() => addItem(cat, p)}
                                                className="text-xs bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-600 px-3 py-2 rounded-lg shadow-sm transition text-left w-full flex justify-between items-center group">
                                                <span>{p.title}</span>
                                                <span className="text-teal-400 opacity-0 group-hover:opacity-100">+</span>
                                            </button>
                                        ))}
                                        <button onClick={() => addItem(cat)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 underline decoration-dotted">
                                            + 직접 추가
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Selected List */}
                    <div className="w-2/3 p-6 bg-white overflow-y-auto">
                        <h4 className="font-bold text-xs uppercase text-slate-400 mb-3 tracking-wider flex justify-between">
                            <span>구성된 항목 ({pendingItems.length})</span>
                            <span className="text-teal-600 font-normal normal-case">수정사항은 저장 시 반영됩니다.</span>
                        </h4>

                        {pendingItems.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="text-4xl mb-2">📥</div>
                                <p>왼쪽에서 항목을 선택하여 추가하세요.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingItems.map((item) => (
                                    <div key={item.id} className="border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition group animate-in slide-in-from-left-2 duration-300">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-xl">
                                                    {item.category === 'MEDICATION' ? '💊' : item.category === 'INJECTION' ? '💉' : item.category === 'MEAL' ? '🍚' : '🩹'}
                                                </span>
                                                <input
                                                    value={item.title}
                                                    onChange={e => updateItem(item.id, 'title', e.target.value)}
                                                    className="font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-teal-500 outline-none w-full"
                                                    placeholder="항목명 입력"
                                                />
                                            </div>
                                            <button onClick={() => handleRemove(item)} className="text-slate-300 hover:text-red-500 px-2" title="삭제">🗑️</button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <label className="block text-[10px] text-slate-400 font-bold mb-1">상세 설명 (의료진용)</label>
                                                <input
                                                    value={item.description || ''}
                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                                                    placeholder="예: 500mg, IV, 식후 즉시"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-teal-600 font-bold mb-1">환자 안심 설명 (앱 표시) ✨</label>
                                                <input
                                                    value={item.metadata?.patientGuide || ''}
                                                    onChange={e => updateMetadata(item.id, 'patientGuide', e.target.value)}
                                                    className="w-full bg-teal-50 border border-teal-100 rounded p-2 text-xs"
                                                    placeholder="예: 열을 내려주는 약입니다."
                                                />
                                            </div>
                                            {['MEDICATION', 'INJECTION'].includes(item.category) && (
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] text-red-400 font-bold mb-1">주의사항 (앱 강조 표시)</label>
                                                    <input
                                                        value={item.metadata?.precautions || ''}
                                                        onChange={e => updateMetadata(item.id, 'precautions', e.target.value)}
                                                        className="w-full bg-red-50 border border-red-100 rounded p-2 text-xs text-red-600 placeholder-red-200"
                                                        placeholder="예: 어지러울 수 있습니다."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition">취소</button>
                    <button onClick={handleSave} className="px-8 py-2.5 rounded-lg font-bold bg-slate-900 text-white hover:bg-black shadow-lg hover:shadow-xl transition transform active:scale-95">
                        변경사항 저장 ({pendingItems.length}개)
                    </button>
                </div>
            </div>
        </div>
    );
};


export const CarePlanEditor = ({ surgery, onClose }: { surgery: any, onClose?: () => void }) => {
    // 1. Data Fetching
    const { data: allItems, mutate } = useSWR(
        surgery.carePlan?.id ? `${API_URL}/care/plans/${surgery.carePlan.id}/items` : null,
        fetcher,
        { refreshInterval: 5000 }
    );

    // Local surgery state override for immediate UI feedback
    const [localSurgery, setLocalSurgery] = useState(surgery);
    useEffect(() => { setLocalSurgery(surgery); }, [surgery]);

    // 2. State for Modal & View
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ date: Date, timeSlot: string, existingItems?: any[] } | null>(null);

    // Drag Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const [activeDragItem, setActiveDragItem] = useState<any>(null);

    // Helpers
    const getItemStatus = (item: any) => {
        if (item.isCompleted) return 'COMPLETED';
        const isOverdue = new Date(item.scheduledAt).getTime() < Date.now() - 30 * 60 * 1000;
        if (isOverdue && item.priority === 'CRITICAL') return 'OVERDUE';
        return 'SCHEDULED';
    }

    const handleStatusUpdate = async (newStatus: string) => {
        if (!confirm(`수술 단계를 '${newStatus}'(으)로 변경하시겠습니까? \n환자 앱 메인 배너에 즉시 반영됩니다.`)) return;
        try {
            await updateSurgeryStatus(localSurgery.id, newStatus);
            setLocalSurgery((prev: any) => ({ ...prev, status: newStatus }));
        } catch (e) {
            alert('상태 변경 실패');
        }
    };

    const handleRoomAssign = async () => {
        const room = prompt('배정할 병실 번호를 입력하세요 (예: 101호)');
        if (!room) return;
        try {
            await assignWard(localSurgery.id, room);
            setLocalSurgery((prev: any) => ({ ...prev, roomNumber: room }));
            alert('✅ 병실이 배정되었습니다.');
        } catch (e) {
            alert('병실 배정 실패');
        }
    };

    // Grid Dates
    const parseDate = (d: any) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        return new Date(d);
    }

    const sDateRaw = parseDate(surgery.surgeryDate);
    const surgeryDate = sDateRaw && !isNaN(sDateRaw.getTime()) ? sDateRaw : new Date();
    const aDateRaw = parseDate(surgery.admissionDate);
    const dDateRaw = parseDate(surgery.dischargeDate);

    const admissionDate = aDateRaw && !isNaN(aDateRaw.getTime())
        ? aDateRaw
        : DateTime.fromJSDate(surgeryDate).minus({ days: 1 }).toJSDate();

    const dischargeDate = dDateRaw && !isNaN(dDateRaw.getTime())
        ? dDateRaw
        : DateTime.fromJSDate(surgeryDate).plus({ days: 3 }).toJSDate();

    const dates: Date[] = [];
    const startDt = DateTime.fromJSDate(admissionDate).startOf('day');
    const endDt = DateTime.fromJSDate(dischargeDate).endOf('day');

    let currDt = startDt;
    const finalDt = endDt > startDt ? endDt : startDt.plus({ days: 1 });

    let safeguard = 0;
    while (currDt <= finalDt && safeguard < 30) {
        dates.push(currDt.toJSDate());
        currDt = currDt.plus({ days: 1 });
        safeguard++;
    }

    const timeSlots = [
        { id: 'MORNING', label: '아침 (06-11)', startHour: 8 },
        { id: 'LUNCH', label: '점심 (11-16)', startHour: 12 },
        { id: 'DINNER', label: '저녁 (16-21)', startHour: 18 },
        { id: 'NIGHT', label: '기타/수시 (21-24, 00-06)', startHour: 22 },
    ];

    const getItemsForCell = (date: Date, slotId: string) => {
        if (!allItems) return [];
        const targetDateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
        return allItems.filter((item: any) => {
            const itemDt = DateTime.fromISO(item.scheduledAt);
            if (itemDt.toFormat('yyyy-MM-dd') !== targetDateStr) return false;
            const h = itemDt.hour;
            if (slotId === 'MORNING' && (h >= 6 && h < 11)) return true;
            if (slotId === 'LUNCH' && (h >= 11 && h < 16)) return true;
            if (slotId === 'DINNER' && (h >= 16 && h < 21)) return true;
            if (slotId === 'NIGHT' && (h >= 21 || h < 6)) return true;
            return false;
        });
    };

    const handleCellClick = (date: Date, slot: any) => {
        const existing = getItemsForCell(date, slot.id);
        setSelectedSlot({ date, timeSlot: slot.id, existingItems: existing });
        setIsModalOpen(true);
    };

    const handleBulkSave = async (items: any[]) => {
        if (!selectedSlot) return;

        const slotDef = timeSlots.find(s => s.id === selectedSlot.timeSlot);
        const baseHour = slotDef ? slotDef.startHour : 9;
        const baseDate = DateTime.fromJSDate(selectedSlot.date).set({ hour: baseHour, minute: 0 });

        try {
            const newItems = items.filter(i => i.isNew);
            for (let i = 0; i < newItems.length; i++) {
                const item = newItems[i];
                const scheduledAt = baseDate.plus({ minutes: i * 5 }).toISO();

                await addCareItem({
                    carePlanId: surgery.carePlan?.id || surgery.id,
                    category: item.category,
                    title: item.title,
                    description: item.description,
                    scheduledAt,
                    priority: item.priority,
                    metadata: item.metadata
                });
            }

            const existingToUpdate = items.filter(i => !i.isNew);
            for (const item of existingToUpdate) {
                await updateCareItem(item.id, {
                    title: item.title,
                    description: item.description,
                    metadata: item.metadata
                });
            }

            mutate();
            setIsModalOpen(false);
            alert('✅ 변경사항이 저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const handleBulkDelete = async (itemId: string) => {
        try {
            await deleteCareItem(itemId);
            mutate();
        } catch (e) {
            console.error(e);
            alert('삭제 실패');
        }
    }

    const handleDelete = async (id: string, _e: any) => {
        if (!confirm('삭제하시겠습니까?')) return;
        await deleteCareItem(id);
        mutate();
    }

    const handleDragStart = (event: any) => {
        setActiveDragItem(event.active.data.current.item);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;
        const parts = over.id.split('_');
        if (parts.length < 3) return;

        const dateStr = parts[1];
        const slotId = parts[2];
        const slotDef = timeSlots.find(s => s.id === slotId);

        if (!slotDef) return;

        const targetDate = DateTime.fromFormat(dateStr, 'yyyy-MM-dd').set({ hour: slotDef.startHour, minute: 0 });

        try {
            await updateCareItem(active.id, {
                scheduledAt: targetDate.toISO()
            });
            mutate();
        } catch (e) {
            console.error(e);
            alert('이동 실패');
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className={clsx(
                "transition-all duration-300 bg-white",
                isFullScreen ? "fixed inset-0 z-50 p-6 overflow-auto shadow-2xl" : "mt-6 bg-slate-50 border-t pt-4 relative"
            )}>
                {/* Header Controls */}
                <div className="flex flex-wrap justify-between items-start mb-6 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                🗓️ {localSurgery.patientId}님의 케어 플랜
                            </h4>
                            {/* Status Badge */}
                            <span className={clsx("px-2 py-0.5 rounded text-xs font-extra-bold border",
                                localSurgery.status === 'SURGERY' ? "bg-red-100 text-red-600 border-red-200 animate-pulse" :
                                    localSurgery.status === 'RECOVERY' ? "bg-orange-100 text-orange-600 border-orange-200" :
                                        "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                                {localSurgery.status || 'SCHEDULED'}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>수술: {DateTime.fromISO(localSurgery.surgeryDate).toFormat('M/d HH:mm')}</span>
                            <span className="text-slate-300">|</span>
                            {localSurgery.roomNumber ? (
                                <span className="font-bold text-teal-600">🏠 {localSurgery.roomNumber}</span>
                            ) : (
                                <button onClick={handleRoomAssign} className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded hover:bg-amber-200 transition font-bold animate-pulse">
                                    🛏️ 병실 배정하기
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {/* Status Controls */}
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                            {['SCHEDULED', 'PRE_OP', 'SURGERY', 'RECOVERY', 'WARD', 'DISCHARGED'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => handleStatusUpdate(st)}
                                    disabled={localSurgery.status === st}
                                    className={clsx(
                                        "text-[10px] px-2 py-1.5 rounded font-bold transition-all",
                                        localSurgery.status === st
                                            ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    {st === 'SCHEDULED' ? '예정' :
                                        st === 'PRE_OP' ? '수술준비' :
                                            st === 'SURGERY' ? '수술중' :
                                                st === 'RECOVERY' ? '회복실' :
                                                    st === 'WARD' ? '병동' : '퇴원'}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => mutate()} className="text-xs px-3 py-1.5 border rounded hover:bg-slate-50" title="새로고침">🔄</button>
                            <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-xs px-3 py-1.5 border rounded hover:bg-slate-50">
                                {isFullScreen ? '🔽 축소' : '⤢ 전체'}
                            </button>
                            {onClose && (
                                <button onClick={onClose} className="text-xs px-3 py-1.5 border rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">
                                    ❌ 닫기
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                    <table className="w-full min-w-[800px] table-fixed">
                        <thead>
                            <tr className="bg-slate-50 border-b">
                                <th className="w-20 p-2 text-xs font-bold text-slate-500 sticky left-0 bg-slate-50 z-10 border-r">날짜</th>
                                {timeSlots.map(slot => (
                                    <th key={slot.id} className="p-2 text-xs font-bold text-slate-600 border-r last:border-r-0">
                                        {slot.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dates.map((date) => {
                                const isOpDay = DateTime.fromJSDate(date).hasSame(DateTime.fromJSDate(surgeryDate), 'day');

                                return (
                                    <tr key={date.toISOString()} className={clsx(isOpDay ? "bg-red-50/30" : "bg-white")}>
                                        <td className="p-2 border-r bg-slate-50 sticky left-0 z-10 text-center">
                                            <div className="text-xs font-bold text-slate-700">{DateTime.fromJSDate(date).toFormat('M/d')}</div>
                                            <div className="text-[10px] text-slate-400">
                                                {DateTime.fromJSDate(date).hasSame(DateTime.fromJSDate(admissionDate), 'day') ? '입원' :
                                                    DateTime.fromJSDate(date).hasSame(DateTime.fromJSDate(dischargeDate), 'day') ? '퇴원' :
                                                        isOpDay ? '수술' : DateTime.fromJSDate(date).toFormat('(ccc)')}
                                            </div>
                                        </td>
                                        {timeSlots.map(slot => {
                                            const items = getItemsForCell(date, slot.id);
                                            return (
                                                <td key={slot.id} className="border-r last:border-r-0 align-top p-0">
                                                    <DroppableCell date={date} slot={slot} onAddClick={handleCellClick} className="space-y-1">
                                                        {items.map((item: any) => (
                                                            <DraggableCareItem key={item.id} item={item} status={getItemStatus(item)} onDelete={(e) => handleDelete(item.id, e)} />
                                                        ))}
                                                    </DroppableCell>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {isModalOpen && selectedSlot && (
                    <BulkAddModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        slot={selectedSlot}
                        onSave={handleBulkSave}
                        existingItems={selectedSlot.existingItems}
                        onDeleteItem={handleBulkDelete}
                    />
                )}

                <DragOverlay>
                    {activeDragItem ? (
                        <div className="w-[200px] opacity-80 rotate-3">
                            <div className="bg-white border-2 border-slate-400 p-2 rounded shadow-xl">
                                <span className="mr-2 text-xl">{activeDragItem.category === 'MEDICATION' ? '💊' : '📅'}</span>
                                <span className="font-bold">{activeDragItem.title}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
};
