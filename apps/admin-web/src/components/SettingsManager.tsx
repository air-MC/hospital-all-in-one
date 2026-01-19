import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { getDepartments, createDepartment, getDoctors, createDoctor, createSurgeryType, getHospital, updateHospital, updateHospitalStatus } from '../hooks/useAdminSettings';
import { getSurgeryTypes } from '../hooks/useCareManager';

export const SettingsManager = () => {
    const [activeTab, setActiveTab] = useState<'HOSPITAL' | 'DEPT' | 'DOCTOR' | 'SURGERY' | 'SYSTEM'>('HOSPITAL');

    // Data Fetching
    const { data: departments } = useSWR('departments', getDepartments);
    const { data: doctors } = useSWR('doctors', () => getDoctors());
    const { data: surgeryTypes } = useSWR('surgery-types', getSurgeryTypes);
    const { data: hospital, mutate: mutateHospital } = useSWR('hospital', getHospital);

    // Form States
    const [deptName, setDeptName] = useState('');
    const [docName, setDocName] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [hospitalName, setHospitalName] = useState('');

    // System Connection State
    const [apiUrl, setApiUrl] = useState(() => {
        // Initial value from localStorage or detected URL
        const saved = localStorage.getItem('custom_api_url');
        return saved || 'https://hospital-all-in-one-production.up.railway.app';
    });

    // Surgery Type Form State
    const [surgeryForm, setSurgeryForm] = useState({
        id: '',
        name: '',
        type: 'SURGERY',
        isAdmissionRequired: true,
        defaultStayDays: 1,
        isPreOpExamRequired: true
    });

    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deptName) return;
        await createDepartment(deptName);
        mutate('departments');
        setDeptName('');
        alert('진료과가 등록되었습니다.');
    };

    const handleCreateDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!docName || !selectedDeptId) return;
        await createDoctor(docName, selectedDeptId);
        mutate('doctors');
        setDocName('');
        alert('의사가 등록되었습니다.');
    };

    const handleCreateSurgeryType = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createSurgeryType(surgeryForm);
            mutate('surgery-types');
            setSurgeryForm({
                id: '', name: '', type: 'SURGERY', isAdmissionRequired: true, defaultStayDays: 1, isPreOpExamRequired: true
            });
            alert('수술/시술 항목이 등록되었습니다.');
        } catch (e) {
            alert('등록 실패: ID가 중복되거나 입력이 잘못되었습니다.');
        }
    };

    const handleUpdateHospital = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hospital || !hospitalName) return;
        await updateHospital(hospital.id, hospitalName);
        mutateHospital();
        alert('병원 정보가 수정되었습니다.');
    };

    const handleUpdateApiUrl = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiUrl) return;
        // Strip trailing slash
        const cleanUrl = apiUrl.replace(/\/$/, '');
        localStorage.setItem('custom_api_url', cleanUrl);
        alert('API 주소가 저장되었습니다. 페이지를 새로고침합니다.');
        window.location.reload();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header / Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-100 overflow-x-auto">
                    <button onClick={() => setActiveTab('HOSPITAL')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'HOSPITAL' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>🏢 병원 정보</button>
                    <button onClick={() => setActiveTab('DEPT')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'DEPT' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>🏥 진료과</button>
                    <button onClick={() => setActiveTab('DOCTOR')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'DOCTOR' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>👨‍⚕️ 의료진</button>
                    <button onClick={() => setActiveTab('SURGERY')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'SURGERY' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>🩺 수술관리</button>
                    <button onClick={() => setActiveTab('SYSTEM')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'SYSTEM' ? 'bg-slate-800 text-white border-b-2 border-slate-600' : 'text-slate-500 hover:bg-slate-50'}`}>🔌 시스템 연결</button>
                </div>

                <div className="p-8">
                    {/* --- HOSPITAL TAB --- */}
                    {activeTab === 'HOSPITAL' && (
                        <div className="max-w-xl mx-auto">
                            <h3 className="font-bold text-lg mb-6">병원 기본 정보 관리</h3>
                            {hospital ? (
                                <form onSubmit={handleUpdateHospital} className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Hospital ID (System)</label>
                                        <div className="font-mono text-xs bg-slate-200 p-2 rounded text-slate-600 selection:bg-indigo-200">
                                            {hospital.id}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">※ 고유 ID는 변경할 수 없습니다.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">병원 이름 (Hospital Name)</label>
                                        <input
                                            type="text"
                                            placeholder={hospital.name}
                                            value={hospitalName}
                                            onChange={e => setHospitalName(e.target.value)}
                                            className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold transition-all">
                                        정보 수정 저장
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <p className="text-slate-500 mb-2">등록된 병원 정보가 없습니다.</p>
                                    <p className="text-xs text-slate-400">시스템 연결이 올바른지 확인해주세요. (시스템 연결 탭)</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- DEPARTMENT TAB --- */}
                    {activeTab === 'DEPT' && (
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-4">신규 진료과 등록</h3>
                                <form onSubmit={handleCreateDept} className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="진료과 명 (예: 신경외과)"
                                        value={deptName}
                                        onChange={e => setDeptName(e.target.value)}
                                        className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">등록하기</button>
                                </form>
                            </div>
                            <div className="border-l pl-8">
                                <h3 className="font-bold text-lg mb-4 text-slate-500">등록된 진료과 목록</h3>
                                <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {departments?.map((d: any) => (
                                        <li key={d.id} className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="font-bold text-slate-700">{d.name}</span>
                                            <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border">{d.doctors?.length || 0}명의 의료진</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* --- DOCTOR TAB --- */}
                    {activeTab === 'DOCTOR' && (
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-4">신규 의료진 등록</h3>
                                <form onSubmit={handleCreateDoctor} className="space-y-4">
                                    <select
                                        className="w-full border p-3 rounded-lg outline-none"
                                        value={selectedDeptId}
                                        onChange={e => setSelectedDeptId(e.target.value)}
                                    >
                                        <option value="">소속 진료과 선택</option>
                                        {departments?.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="의사명 (예: 김닥터)"
                                        value={docName}
                                        onChange={e => setDocName(e.target.value)}
                                        className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">등록하기</button>
                                </form>
                            </div>
                            <div className="border-l pl-8">
                                <h3 className="font-bold text-lg mb-4 text-slate-500">등록된 의료진 목록</h3>
                                <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {doctors?.map((d: any) => (
                                        <li key={d.id} className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">{d.name[0]}</div>
                                                <span className="font-bold text-slate-700">{d.name}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 flex items-center">
                                                ID: {d.id.slice(0, 8)}...
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* --- SURGERY TYPE TAB --- */}
                    {activeTab === 'SURGERY' && (
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-4">신규 수술/시술 항목 등록</h3>
                                <form onSubmit={handleCreateSurgeryType} className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="고유 ID (영어, 예: knee_replace)"
                                        value={surgeryForm.id}
                                        onChange={e => setSurgeryForm({ ...surgeryForm, id: e.target.value })}
                                        className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="수술명 (예: 무릎 연골 수술)"
                                        value={surgeryForm.name}
                                        onChange={e => setSurgeryForm({ ...surgeryForm, name: e.target.value })}
                                        className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <div className="flex gap-4">
                                        <select
                                            value={surgeryForm.type}
                                            onChange={e => setSurgeryForm({ ...surgeryForm, type: e.target.value as any })}
                                            className="flex-1 border p-3 rounded-lg"
                                        >
                                            <option value="SURGERY">수술 (Surgery)</option>
                                            <option value="PROCEDURE">시술 (Procedure)</option>
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="기본 입원 일수"
                                            value={surgeryForm.defaultStayDays}
                                            onChange={e => setSurgeryForm({ ...surgeryForm, defaultStayDays: parseInt(e.target.value) })}
                                            className="w-24 border p-3 rounded-lg text-center"
                                        />
                                        <span className="self-center text-sm font-bold text-slate-500">일 입원</span>
                                    </div>
                                    <div className="flex gap-6 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={surgeryForm.isAdmissionRequired}
                                                onChange={e => setSurgeryForm({ ...surgeryForm, isAdmissionRequired: e.target.checked })}
                                                className="w-5 h-5 accent-indigo-600"
                                            />
                                            <span className="text-sm font-bold text-slate-700">입원 필수</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={surgeryForm.isPreOpExamRequired}
                                                onChange={e => setSurgeryForm({ ...surgeryForm, isPreOpExamRequired: e.target.checked })}
                                                className="w-5 h-5 accent-indigo-600"
                                            />
                                            <span className="text-sm font-bold text-slate-700">수술 전 검사 필수</span>
                                        </label>
                                    </div>
                                    <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold mt-4">항목 등록하기</button>
                                </form>
                            </div>
                            <div className="border-l pl-8">
                                <h3 className="font-bold text-lg mb-4 text-slate-500">등록된 수술/시술 목록</h3>
                                <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                    {surgeryTypes?.map((t: any) => (
                                        <li key={t.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-slate-800">{t.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.id}</div>
                                                </div>
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold ${t.type === 'SURGERY' ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-600'}`}>
                                                    {t.type}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex gap-2 text-[10px] text-slate-500">
                                                {t.isAdmissionRequired && <span className="bg-slate-100 px-1.5 py-0.5 rounded">🛏️ {t.defaultStayDays}일 입원</span>}
                                                {t.isPreOpExamRequired && <span className="bg-slate-100 px-1.5 py-0.5 rounded">💉 검사필요</span>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* --- SYSTEM CONNECTION TAB --- */}
                    {activeTab === 'SYSTEM' && (
                        <div className="max-w-xl mx-auto space-y-8">

                            {/* 0. Patient App QR Code (New) */}
                            {hospital && (
                                <div>
                                    <h3 className="font-bold text-lg mb-2 text-teal-600">📱 환자용 앱 접속 QR</h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        환자가 이 QR 코드를 스캔하면, <strong>{hospital.name}</strong> 전용 접수/예약 페이지로 즉시 연결됩니다.<br />
                                        원무과나 대기실에 비치하여 사용하세요.
                                    </p>

                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-teal-100 flex flex-col items-center text-center">
                                        <div className="bg-white p-2 rounded-lg border-2 border-slate-900 mb-4">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://hospital-patient-web.vercel.app/?hospitalId=${hospital.id}`)}`}
                                                alt="Patient App QR"
                                                className="w-48 h-48"
                                            />
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-lg mb-1">{hospital.name}</h4>
                                        <p className="text-xs text-slate-400 font-mono mb-4">{hospital.id}</p>

                                        <div className="text-xs bg-slate-100 p-3 rounded text-slate-500 w-full break-all">
                                            URL: https://hospital-patient-web.vercel.app/?hospitalId={hospital.id}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 1. Connection Settings */}
                            <div>
                                <h3 className="font-bold text-lg mb-2">🔌 백엔드 서버 연결 설정</h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    어드민 웹이 통신할 백엔드 API 서버 주소를 설정합니다.<br />
                                    통계 데이터가 보이지 않거나 연결 오류 발생 시 이 주소를 확인하세요.
                                </p>

                                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-700">
                                    <form onSubmit={handleUpdateApiUrl} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Backend API Endpoint</label>
                                            <input
                                                type="text"
                                                placeholder="https://your-backend.up.railway.app"
                                                value={apiUrl}
                                                onChange={e => setApiUrl(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-600 p-4 rounded-lg outline-none focus:border-indigo-500 text-sm font-mono text-emerald-400"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-2">
                                                * 주의: 'https://' 로 시작해야 하며, 끝에 '/'가 없어야 합니다.<br />
                                                * 설정 저장 시 브라우저 로컬 저장소(Local Storage)에 영구 저장됩니다.
                                            </p>
                                        </div>
                                        <div className="pt-2">
                                            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                                                <span>💾</span> 설정 저장 및 새로고침
                                            </button>
                                        </div>
                                    </form>

                                    <div className="mt-8 pt-6 border-t border-slate-700">
                                        <h4 className="font-bold text-sm mb-2 text-slate-300">Default URL (Fallback)</h4>
                                        <div className="bg-black/30 p-3 rounded font-mono text-xs text-slate-500 break-all">
                                            https://hospital-all-in-one-production.up.railway.app
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Super Admin Controls */}
                            {hospital && (
                                <div className="border-t pt-8">
                                    <h3 className="font-bold text-lg mb-2 text-rose-600">🛡️ Super Admin Controls</h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        병원 서비스 상태를 강제로 변경할 수 있습니다. 이 작업은 즉시 반영됩니다.
                                    </p>

                                    <div className="bg-rose-50 p-6 rounded-xl border border-rose-100">
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="font-bold text-slate-700">현재 서비스 상태</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${hospital.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' :
                                                hospital.status === 'SUSPENDED' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                    'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                {hospital.status || 'ACTIVE'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('병원을 정상 운영 상태로 변경하시겠습니까?')) return;
                                                    await updateHospitalStatus(hospital.id, 'ACTIVE');
                                                    mutateHospital();
                                                    alert('상태가 변경되었습니다.');
                                                }}
                                                className="py-3 px-4 bg-white border border-slate-200 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700 font-bold text-sm transition-all"
                                            >
                                                ✅ 정상 운영 (Active)
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('병원 서비스를 일시 중지하시겠습니까? 환자 앱 접속이 제한될 수 있습니다.')) return;
                                                    await updateHospitalStatus(hospital.id, 'SUSPENDED');
                                                    mutateHospital();
                                                    alert('상태가 변경되었습니다.');
                                                }}
                                                className="py-3 px-4 bg-white border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 font-bold text-sm transition-all"
                                            >
                                                ⏸️ 임시 중지 (Suspend)
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('정말 폐쇄 처리하시겠습니까? 이 작업은 되돌릴 수 없을 수도 있습니다.')) return;
                                                    await updateHospitalStatus(hospital.id, 'CLOSED');
                                                    mutateHospital();
                                                    alert('상태가 변경되었습니다.');
                                                }}
                                                className="py-3 px-4 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-bold text-sm transition-all"
                                            >
                                                ⛔️ 폐쇄 (Close)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
