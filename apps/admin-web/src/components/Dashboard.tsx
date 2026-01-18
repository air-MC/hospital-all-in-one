import useSWR from 'swr'
import axios from 'axios'
import { DateTime } from 'luxon'
import clsx from 'clsx'

const getApiUrl = () => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    url = url.replace(/\/$/, '');
    if (!url.startsWith('http')) {
        url = (url.includes('localhost') || url.includes('127.0.0.1')) ? `http://${url}` : `https://${url}`;
    }
    return url;
};
const API_URL = getApiUrl();
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export const Dashboard = () => {
    const { data: stats, error, isLoading } = useSWR(`${API_URL}/booking/stats`, fetcher, {
        refreshInterval: 5000,
        onError: (err) => console.error('[Dashboard] Stats fetch error:', err)
    });

    if (isLoading) return <div className="flex items-center justify-center h-64 text-slate-400">📊 데이터를 불러오는 중...</div>;
    if (error) {
        return (
            <div className="p-8 bg-red-50 text-red-600 rounded-xl border border-red-100 mb-4">
                <p className="font-bold">통계 데이터를 가져오지 못했습니다.</p>
                <p className="text-xs mt-1 opacity-70">URL: {API_URL}/booking/stats</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
                >다시 시도</button>
            </div>
        );
    }

    const today = stats?.today || { totalAppointments: 0, checkedIn: 0, progress: 0 };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* 1. Metric Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Appointments Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl text-xl">📅</span>
                            <h3 className="font-bold text-slate-500 text-sm">금일 전체 예약</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-800">{today.totalAppointments}</span>
                            <span className="text-slate-400 text-sm font-medium">건</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-blue-600">
                            <span>UP FROM YESTERDAY</span>
                            <span className="bg-blue-50 px-1.5 py-0.5 rounded">↑ 12%</span>
                        </div>
                    </div>
                </div>

                {/* Checked-In Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-xl">✅</span>
                            <h3 className="font-bold text-slate-500 text-sm">내원 완료 환자</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-800">{today.checkedIn}</span>
                            <span className="text-slate-400 text-sm font-medium">명</span>
                        </div>
                        <div className="mt-4">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-0.5">
                                <span>오늘 목표 달성률</span>
                                <span className="text-emerald-600">{today.progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${today.progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Surgery/Admission Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl text-xl">🩺</span>
                            <h3 className="font-bold text-slate-500 text-sm">현재 입원/수술 중</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-800">{stats?.activeSurgeries || 0}</span>
                            <span className="text-slate-400 text-sm font-medium">명</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-rose-600">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                                실시간 운영 현황
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Middle Row: Charts & Detailed Lists placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity (Live Feed) */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <span>📡</span> 실시간 시스템 로그
                        </h3>
                        <button className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold px-3 py-1.5 rounded-full border transition-all">전체보기</button>
                    </div>
                    <div className="space-y-4">
                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((log: any) => (
                                <div key={log.id} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className={clsx(
                                        "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg",
                                        log.action === 'CREATE' ? "bg-blue-50 text-blue-500" :
                                            log.action === 'STATUS_CHANGE' ? "bg-amber-50 text-amber-500" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {log.action === 'CREATE' ? '🆕' : log.action === 'STATUS_CHANGE' ? '⚡' : '📝'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-sm font-bold text-slate-700 truncate">
                                                {log.entityTable} <span className="text-slate-400 font-medium">#{log.entityId.slice(0, 8)}</span>
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                {DateTime.fromISO(log.createdAt).toFormat('HH:mm:ss')}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-500 leading-tight">
                                            <span className="font-bold text-slate-600">{log.action}</span> 작업이 수행되었습니다.
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-slate-400 italic text-sm">최근 활동이 없습니다.</div>
                        )}
                    </div>
                </div>

                {/* Patient Flow Visualization Placeholder */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="font-black text-xl mb-1">Clinic Performance</h3>
                                <p className="text-xs text-slate-400 font-medium">실시간 병원 운영 효율 지표</p>
                            </div>
                            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                                📈 <span className="font-black ml-1">Optimal</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Dummy Chart Rows with CSS bars */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold px-1">
                                    <span className="text-slate-400 uppercase tracking-tighter">Efficiency</span>
                                    <span>84%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-[2px]">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full" style={{ width: '84%' }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold px-1">
                                    <span className="text-slate-400 uppercase tracking-tighter">Satisfaction</span>
                                    <span>92%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-[2px]">
                                    <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full" style={{ width: '92%' }}></div>
                                </div>
                            </div>

                            <div className="pt-6 grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-500 mb-1 uppercase">Avg. Wait</span>
                                    <span className="text-2xl font-black text-blue-400">14<span className="text-xs ml-0.5 text-slate-300">m</span></span>
                                </div>
                                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-500 mb-1 uppercase">No-Show</span>
                                    <span className="text-2xl font-black text-rose-400">2.4<span className="text-xs ml-0.5 text-slate-300">%</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
