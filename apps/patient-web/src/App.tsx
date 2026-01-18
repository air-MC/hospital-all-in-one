import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { BookingScreen } from './components/BookingScreen'
import { CareScreen } from './components/CareScreen'
import { NotificationModal } from './components/NotificationModal'
import { useNotifications } from './hooks/useCareManager'
import clsx from 'clsx'

const PatientHome = ({ patientId }: { patientId: string }) => {
  const [tab, setTab] = useState<'BOOKING' | 'CARE'>('BOOKING')
  const [showNoti, setShowNoti] = useState(false)
  const { notifications, markRead } = useNotifications(patientId);
  const unreadCount = notifications ? notifications.filter((n: any) => !n.isRead).length : 0;

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl overflow-hidden border-x border-slate-200 relative font-sans">
      <NotificationModal
        isOpen={showNoti}
        onClose={() => setShowNoti(false)}
        notifications={notifications}
        onRead={markRead}
      />

      <div className="h-full overflow-y-auto custom-scrollbar pt-0 text-slate-900">
        {tab === 'BOOKING' ?
          <BookingScreen patientId={patientId} /> :
          <CareScreen patientId={patientId} onOpenNoti={() => setShowNoti(true)} unreadCount={unreadCount} />
        }
      </div>

      <div className="fixed max-w-md mx-auto bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-white/20 rounded-full flex justify-around p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-30">
        <button
          onClick={() => setTab('BOOKING')}
          className={clsx("flex-1 flex flex-col items-center py-2 px-4 rounded-full transition-all duration-300",
            tab === 'BOOKING' ? "bg-slate-900 text-white shadow-lg transform -translate-y-1" : "text-slate-400 hover:bg-slate-50")}
        >
          <span className="text-xl mb-0.5">📅</span>
          {tab === 'BOOKING' && <span className="text-[10px] font-bold animate-in fade-in zoom-in">예약하기</span>}
        </button>
        <button
          onClick={() => setTab('CARE')}
          className={clsx("flex-1 flex flex-col items-center py-2 px-4 rounded-full transition-all duration-300",
            tab === 'CARE' ? "bg-slate-900 text-white shadow-lg transform -translate-y-1" : "text-slate-400 hover:bg-slate-50")}
        >
          <span className="text-xl mb-0.5">❤️</span>
          {tab === 'CARE' && <span className="text-[10px] font-bold animate-in fade-in zoom-in">나의 일정</span>}
        </button>
      </div>
    </div>
  );
};

function App() {
  const [patientId, setPatientId] = useState<string | null>(null)

  if (!patientId) {
    return <LoginScreen onLogin={setPatientId} />
  }

  return <PatientHome patientId={patientId} />;
}

export default App
