import ManajemenLayout from '@/Layouts/ManajemenLayout';
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

    const daysInMonth = new Date(y, m+1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const today = new Date();
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

    const filtered = events.filter(e => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'Meeting') return e.type === 'appointment';
        if (activeFilter === 'Upcoming') return e.type !== 'appointment' && (e.status === 'Upcoming' || e.status === 'Active');
        if (activeFilter === 'Done') return e.type !== 'appointment' && e.status === 'Done';
        return e.status === activeFilter;
    });

    const getChipClass = (ev) => {
        if (ev.type === 'appointment') return ev.status === 'Reschedule' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800';
        if (ev.status === 'Done') return 'bg-green-100 text-green-800';
        if (ev.status === 'Upcoming' || ev.status === 'Active') return 'bg-blue-100 text-blue-800';
        if (ev.status === 'Cancelled') return 'bg-red-100 text-red-800';
        return 'bg-yellow-100 text-yellow-800';
    };

    const fmtTime = (t) => (t ? String(t).slice(0, 5) : '');

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
        const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
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

    const isApt = selectedEvent?.type === 'appointment';

    return (
        <ManajemenLayout>
            <Head title="Kalender" />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Kalender</h1>
                    <p className="mt-1 text-gray-500">Selamat datang, {auth.user.nama_pegawai}!</p>
                </div>

                {/* Nav */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={prevMonth} className="flex items-center justify-center w-8 h-8 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">&#8249;</button>
                        <select value={m} onChange={e => setCurrentDate(new Date(y, Number(e.target.value), 1))}
                            className="px-3 py-1.5 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF2D55]/30">
                            {monthNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
                        </select>
                        <select value={y} onChange={e => setCurrentDate(new Date(Number(e.target.value), m, 1))}
                            className="px-3 py-1.5 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF2D55]/30">
                            {Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 3 + i).map(yr => <option key={yr} value={yr}>{yr}</option>)}
                        </select>
                        <button onClick={nextMonth} className="flex items-center justify-center w-8 h-8 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">&#8250;</button>
                    </div>
                    <button onClick={goToday} className="text-sm px-4 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Hari ini</button>
                </div>

                {/* Filter + legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {['all', 'Upcoming', 'Done', 'Meeting'].map(f => (
                            <button key={f} onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1 rounded-full text-xs font-medium border transition-all ${activeFilter === f ? 'bg-[#FF2D55] text-white border-[#FF2D55]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                {f === 'all' ? 'Semua' : f === 'Meeting' ? 'Appointment' : f}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200"></span> Event</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-200"></span> Appointment</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200"></span> Reschedule</span>
                    </div>
                </div>

                {/* Grid */}
                <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                    <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                        {dayNames.map((d, i) => (
                            <div key={d} className={`py-3 text-center text-xs font-semibold ${i >= 5 ? 'text-[#FF2D55]' : 'text-gray-500'}`}>{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {cells.map((cell, i) => (
                            <div key={i} className={`relative min-h-[110px] p-2 border-b border-r border-gray-200 transition-colors hover:bg-gray-50
                                ${i % 7 === 6 ? 'border-r-0' : ''}
                                ${cell.isOther ? 'bg-gray-100/70' : cell.isToday ? 'bg-[#FF2D55]/5' : cell.isWeekend ? 'bg-rose-50/70' : 'bg-white'}`}>

                                {/* Nomor tanggal */}
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mb-1
                                    ${cell.isToday ? 'bg-[#FF2D55] text-white' :
                                      cell.isOther ? 'text-gray-300' :
                                      cell.isWeekend ? 'text-[#FF2D55]' : 'text-gray-500'}`}>
                                    {cell.day}
                                </span>

                                {/* Event / appointment chips */}
                                {cell.dayEvents.slice(0, 2).map(ev => (
                                    <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                                        className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer font-medium ${getChipClass(ev)}`}>
                                        {ev.type === 'appointment' ? '🤝 ' : ''}{fmtTime(ev.time)} {ev.title}
                                    </div>
                                ))}
                                {cell.dayEvents.length > 2 && (
                                    <div className="text-[10px] text-gray-400 pl-1">+{cell.dayEvents.length - 2} lainnya</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal detail */}
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedEvent(null)}>
                        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
                            {/* Poster */}
                            <div className="relative h-40 bg-gradient-to-br from-[#FF2D55]/20 to-gray-200">
                                {selectedEvent.poster ? (
                                    <img src={`/${selectedEvent.poster}`} alt={selectedEvent.title} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full text-3xl font-black text-gray-300 select-none">
                                        {isApt ? '🤝' : selectedEvent.title?.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <button onClick={() => setSelectedEvent(null)}
                                    className="absolute flex items-center justify-center w-8 h-8 text-lg text-gray-600 bg-white rounded-full shadow top-3 right-3 hover:bg-gray-100">&times;</button>
                                <span className={`absolute bottom-3 left-3 px-2 py-0.5 text-[10px] font-bold rounded-full ${getChipClass(selectedEvent)}`}>
                                    {isApt ? `Appointment · ${selectedEvent.status}` : selectedEvent.status}
                                </span>
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-gray-900">{selectedEvent.title}</h3>
                                {!isApt && selectedEvent.kategori && (
                                    <span className="inline-block mt-1 mb-3 px-2 py-0.5 text-[10px] font-bold text-[#FF2D55] bg-[#FF2D55]/10 rounded-full">{selectedEvent.kategori}</span>
                                )}
                                <div className="mt-2 space-y-2">
                                    {(isApt ? [
                                        ['📅 Tanggal', selectedEvent.start],
                                        ['⏰ Jam', fmtTime(selectedEvent.time) || '-'],
                                        ['🏢 Client', selectedEvent.client || '-'],
                                        ['👤 PIC', selectedEvent.pic || '-'],
                                        ['👥 Jumlah Tamu', selectedEvent.jumlah_tamu ? selectedEvent.jumlah_tamu + ' orang' : '-'],
                                        ['🗒️ Deskripsi', selectedEvent.deskripsi || '-'],
                                    ] : [
                                        ['📅 Tanggal', selectedEvent.start],
                                        ['⏰ Jam', `${fmtTime(selectedEvent.time) || '-'}${selectedEvent.jam_selesai ? ' – ' + fmtTime(selectedEvent.jam_selesai) : ''}`],
                                        ['🏢 Client', selectedEvent.client || '-'],
                                        ['👤 PIC', selectedEvent.pic || '-'],
                                        ['📍 Area', selectedEvent.area || '-'],
                                        ['👥 Jumlah Pax', selectedEvent.jumlah_pax ? selectedEvent.jumlah_pax + ' orang' : '-'],
                                        ['💰 Deal Harga', selectedEvent.deal_harga ? 'Rp ' + new Intl.NumberFormat('id-ID').format(selectedEvent.deal_harga) : '-'],
                                    ]).map(([label, val]) => (
                                        <div key={label} className="flex gap-3 text-sm">
                                            <span className="text-gray-400 w-28 shrink-0">{label}</span>
                                            <span className="font-medium text-gray-800">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ManajemenLayout>
    );
}
