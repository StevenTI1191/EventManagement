import React from 'react';

export default function StatCard({ title, value, icon, color = '#FF2D55', hint }) {
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

            <div className="min-w-0 text-left">
                <p className="text-sm font-semibold leading-tight text-gray-500 group-hover:text-[#FF2D55] transition-colors min-h-[2.5rem]">
                    {title}
                </p>
                <h2 title={hint || undefined}
                    className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-left text-gray-900 whitespace-nowrap">
                    {value}
                </h2>
            </div>
        </div>
    );
}
