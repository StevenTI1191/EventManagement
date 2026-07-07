import React, { useState } from 'react';
import { Link } from '@inertiajs/react';

export default function PegawaiLayout({ user, header, children }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* --- SIDEBAR KIRI --- */}
            <aside className="flex-col flex-shrink-0 hidden w-64 bg-white border-r border-gray-200 md:flex">
                <div className="p-6">
                    <img src="/images/logo-laksamana.png" className="w-auto h-12" alt="Logo" />
                </div>

                <nav className="flex-1 px-4 mt-4 space-y-2">
                    {/* Menu Dashboard */}
                    <Link href={route('dashboard')} className="flex items-center px-4 py-3 font-medium text-red-500 bg-red-50 rounded-xl">
                        <span className="ms-3">Dashboard</span>
                    </Link>

                    {/* Menu Kalender */}
                    <Link href="#" className="flex items-center px-4 py-3 text-gray-600 transition hover:bg-gray-100 rounded-xl">
                        <span className="text-sm ms-3">Kalender</span>
                    </Link>

                    {/* Menu Event */}
                    <Link href="#" className="flex items-center px-4 py-3 text-gray-600 transition hover:bg-gray-100 rounded-xl">
                        <span className="text-sm ms-3">Event</span>
                    </Link>

                    {/* Menu Client/Mitra */}
                    <Link href={route('mitra.index')} className="flex items-center px-4 py-3 text-gray-600 transition hover:bg-gray-100 rounded-xl">
                        <span className="text-sm ms-3">Client</span>
                    </Link>

                    {/* Menu Transaksi */}
                    <Link href="#" className="flex items-center px-4 py-3 text-gray-600 transition hover:bg-gray-100 rounded-xl">
                        <span className="text-sm ms-3">Transaksi</span>
                    </Link>

                    {/* Menu Evaluasi Kinerja (Pegawai) */}
                    <Link href={route('pegawai.index')} className="flex items-center px-4 py-3 text-gray-600 transition hover:bg-gray-100 rounded-xl">
                        <span className="text-sm ms-3">Evaluasi Kinerja</span>
                    </Link>
                </nav>

                {/* Profil di Bawah Sidebar */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center p-2 bg-red-50 rounded-2xl">
                        <div className="flex items-center justify-center w-10 h-10 font-bold text-red-600 bg-red-200 rounded-full">
                            {user.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden ms-3">
                            <p className="text-sm font-bold text-gray-800 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- KONTEN UTAMA (KANAN) --- */}
            <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Header Atas */}
                <header className="px-8 py-4 bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        {header && <div>{header}</div>}
                    </div>
                </header>

                {/* Isi Halaman (Konten yang Berganti-ganti) */}
                <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
                    {children}
                </div>
            </main>
        </div>
    );
}
