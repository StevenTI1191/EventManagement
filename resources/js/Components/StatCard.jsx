import React from 'react';

export default function StatCard({ title, value, icon, color = '#FF2D55', hint }) {
    return (
        <div className="flex flex-col gap-4 p-5 transition-all bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md group">
            {/* Baris atas: label kiri + ikon kecil kanan */}
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-tight text-gray-500 group-hover:text-[#FF2D55] transition-colors">
                    {title}
                </p>
                <div
                    className="flex items-center justify-center transition-colors shrink-0 w-9 h-9 rounded-xl group-hover:bg-[#FF2D55] group-hover:text-white"
                    style={{ backgroundColor: `${color}1A`, color }}
                >
                    {icon}
                </div>
            </div>

            {/* Angka besar — dipin ke bawah agar sejajar antar kartu */}
            <h2
                title={hint || undefined}
                className="mt-auto text-2xl font-extrabold leading-tight tracking-tight text-gray-900 whitespace-nowrap"
            >
                {value}
            </h2>
        </div>
    );
}
