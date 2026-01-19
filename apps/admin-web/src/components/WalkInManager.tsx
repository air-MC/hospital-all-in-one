import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { searchPatients, walkInRegistration } from '../hooks/useCareManager';
import { getDepartments, getDoctors } from '../hooks/useAdminSettings';
import { DateTime } from 'luxon';
import clsx from 'clsx';

export const WalkInManager = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: departments } = useSWR('departments', getDepartments);
    const { data: doctors } = useSWR('doctors', () => getDoctors());

    // Filter doctors by selected department
    const filteredDoctors = doctors?.filter((d: any) =>
        !selectedDeptId || d.departmentId === selectedDeptId
    );

    const handleSearch = async () => {
        if (!searchTerm) return;
        try {
            const results = await searchPatients(searchTerm);
            setSearchResults(results);
        } catch (e) {
            console.error('Search failed', e);
        }
    };

    const handleWalkIn = async () => {
        if (!selectedPatient || !selectedDeptId) {
            alert('환자와 진료과를 선택해주세요.');
            return;
        }

        if (!confirm(`${selectedPatient.name} 환자를 현장 접수하시겠습니까?\n\n가장 가까운 빈 슬롯에 자동 배정됩니다.`)) {
            return;
        }

        setIsProcessing(true);
        try {
            const result = await walkInRegistration(
                selectedPatient.id,
                selectedDeptId,
                selectedDoctorId || undefined
            );

            alert(`✅ 접수 완료!\n\n진료 시간: ${DateTime.fromISO(result.data.slot.startDateTime).toFormat('HH:mm')}\n진료과: ${result.data.slot.department.name}\n담당의: ${result.data.slot.doctor?.name || '미지정'}`);

            // Reset form
            setSelectedPatient(null);
            setSelectedDeptId('');
            setSelectedDoctorId('');
            setSearchTerm('');
            setSearchResults([]);

            mutate('appointments');
        } catch (e: any) {
            const errorMsg = e.response?.data?.message || e.message;
            alert(`❌ 접수 실패: ${errorMsg}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-teal-500 text-white p-2 rounded-lg">🚶</span>
                        현장 접수 (Walk-in)
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">예약 없이 방문한 환자를 즉시 접수합니다.</p>
                </div>

                <div className="p-8">
                    {/* Step 1: Patient Search */}
                    <div className="mb-8">
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            환자 검색
                        </h4>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="환자 이름 또는 연락처 입력"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <button
                                onClick={handleSearch}
                                className="px-6 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition"
                            >
                                🔍 검색
                            </button>
                        </div>

                        {searchResults.length > 0 && !selectedPatient && (
                            <div className="mt-4 grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                                {searchResults.map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedPatient(p)}
                                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition text-left"
                                    >
                                        <div className="font-bold text-slate-800">{p.name}</div>
                                        <div className="text-sm text-slate-500">{p.phone}</div>
                                        <div className="text-xs text-slate-400 mt-1">{p.patientNo}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedPatient && (
                            <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-teal-900">{selectedPatient.name}</div>
                                    <div className="text-sm text-teal-700">{selectedPatient.phone} • {selectedPatient.patientNo}</div>
                                </div>
                                <button
                                    onClick={() => setSelectedPatient(null)}
                                    className="text-xs px-3 py-1 bg-white border border-teal-300 rounded hover:bg-teal-100 transition"
                                >
                                    변경
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Department & Doctor Selection */}
                    {selectedPatient && (
                        <div className="mb-8">
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                진료과 및 담당의 선택
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">진료과 *</label>
                                    <select
                                        value={selectedDeptId}
                                        onChange={(e) => {
                                            setSelectedDeptId(e.target.value);
                                            setSelectedDoctorId(''); // Reset doctor when dept changes
                                        }}
                                        className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">진료과 선택</option>
                                        {departments?.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">담당의 (선택사항)</label>
                                    <select
                                        value={selectedDoctorId}
                                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                                        disabled={!selectedDeptId}
                                        className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                                    >
                                        <option value="">담당의 지정 안함 (자동 배정)</option>
                                        {filteredDoctors?.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {selectedPatient && selectedDeptId && (
                        <div className="border-t pt-6">
                            <button
                                onClick={handleWalkIn}
                                disabled={isProcessing}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all",
                                    isProcessing
                                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                        : "bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700"
                                )}
                            >
                                {isProcessing ? '⏳ 접수 처리 중...' : '✅ 현장 접수 완료하기'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
