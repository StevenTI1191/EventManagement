import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function JadwalAcara({ events }) {
    const { auth } = usePage().props;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedEvent, setSelectedEvent] = useState(null);

    const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const dayNames = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    const firstDay = new Date(y, m, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const today = new Date();
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

    const filtered = events.filter(e => activeFilter === 'all' || e.status === activeFilter);

    const getChipClass = (status) => {
        if (status === 'Done') return 'bg-green-100 text-green-800';
        if (status === 'Active') return 'bg-blue-100 text-blue-800';
        if (status === 'Cancelled') return 'bg-red-100 text-red-800';
        return 'bg-yellow-100 text-yellow-800';
    };

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
        let day, mo, yr, isOther = false;
        const dow = i % 7;
        if (i < startDow) {
            day = daysInPrev - startDow + i + 1; mo = m - 1; yr = y; isOther = true;
        } else if (i >= startDow + daysInMonth) {
            day = i - startDow - daysInMonth + 1; mo = m + 1; yr = y; isOther = true;
        } else {
            day = i - startDow + 1; mo = m; yr = y;
        }

        const cellDate = new Date(yr, mo, day);
        const dateStr = cellDate.toISOString().slice(0, 10);
        const isToday = !isOther && day === today.getDate() && m === today.getMonth() && y === today.getFullYear();
        const isWeekend = dow === 5 || dow === 6;
        const dayEvents = filtered.filter(e => e.start === dateStr);
        const cellMonthName = monthNames[((mo % 12) + 12) % 12];
        const cellYear = yr;

        cells.push({ day, mo, yr, isOther, isToday, isWeekend, dayEvents, dateStr, cellMonthName, cellYear });
    }

    const prevMonth = () => setCurrentDate(new Date(y, m - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(y, m + 1, 1));
    const goToday = () => setCurrentDate(new Date());

    return (
        <EventMarketingLayout>
            <Head title="Jadwal Acara" />
            <div>
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Jadwal Acara</h1>
                    <p className="mt-1 text-gray-500">Selamat datang, {auth.user.nama_pegawai}!</p>
                </div>

                {/* Nav */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={prevMonth} className="flex items-center justify-center w-8 h-8 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">&#8249;</button>
                        <span className="text-lg font-semibold text-center text-gray-800 w-44">{monthNames[m]} {y}</span>
                        <button onClick={nextMonth} className="flex items-center justify-center w-8 h-8 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">&#8250;</button>
                    </div>
                    <button onClick={goToday} className="text-sm px-4 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Hari ini</button>
                </div>

                {/* Filter */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {['all', 'Done', 'Active', 'Pending', 'Cancelled'].map(f => (
                        <button key={f} onClick={() => setActiveFilter(f)}
                            className={`px-4 py-1 rounded-full text-xs font-medium border transition-all ${activeFilter === f ? 'bg-[#FF2D55] text-white border-[#FF2D55]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                            {f === 'all' ? 'Semua' : f}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="overflow-hidden bg-white border border-gray-100 rounded-2xl">
                    <div className="grid grid-cols-7 border-b border-gray-100">
                        {dayNames.map((d, i) => (
                            <div key={d} className={`py-3 text-center text-xs font-semibold ${i >= 5 ? 'text-[#FF2D55]' : 'text-gray-500'}`}>{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {cells.map((cell, i) => (
                            <div key={i} className={`relative min-h-[110px] p-2 border-b border-r border-gray-50 hover:bg-gray-50 transition-colors
                                ${i % 7 === 6 ? 'border-r-0' : ''}
                                ${cell.isToday ? 'bg-red-50/40' : ''}`}>

                                <span className="absolute text-xs font-bold leading-tight text-right pointer-events-none select-none bottom-2 right-2" style={{ color: '#9ca3af' }}>
                                    {cell.cellMonthName.slice(0, 3)}<br />{cell.cellYear}
                                </span>

                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mb-1
                                    ${cell.isToday ? 'bg-[#FF2D55] text-white' :
                                      cell.isOther ? 'text-gray-300' :
                                      cell.isWeekend ? 'text-[#FF2D55]' : 'text-gray-500'}`}>
                                    {cell.day}
                                </span>

                                {cell.dayEvents.slice(0, 2).map(ev => (
                                    <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                                        className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer font-medium ${getChipClass(ev.status)}`}>
                                        {ev.time} {ev.title}
                                    </div>
                                ))}
                                {cell.dayEvents.length > 2 && (
                                    <div className="text-[10px] text-gray-400 pl-1">+{cell.dayEvents.length - 2} lainnya</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal */}
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedEvent(null)}>
                        <div className="p-6 bg-white shadow-xl rounded-2xl w-80" onClick={e => e.stopPropagation()}>
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="pr-4 text-base font-semibold text-gray-900">{selectedEvent.title}</h3>
                                <button onClick={() => setSelectedEvent(null)} className="text-xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
                            </div>
                            {[
                                ['Tanggal', selectedEvent.start],
                                ['Jam', selectedEvent.time],
                                ['Status', selectedEvent.status],
                            ].map(([label, val]) => (
                                <div key={label} className="flex gap-3 mb-2 text-sm">
                                    <span className="w-16 text-gray-400 shrink-0">{label}</span>
                                    <span className="text-gray-800">{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </EventMarketingLayout>
    );
}
