import { useState, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { getSlots, bookSlot, getDepartment } from '../../services/store';
import type { Slot } from '../../types';
import Header from '../../components/Header';
import { Users, Clock, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export default function Booking() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [isBooked, setIsBooked] = useState(false);
    const department = getDepartment();

    // Load slots when date changes
    useEffect(() => {
        // Simpler: reload all slots from store and filter here.
        const allSlots = getSlots(format(selectedDate, 'yyyy-MM-dd'));
        setSlots(allSlots);
    }, [selectedDate, isBooked]);

    const handleBook = () => {
        if (!selectedSlot) return;
        const success = bookSlot(selectedSlot.id, "Guest Patient");
        if (success) {
            setIsBooked(true);
            setTimeout(() => {
                setIsBooked(false);
                setSelectedSlot(null);
            }, 3000);
        } else {
            alert('Booking failed. Slot might be full.');
        }
    };

    const dates = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header title={`${department.name} Reservation`} />

            {/* Date Selector */}
            <div className="bg-white p-4 shadow-sm sticky top-14 z-10 overflow-x-auto whitespace-nowrap">
                <div className="flex gap-3">
                    {dates.map((date) => {
                        const isSelected = isSameDay(date, selectedDate);
                        return (
                            <button
                                key={date.toString()}
                                onClick={() => setSelectedDate(date)}
                                className={clsx(
                                    "flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl transition-all border",
                                    isSelected
                                        ? "bg-teal-600 text-white border-teal-600 shadow-md"
                                        : "bg-white text-gray-500 border-gray-100"
                                )}
                                style={{
                                    backgroundColor: isSelected ? 'var(--color-primary)' : 'white',
                                    color: isSelected ? 'white' : 'var(--color-text-muted)',
                                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                                }}
                            >
                                <span className="text-xs font-medium">{format(date, 'EEE')}</span>
                                <span className="text-lg font-bold">{format(date, 'd')}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="container p-4">
                {/* Morning / Afternoon Sections could be nice, but flat list for now */}
                <h2 className="font-bold mb-4 text-muted flex items-center gap-2">
                    <Clock size={16} /> Available Slots (10 mins)
                </h2>

                {slots.length === 0 ? (
                    <div className="text-center p-10 text-muted">No slots available for this day.</div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {slots.map((slot) => {
                            const isFull = slot.bookedCount >= slot.capacity;
                            const isSelected = selectedSlot?.id === slot.id;

                            return (
                                <button
                                    key={slot.id}
                                    disabled={isFull}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={clsx(
                                        "p-3 rounded-xl border text-center transition-all relative overflow-hidden",
                                        isSelected ? "ring-2 ring-teal-500 border-teal-500" : "border-gray-200 bg-white",
                                        isFull && "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                                    )}
                                    style={{
                                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                                        backgroundColor: isFull ? '#f1f5f9' : 'white'
                                    }}
                                >
                                    <div className="font-bold text-lg mb-1">
                                        {format(new Date(slot.startTime), 'HH:mm')}
                                    </div>
                                    <div className="text-xs flex items-center justify-center gap-1 text-muted">
                                        <Users size={12} />
                                        {slot.bookedCount}/{slot.capacity}
                                    </div>
                                    {isFull && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 font-bold text-xs transform -rotate-12 text-gray-500 border-2 border-gray-300 m-2 rounded">
                                            FULL
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sticky Bottom Action Bar */}
            {selectedSlot && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 border-t border-gray-100">
                    <div className="container flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted">Selected Time</p>
                            <p className="font-bold text-xl text-teal-700" style={{ color: 'var(--color-primary)' }}>
                                {format(new Date(selectedSlot.startTime), 'HH:mm')}
                            </p>
                        </div>
                        <button
                            onClick={handleBook}
                            className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}

            {/* Success Modal Overlay */}
            {isBooked && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full animate-bounce-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#dcfce7', color: 'var(--color-success)' }}>
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                        <p className="text-muted mb-6">Your appointment has been successfully scheduled.</p>
                        <button
                            onClick={() => setIsBooked(false)}
                            className="w-full py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
