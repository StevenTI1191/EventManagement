import React from 'react';

export default function StatCard({ title, value, icon, color = '#FF2D55' }) {
    return (
        <div className="flex items-start gap-4 p-6 transition-all bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md group">
            {/* BAGIAN IKON: Sekarang otomatis mengikuti variabel color (Merah #FF2D55) */}
            <div
                className="p-3 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[#FF2D55] group-hover:text-white"
                style={{
                    backgroundColor: `${color}1A`, // 1A = Opacity 10% agar background merah muda
                    color: color                   // Ikon jadi Merah Solid #FF2D55
                }}
            >
                {/* Slot untuk Ikon Lucide dari Dashboard.jsx */}
                {icon}
            </div>

            <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide group-hover:text-[#FF2D55] transition-colors">
                    {title}
                </p>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">
                    {value}
                </h2>
            </div>
        </div>
    );
}
