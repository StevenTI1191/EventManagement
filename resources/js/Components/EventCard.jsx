import React from 'react';

export default function EventCard({ title, date, status, image }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex-shrink-0 w-20 h-24 overflow-hidden bg-gray-200 rounded-lg">
                <img src={image} alt={title} className="object-cover w-full h-full" />
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-bold leading-tight text-gray-900">{title}</h4>
                <p className="mt-1 text-xs text-gray-500">📅 {date}</p>
                <div className="flex gap-2 mt-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${status === 'Upcoming' ? 'bg-yellow-100 text-yellow-600' : 'bg-pink-100 text-pink-600'}`}>
                        {status}
                    </span>
                </div>
            </div>
        </div>
    );
}
