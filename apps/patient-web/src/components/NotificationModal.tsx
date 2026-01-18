import clsx from 'clsx';
import { DateTime } from 'luxon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NotificationModal = ({ isOpen, onClose, notifications, onRead }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden max-h-[70vh] flex flex-col relative animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">🔔 알림함</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300">✕</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3 bg-white flex-grow">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {notifications.length === 0 ? (
                        <div className="text-center py-12 text-slate-300">
                            <div className="text-4xl mb-2">📭</div>
                            <div>새로운 알림이 없습니다</div>
                        </div>
                    ) : (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        notifications.map((n: any) => (
                            <div
                                key={n.id}
                                onClick={() => onRead(n.id)}
                                className={clsx(
                                    "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
                                    n.isRead ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-teal-100 shadow-teal-100/50 shadow-md"
                                )}
                            >
                                {!n.isRead && <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>}
                                <div className="flex justify-between mb-1 pl-2">
                                    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", n.isRead ? "bg-slate-200 text-slate-500" : "bg-rose-100 text-rose-500")}>
                                        {n.isRead ? 'Read' : 'New'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {DateTime.fromISO(n.sentAt).setLocale('ko').toRelative()}
                                    </span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm pl-2 group-hover:text-teal-600 transition-colors">{n.title}</h4>
                                <p className="text-xs text-slate-500 mt-1 pl-2 leading-relaxed">{n.message}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
