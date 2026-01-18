
import Header from '../../components/Header';
import { getSlots } from '../../services/store';
import { format } from 'date-fns';

export default function AdminDashboard() {
    const slots = getSlots(format(new Date(), 'yyyy-MM-dd'));

    return (
        <div className="min-h-screen bg-slate-50">
            <Header title="Admin Dashboard" showBack={true} />

            <div className="container p-6">
                <h2 className="text-xl font-bold mb-4">Today's Overview</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card p-6 bg-white border-l-4 border-teal-500 shadow-sm">
                        <p className="text-sm text-muted mb-1">Total Reservations</p>
                        <p className="text-3xl font-bold text-gray-800">24</p>
                    </div>

                    <div className="card p-6 bg-white border-l-4 border-blue-500 shadow-sm">
                        <p className="text-sm text-muted mb-1">Surgery Consults</p>
                        <p className="text-3xl font-bold text-gray-800">5</p>
                    </div>

                    <div className="card p-6 bg-white border-l-4 border-orange-500 shadow-sm">
                        <p className="text-sm text-muted mb-1">Pending Confirmations</p>
                        <p className="text-3xl font-bold text-gray-800">2</p>
                    </div>
                </div>

                <h2 className="text-xl font-bold mb-4">Slot Management (Today)</h2>
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600">Time</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">Capacity</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {slots.map(slot => (
                                <tr key={slot.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono text-sm">{format(new Date(slot.startTime), 'HH:mm')}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${slot.bookedCount >= slot.capacity ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {slot.bookedCount >= slot.capacity ? 'FULL' : 'OPEN'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm">{slot.bookedCount} / {slot.capacity}</td>
                                    <td className="p-4">
                                        <button className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
