import { useState, useEffect } from 'react'
import { SurgeryManager } from './components/SurgeryManager'
import { CarePlanEditor } from './components/CarePlanEditor'
import { SlotManager } from './components/SlotManager'
import { VisitGuideManager } from './components/VisitGuideManager'
import { Dashboard } from './components/Dashboard'
import { AuditLogViewer } from './components/AuditLogViewer'
import { getActiveSurgeries } from './hooks/useCareManager'
import clsx from 'clsx'
import { DateTime } from 'luxon'

// Room Definitions (Static Structure)
const ROOM_DEFS = [
  { room: '501호', type: '1인실', capacity: 1 },
  { room: '502호', type: '2인실', capacity: 2 },
  { room: '503호', type: '4인실', capacity: 4 },
  { room: '504호', type: '4인실', capacity: 4 },
  { room: '505호', type: '4인실', capacity: 4 },
  { room: '301호', type: '수술대기실', capacity: 4 },
  { room: '302호', type: '회복실', capacity: 4 },
  { room: '303호', type: '수술실', capacity: 1 },
  { room: 'ICU', type: '중환자실', capacity: 2 }
];

function App() {
  const [activeMenu, setActiveMenu] = useState<'DASHBOARD' | 'SURGERY' | 'CARE' | 'SLOTS' | 'GUIDE' | 'LOGS'>('DASHBOARD')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedPatientSurgery, setSelectedPatientSurgery] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wardData, setWardData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [unassignedList, setUnassignedList] = useState<any[]>([]);

  // Fetch Active Surgeries & Map to Rooms
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const surgeries = await getActiveSurgeries();

        // 1. Separate Assigned vs Unassigned
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assigned = surgeries.filter((s: any) => s.roomNumber);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unassigned = surgeries.filter((s: any) => !s.roomNumber);

        setUnassignedList(unassigned);

        // 2. Map surgeries to rooms
        const definedRooms = ROOM_DEFS.map(def => def.room);

        // Find assigned surgeries that are in rooms NOT defined in ROOM_DEFS
        const dynamicRooms = assigned.reduce((acc: any[], s: any) => {
          if (!definedRooms.includes(s.roomNumber) && !acc.some(r => r.room === s.roomNumber)) {
            acc.push({ room: s.roomNumber, type: '기타/임시', capacity: 10 }); // High capacity for temp/dynamic rooms
          }
          return acc;
        }, []);

        const mergedRooms = [...ROOM_DEFS, ...dynamicRooms];

        const newWardData = mergedRooms.map(def => {
          // Find surgeries assigned to this room
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const occupants = assigned.filter((s: any) => s.roomNumber === def.room);

          const beds = Array.from({ length: Math.max(def.capacity, occupants.length) }).map((_, i) => {
            const occupant = occupants[i];
            return occupant ? {
              id: occupant.id,
              status: 'OCCUPIED',
              patientName: occupant.patient?.name || occupant.patientId,
              surgery: occupant
            } : { id: `empty_${def.room}_${i}`, status: 'EMPTY' };
          });

          return { ...def, beds };
        });
        setWardData(newWardData);
      } catch (e) {
        console.error("Failed to fetch ward data", e);
      }
    };

    fetchWards();
    const interval = setInterval(fetchWards, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePatientClick = (surgery: any) => {
    if (surgery) {
      setSelectedPatientSurgery(surgery);
      setActiveMenu('CARE');
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20 shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">Admin System</h1>
            <div className="text-[10px] text-slate-400">Surgery & Care Manager</div>
          </div>
        </div>

        {/* Main Menus */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Management</div>
          <ul className="space-y-1 px-2">
            <li>
              <button
                onClick={() => setActiveMenu('DASHBOARD')}
                className={clsx("w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all",
                  activeMenu === 'DASHBOARD' ? "bg-indigo-600 text-white shadow-md font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white")}
              >
                <span>📊</span> 운영 현황 대시보드
              </button>
            </li>
            <div className="h-4"></div>
            <li>
              <button
                onClick={() => setActiveMenu('SURGERY')}
                className={clsx("w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all",
                  activeMenu === 'SURGERY' ? "bg-teal-600 text-white shadow-md font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white")}
              >
                <span>🩺</span> 수술 등록 및 관리
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveMenu('CARE')}
                className={clsx("w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all",
                  activeMenu === 'CARE' ? "bg-rose-600 text-white shadow-md font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white")}
              >
                <span>📋</span> 통합 케어 플랜 현황
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveMenu('SLOTS')}
                className={clsx("w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all",
                  activeMenu === 'SLOTS' ? "bg-blue-600 text-white shadow-md font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white")}
              >
                <span>📅</span> 외래 예약 관리
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveMenu('GUIDE')}
                className={clsx("w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all",
                  activeMenu === 'GUIDE' ? "bg-emerald-600 text-white shadow-md font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white")}
              >
                <span>🧭</span> 외래 경로 관리
              </button>
            </li>
            <div className="h-4"></div>
            <li>
              <button
                onClick={() => setActiveMenu('LOGS')}
                className={clsx("w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all",
                  activeMenu === 'LOGS' ? "bg-slate-700 text-white shadow-md font-bold" : "text-slate-500 hover:bg-slate-800 hover:text-white")}
              >
                <span>🛡️</span> 보안 감사 로그
              </button>
            </li>
          </ul>

          {/* Waiting List Section (Unassigned) */}
          <div className="mt-8 px-4 mb-2 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Waiting Admission</span>
            <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">{unassignedList.length}</span>
          </div>
          <div className="px-2 space-y-2 mb-6">
            {unassignedList.length === 0 ? (
              <div className="text-[10px] text-slate-600 px-2 italic">대기 환자 없음</div>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              unassignedList.map((surgery: any) => {
                const admitDate = DateTime.fromISO(surgery.admissionDate);
                const diff = admitDate.diffNow('days').days;
                const isUrgent = diff <= 1 && diff > -1; // Tomorrow or today
                const isToday = diff <= 0 && diff > -1;

                return (
                  <div
                    key={surgery.id}
                    onClick={() => handlePatientClick(surgery)}
                    className={clsx(
                      "p-3 rounded-lg border cursor-pointer group transition-all relative overflow-hidden",
                      isUrgent ? "bg-amber-50 border-amber-200 hover:bg-amber-100" : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-700"
                    )}
                  >
                    {isUrgent && (
                      <div className={clsx("absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold rounded-bl-lg z-10",
                        isToday ? "bg-red-500 text-white animate-pulse" : "bg-amber-400 text-amber-900"
                      )}>
                        {isToday ? "🚨 오늘 입원" : "🔔 내일 입원"}
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-1 mt-1">
                      <span className={clsx("font-bold text-xs group-hover:text-white transition",
                        isUrgent ? "text-slate-800" : "text-slate-300"
                      )}>{surgery.patient.name}</span>
                      {!isUrgent && <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-500 border border-amber-900/30">미배정</span>}
                    </div>
                    <div className={clsx("text-[10px] truncate", isUrgent ? "text-slate-600" : "text-slate-500")}>
                      {surgery.surgeryType?.name}
                    </div>
                    {isUrgent && <div className="text-[10px] text-amber-700 mt-1 font-bold">👉 병실 배정 필요</div>}
                  </div>
                )
              })
            )}
          </div>

          {/* Ward Info Section */}
          <div className="px-4 mb-2 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Ward Status</span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Live</span>
          </div>

          <div className="px-2 space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {wardData.map((room: any) => (
              <div key={room.room} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-300 text-xs">{room.room} <span className="text-[10px] font-normal opacity-50">({room.type})</span></span>
                </div>
                <div className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {room.beds.map((bed: any) => (
                    <div key={bed.id}
                      onClick={() => bed.status === 'OCCUPIED' && handlePatientClick(bed.surgery)}
                      className={clsx("p-2 rounded border text-xs flex justify-between items-center cursor-pointer transition",
                        bed.status === 'OCCUPIED' ? "bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500 group" : "bg-transparent border-slate-800 text-slate-600")}
                    >
                      {bed.status === 'OCCUPIED' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="font-bold text-white group-hover:text-teal-300 truncate max-w-[80px]">
                              {bed.patientName}
                            </span>
                          </div>
                          <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border ml-1 shrink-0",
                            bed.surgery?.status === 'SURGERY' ? "bg-red-900/30 border-red-800 text-red-400" :
                              bed.surgery?.status === 'RECOVERY' ? "bg-blue-900/30 border-blue-800 text-blue-400" :
                                "bg-amber-900/30 border-amber-800 text-amber-400"
                          )}>{bed.surgery?.status || 'SCHED'}</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                          <span>(Empty)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          v2.4.0 (Security Enabled)
        </div>
      </aside>

      {/* 2. RIGHT CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {activeMenu === 'DASHBOARD' ? '📊 운영 현황 대시보드' :
              activeMenu === 'SURGERY' ? '🩺 수술 등록 및 스케줄 관리' :
                activeMenu === 'SLOTS' ? '📅 외래 진료 예약 현황' :
                  activeMenu === 'GUIDE' ? '🧭 외래 경로 관리' :
                    activeMenu === 'LOGS' ? '🛡️ 보안 감사 로그' :
                      '📋 환자별 케어 플랜 상세'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 bg-slate-50 py-1 px-3 rounded-full border">
              {new Date().toLocaleDateString()}
            </span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">A</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeMenu === 'DASHBOARD' && (
            <div className="max-w-6xl mx-auto">
              <Dashboard />
            </div>
          )}

          {activeMenu === 'SURGERY' && (
            <div className="max-w-5xl mx-auto">
              <SurgeryManager onSelectSurgery={handlePatientClick} />
            </div>
          )}

          {activeMenu === 'SLOTS' && (
            <div className="max-w-6xl mx-auto">
              <SlotManager />
            </div>
          )}

          {activeMenu === 'GUIDE' && (
            <div className="max-w-6xl mx-auto">
              <VisitGuideManager />
            </div>
          )}

          {activeMenu === 'LOGS' && (
            <div className="max-w-6xl mx-auto">
              <AuditLogViewer />
            </div>
          )}

          {activeMenu === 'CARE' && (
            <div className="h-full">
              {selectedPatientSurgery ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <CarePlanEditor surgery={selectedPatientSurgery} onClose={() => setSelectedPatientSurgery(null)} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="text-6xl mb-4 opacity-50">👈</div>
                  <p className="text-lg font-medium">좌측 병실 현황에서 환자를 선택해주세요.</p>
                  <p className="text-sm opacity-70 mt-2">입원 중인 환자의 케어 플랜을 통합 관리할 수 있습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
