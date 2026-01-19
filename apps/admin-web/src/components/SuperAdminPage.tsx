import { useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { getApiUrl } from '../utils/api';
import clsx from 'clsx';
import { DateTime } from 'luxon';

const API_URL = getApiUrl();
const fetcher = (url: string) => axios.get(url).then(res => res.data);

export const SuperAdminPage = () => {
    const { data: hospitals, mutate } = useSWR(`${API_URL}/hospital/all`, fetcher);

    // New Hospital State
    const [newHospitalName, setNewHospitalName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // New Admin Modal State
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [selectedHospitalForAdmin, setSelectedHospitalForAdmin] = useState<any>(null);
    const [adminForm, setAdminForm] = useState({
        username: '',
        name: '',
        password: ''
    });

    const handleCreateHospital = async () => {
        if (!newHospitalName) return;
        setIsCreating(true);
        try {
            await axios.post(`${API_URL}/hospital/create`, { name: newHospitalName });
            alert('✅ 병원이 생성되었습니다.');
            setNewHospitalName('');
            mutate();
        } catch (e) {
            alert('병원 생성 실패');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateAdmin = async () => {
        if (!selectedHospitalForAdmin || !adminForm.username || !adminForm.name) return;
        try {
            await axios.post(`${API_URL}/hospital/admin/create`, {
                hospitalId: selectedHospitalForAdmin.id,
                username: adminForm.username,
                name: adminForm.name,
                password: adminForm.password || '1234'
            });
            alert(`✅ 관리자 계정이 생성되었습니다.\nID: ${adminForm.username}\nPW: ${adminForm.password || '1234'}`);
            setAdminModalOpen(false);
            setAdminForm({ username: '', name: '', password: '' });
        } catch (e: any) {
            if (e.response?.status === 409) {
                alert('❌ 이미 사용 중인 아이디입니다.');
            } else {
                alert('관리자 생성 실패');
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
                    <div className="text-white/60 font-medium mb-1 text-sm uppercase tracking-wider">Total Hospitals</div>
                    <div className="text-4xl font-black">{hospitals?.length || 0}</div>
                    <div className="text-white/40 text-xs mt-2">운영 중인 전체 병원</div>
                </div>
                <div className="col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">🏥 병원 네트워크 관리</h2>
                        <p className="text-slate-500 text-sm">신규 지점을 개설하고 각 지점의 관리자 계정을 발급합니다.</p>
                    </div>
                    <div className="flex gap-3">
                        <input
                            value={newHospitalName}
                            onChange={(e) => setNewHospitalName(e.target.value)}
                            placeholder="신규 병원명 입력 (예: 부산지점)"
                            className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 min-w-[300px] outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                        />
                        <button
                            onClick={handleCreateHospital}
                            disabled={isCreating || !newHospitalName}
                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isCreating ? '생성 중...' : '병원 개설'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hospital List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <span>🏢</span> 등록된 병원 목록
                    </h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {!hospitals ? (
                        <div className="p-12 text-center text-slate-400">Loading...</div>
                    ) : hospitals.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">등록된 병원이 없습니다.</div>
                    ) : (
                        hospitals.map((hospital: any) => (
                            <div key={hospital.id} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-5">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border-2",
                                        hospital.isMain ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-white border-slate-100 text-slate-400"
                                    )}>
                                        {hospital.name[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black text-lg text-slate-800">{hospital.name}</h4>
                                            {hospital.isMain && <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">HEADQUARTERS</span>}
                                            <span className={clsx(
                                                "text-[10px] px-2 py-0.5 rounded font-bold border",
                                                hospital.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>{hospital.status}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1 flex gap-3 font-medium">
                                            <span>📅 개설일: {DateTime.fromISO(hospital.createdAt).toFormat('yyyy.MM.dd')}</span>
                                            <span>👥 환자: {hospital._count?.patients || 0}명</span>
                                            <span>🩺 의료진: {hospital._count?.users || 0}명</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedHospitalForAdmin(hospital);
                                            setAdminModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                    >
                                        🔑 관리자 계정 발급
                                    </button>
                                    {!hospital.isMain && (
                                        <button
                                            onClick={async () => {
                                                if (!confirm(`정말로 "${hospital.name}"을(를) 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 해당 병원의 모든 데이터(환자, 의료진, 예약 등)가 영구 삭제됩니다.`)) {
                                                    return;
                                                }
                                                try {
                                                    await axios.post(`${API_URL}/hospital/delete`, { hospitalId: hospital.id });
                                                    alert('✅ 병원이 삭제되었습니다.');
                                                    mutate();
                                                } catch (e: any) {
                                                    alert(e.response?.data?.message || '삭제 실패');
                                                }
                                            }}
                                            className="px-4 py-2 bg-white border-2 border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:border-rose-500 hover:bg-rose-50 transition-all"
                                        >
                                            🗑️ 삭제
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Admin Creation Modal */}
            {adminModalOpen && selectedHospitalForAdmin && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-[480px] rounded-3xl shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">관리자 계정 생성</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    <span className="font-bold text-indigo-600">{selectedHospitalForAdmin.name}</span>의 관리자 계정을 발급합니다.
                                </p>
                            </div>
                            <button onClick={() => setAdminModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1.5 block">관리자 이름</label>
                                <input
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold"
                                    placeholder="예: 김관리"
                                    value={adminForm.name}
                                    onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1.5 block">로그인 ID</label>
                                <input
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold"
                                    placeholder="예: admin_busan"
                                    value={adminForm.username}
                                    onChange={e => setAdminForm({ ...adminForm, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1.5 block">비밀번호 (기본값: 1234)</label>
                                <input
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold"
                                    placeholder="변경 시 입력"
                                    type="password"
                                    value={adminForm.password}
                                    onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setAdminModalOpen(false)}
                                className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateAdmin}
                                className="flex-1 py-3.5 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                            >
                                계정 발급하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
