
import { useNavigate } from 'react-router-dom';
import { User, Shield, Activity } from 'lucide-react';

export default function Welcome() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-teal-50 to-blue-50" style={{ background: 'linear-gradient(135deg, var(--color-bg) 0%, #e0f2fe 100%)' }}>
            <div className="max-w-md w-full text-center space-y-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>Hospital Care</h1>
                    <p className="text-muted">Smart Admission & Outlook System</p>
                </div>

                <div className="grid gap-4">
                    <button
                        onClick={() => navigate('/patient/booking')}
                        className="card flex items-center p-6 hover:shadow-lg transition-all w-full text-left bg-white"
                    >
                        <div className="p-3 rounded-full bg-teal-100 mr-4" style={{ backgroundColor: '#ccfbf1', color: 'var(--color-primary)' }}>
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Patient</h3>
                            <p className="text-sm text-muted">Book appointments</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/patient/care')}
                        className="card flex items-center p-6 hover:shadow-lg transition-all w-full text-left bg-white"
                    >
                        <div className="p-3 rounded-full bg-orange-100 mr-4" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Surgery Care</h3>
                            <p className="text-sm text-muted">For Admitted Patients</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin')}
                        className="card flex items-center p-6 hover:shadow-lg transition-all w-full text-left bg-white"
                    >
                        <div className="p-3 rounded-full bg-blue-100 mr-4" style={{ backgroundColor: '#dbeafe', color: 'var(--color-secondary)' }}>
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Hospital Staff</h3>
                            <p className="text-sm text-muted">Manage Schedules & Patients</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
