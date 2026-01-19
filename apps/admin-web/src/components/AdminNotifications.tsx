import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';
import { DateTime } from 'luxon';
import clsx from 'clsx';

const API_URL = getApiUrl();

export const AdminNotifications = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get(`${API_URL}/booking/notifications/admin`);
            setNotifications(response.data);
            setUnreadCount(response.data.filter((n: any) => !n.isRead).length);

            // Play sound if there are new unread notifications
            if (response.data.some((n: any) => !n.isRead)) {
                playNotificationSound();
            }
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await axios.patch(`${API_URL}/booking/notifications/${id}/read`);
            fetchNotifications();
        } catch (e) {
            console.error('Failed to mark as read', e);
        }
    };

    const playNotificationSound = () => {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 10 seconds for new notifications
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative">
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "relative p-2 rounded-lg transition-all",
                    unreadCount > 0
                        ? "bg-red-100 text-red-600 animate-pulse hover:bg-red-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
            >
                <span className="text-2xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <span>🔔</span>
                            알림 ({unreadCount}개 읽지 않음)
                        </h3>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <p>알림이 없습니다.</p>
                            </div>
                        ) : (
                            notifications.map((noti) => (
                                <div
                                    key={noti.id}
                                    onClick={() => !noti.isRead && markAsRead(noti.id)}
                                    className={clsx(
                                        "p-4 border-b border-slate-100 cursor-pointer transition-all",
                                        noti.isRead
                                            ? "bg-white hover:bg-slate-50"
                                            : "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm">{noti.title}</h4>
                                        {!noti.isRead && (
                                            <span className="bg-red-500 w-2 h-2 rounded-full"></span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600">{noti.message}</p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        {DateTime.fromISO(noti.sentAt).toRelative()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={() => {
                                notifications.filter(n => !n.isRead).forEach(n => markAsRead(n.id));
                            }}
                            className="w-full text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                        >
                            모두 읽음으로 표시
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
