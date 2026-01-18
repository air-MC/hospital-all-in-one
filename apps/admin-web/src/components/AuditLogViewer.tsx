import useSWR from 'swr'
import axios from 'axios'
import { DateTime } from 'luxon'
import clsx from 'clsx'

import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export const AuditLogViewer = () => {
    const { data: logs, error, isLoading } = useSWR(`${API_URL}/booking/audit-logs?limit=100`, fetcher, {
        refreshInterval: 10000
    });

    if (isLoading) return <div className="flex items-center justify-center h-64 text-slate-400">📝 로그를 불러오는 중...</div>;
    if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-xl border border-red-100">감사 로그를 가져오지 못했습니다.</div>;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-black text-slate-800">보안 감사 로그 (Security Audit Trail)</h3>
                    <p className="text-xs text-slate-500 mt-1 italic">시스템 내의 모든 데이터 변경 이력을 기록합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        LIVE MONITORING
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 text-slate-400 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                            <th className="px-8 py-4">시간</th>
                            <th className="px-6 py-4">작업</th>
                            <th className="px-6 py-4">대상 테이블</th>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">담당자</th>
                            <th className="px-6 py-4">상세 내용 (JSON)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {logs && logs.length > 0 ? (
                            logs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">
                                                {DateTime.fromISO(log.createdAt).toFormat('yyyy-MM-dd')}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {DateTime.fromISO(log.createdAt).toFormat('HH:mm:ss')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black",
                                            log.action === 'CREATE' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                                log.action === 'STATUS_CHANGE' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                    log.action === 'DELETE' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                                        "bg-slate-100 text-slate-500"
                                        )}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-md">
                                            {log.entityTable}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                                        {log.entityId}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                {log.actor?.username?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">
                                                {log.actor?.username || 'SYSTEM'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-[300px] overflow-hidden">
                                            <pre className="text-[10px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 truncate group-hover:whitespace-pre-wrap group-hover:overflow-visible transition-all">
                                                {log.newValue || log.oldValue || '-'}
                                            </pre>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-slate-400 italic text-sm">기록된 감사 로그가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between items-center font-medium">
                <span>Showing last 100 audit entries</span>
                <span>Security Audit Trail v1.0</span>
            </div>
        </div>
    );
};
