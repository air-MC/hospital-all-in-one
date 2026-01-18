
import Header from '../../components/Header';
import { ClipboardList, Coffee, Pill, Activity } from 'lucide-react';

export default function CareHome() {
    // Mock data
    const dMinus = 2; // D-2

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <Header title="My Care Plan" />

            <div className="bg-teal-600 text-white p-6 pb-12 rounded-b-[2rem] shadow-lg relative overflow-hidden" style={{ backgroundColor: 'var(--color-primary)' }}>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold opacity-90">Hi, Kanghyun</h2>
                    <p className="text-sm opacity-75 mb-4">Total knee replacement</p>

                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">D-{dMinus}</span>
                        <span className="text-sm opacity-80">until surgery</span>
                    </div>
                </div>
                {/* Decorative Circle */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            <div className="container p-4 -mt-8 relative z-20 space-y-4">
                {/* Today's Tasks */}
                <div className="card bg-white p-5 shadow-lg">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-teal-600" /> Today's Tasks
                    </h3>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <input type="checkbox" className="mt-1 w-5 h-5 accent-teal-600" />
                            <div>
                                <p className="font-medium">Antibiotic Sensitivity Test</p>
                                <p className="text-xs text-muted">14:00 @ 2F Lab</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <input type="checkbox" className="mt-1 w-5 h-5 accent-teal-600" />
                            <div>
                                <p className="font-medium">Evening Meditation</p>
                                <p className="text-xs text-muted">Before sleep</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="card p-4 flex flex-col items-center justify-center gap-3 aspect-square hover:bg-gray-50 transition-colors">
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-full">
                            <ClipboardList size={24} />
                        </div>
                        <span className="font-medium text-sm">Checklist</span>
                    </button>

                    <button className="card p-4 flex flex-col items-center justify-center gap-3 aspect-square hover:bg-gray-50 transition-colors">
                        <div className="p-3 bg-orange-50 text-orange-500 rounded-full">
                            <Coffee size={24} />
                        </div>
                        <span className="font-medium text-sm">Meals</span>
                    </button>

                    <button className="card p-4 flex flex-col items-center justify-center gap-3 aspect-square hover:bg-gray-50 transition-colors">
                        <div className="p-3 bg-red-50 text-red-500 rounded-full">
                            <Pill size={24} />
                        </div>
                        <span className="font-medium text-sm">Meds</span>
                    </button>

                    <button className="card p-4 flex flex-col items-center justify-center gap-3 aspect-square hover:bg-gray-50 transition-colors">
                        <div className="p-3 bg-purple-50 text-purple-500 rounded-full">
                            <Activity size={24} />
                        </div>
                        <span className="font-medium text-sm">Exams</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
